import httpStatus from "http-status";
import ProviderCredential from "../../models/providerCredential.model.js";
import ProjectProviderCredential from "../../models/projectProviderCredential.model.js";
import APIError from "../../utils/APIError.js";
import { decrypt } from "../../utils/encryption.js";
import { estimateCostUsd } from "../../utils/pricing.js";
import { incrementUsage } from "../middlewares/enforceLimits.js";
import { logRequest as logRequestRow } from "../utils/requestLogger.js";
import { PROVIDERS } from "../../providers/index.js";

const logRequest = ({ virtualKey, project, provider, model, usage, latencyMs, status, error }) =>
  logRequestRow({
    virtualKeyId: virtualKey.id,
    projectId: project?.id,
    provider,
    model,
    promptTokens: usage?.prompt_tokens,
    completionTokens: usage?.completion_tokens,
    cacheWriteTokens: usage?.cache_write_tokens,
    cacheReadTokens: usage?.cache_read_tokens,
    latencyMs,
    status,
    error,
  });

// Reads the SSE stream chunk-by-chunk, forwarding each raw chunk to `res` as it
// arrives while also scanning completed "data: {...}" events for the trailing
// usage payload (requested via stream_options.include_usage) so the request
// can still be logged/billed once the stream ends. The captured usage is
// still in whatever shape that provider's stream puts on the wire (OpenAI's
// raw shape passed through untouched, or the synthetic chunk built by the
// Anthropic/Gemini stream translators) — extractBillingUsage normalizes it
// into the four billing categories, same as the non-streaming path.
const relayStreamAndCaptureUsage = async (webStream, res, provider) => {
  const reader = webStream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let usage = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    res.write(value);
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop();
    for (const event of events) {
      const line = event.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        if (parsed.usage) usage = parsed.usage;
      } catch {
        // partial/malformed JSON in a chunk boundary — ignore
      }
    }
  }

  return usage ? PROVIDERS[provider].extractBillingUsage(usage) : null;
};

const callProvider = async (providerModel, project, body) => {
  const provider = providerModel.provider;

  const adapter = PROVIDERS[provider];
  if (!adapter) {
    throw new APIError({ message: `Unsupported provider "${provider}"`, status: httpStatus.BAD_GATEWAY });
  }

  // Credential is resolved dynamically as (project, provider) — not stored on
  // the model itself — so a project only needs one credential per provider
  // to reach every catalog model that provider offers.
  const projectCredential = await ProjectProviderCredential.findOne({
    where: { project_id: project.id, provider },
  });
  if (!projectCredential) {
    throw new APIError({
      message: `No credential configured for provider "${provider}" on this project`,
      status: httpStatus.INTERNAL_SERVER_ERROR,
    });
  }

  const credential = await ProviderCredential.findByPk(projectCredential.provider_credential_id);
  if (!credential) {
    throw new APIError({
      message: "Provider credential not found for this project",
      status: httpStatus.INTERNAL_SERVER_ERROR,
    });
  }
  const apiKey = decrypt(credential.encrypted_key);

  return adapter.createChatCompletion({ apiKey, model: providerModel.model_id, body });
};

export const handleChatCompletion = async ({ virtualKey, project, providerModel, body, res }) => {
  const startedAt = Date.now();
  const isStreaming = body.stream === true;

  const served = {
    provider: providerModel.provider,
    gatewayModel: providerModel.model_id,
    inputPricePerMillion: providerModel.input_price_per_million,
    outputPricePerMillion: providerModel.output_price_per_million,
    cacheWritePricePerMillion: providerModel.cache_write_price_per_million,
    cacheReadPricePerMillion: providerModel.cache_read_price_per_million,
  };
  const rates = {
    modelName: served.gatewayModel,
    inputPricePerMillion: served.inputPricePerMillion,
    outputPricePerMillion: served.outputPricePerMillion,
    cacheWritePricePerMillion: served.cacheWritePricePerMillion,
    cacheReadPricePerMillion: served.cacheReadPricePerMillion,
  };

  let result;
  try {
    result = await callProvider(providerModel, project, body);
  } catch (error) {
    await logRequest({
      virtualKey,
      project,
      provider: served.provider,
      model: served.gatewayModel,
      latencyMs: Date.now() - startedAt,
      status: error.status || httpStatus.INTERNAL_SERVER_ERROR,
      error: error.message,
    });
    throw error;
  }

  const baseLog = { virtualKey, project, provider: served.provider, model: served.gatewayModel };

  if (!isStreaming) {
    const { json, usage } = result;
    await incrementUsage({
      virtualKeyId: virtualKey.id,
      projectId: project?.id,
      costUsd: estimateCostUsd(rates, usage),
      usage,
    });
    await logRequest({
      ...baseLog,
      usage,
      latencyMs: Date.now() - startedAt,
      status: httpStatus.OK,
    });
    res.json(json);
    return;
  }

  // Streaming: the connection in `result` already succeeded, so from here on
  // a failure is a mid-stream problem — headers may already be on the wire,
  // and once headers are sent we can no longer hand the error back to the
  // controller (it would try to send a second response), so we log and
  // terminate the stream ourselves instead of rethrowing.
  let headersSent = false;
  try {
    const { stream } = result;

    res.status(httpStatus.OK);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    headersSent = true;

    const usage = await relayStreamAndCaptureUsage(stream, res, served.provider);
    res.end();

    await incrementUsage({
      virtualKeyId: virtualKey.id,
      projectId: project?.id,
      costUsd: estimateCostUsd(rates, usage),
      usage,
    });
    await logRequest({
      ...baseLog,
      usage,
      latencyMs: Date.now() - startedAt,
      status: httpStatus.OK,
    });
  } catch (error) {
    await logRequest({
      ...baseLog,
      latencyMs: Date.now() - startedAt,
      status: error.status || httpStatus.INTERNAL_SERVER_ERROR,
      error: error.message,
    });

    if (headersSent) {
      res.write(`data: ${JSON.stringify({ error: { message: error.message } })}\n\n`);
      res.end();
      return;
    }
    throw error;
  }
};
