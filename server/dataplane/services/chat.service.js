import httpStatus from "http-status";
import APIError from "../../utils/APIError.js";
import { decrypt } from "../../utils/encryption.js";
import { estimateCostUsd } from "../../utils/pricing.js";
import { incrementUsage } from "../middlewares/enforceLimits.js";
import { logRequest as logRequestRow } from "../utils/requestLogger.js";
import { mark, logTimings } from "../utils/timing.js";
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

const callProvider = async (providerModel, project, body, req) => {
  const provider = providerModel.provider;

  const adapter = PROVIDERS[provider];
  if (!adapter) {
    throw new APIError({ message: `Unsupported provider "${provider}"`, status: httpStatus.BAD_GATEWAY });
  }

  // Credential is resolved dynamically as (project, provider) — not stored on
  // the model itself — so a project only needs one credential per provider
  // to reach every catalog model that provider offers. No query here — the
  // caller (virtualKeyAuth's consolidated lookup, or admin testVirtualKey's
  // matching fetch) already attached every credential this project has.
  const credentials = project?.ProjectProviderCredentials || [];
  const projectCredential = credentials.find((c) => c.provider === provider);
  if (!projectCredential?.credential) {
    throw new APIError({
      message: `No credential configured for provider "${provider}" on this project`,
      status: httpStatus.INTERNAL_SERVER_ERROR,
    });
  }
  const apiKey = decrypt(projectCredential.credential.encrypted_key);
  mark(req, "credentialLookup");

  const result = await adapter.createChatCompletion({ apiKey, model: providerModel.model_id, body });
  mark(req, "llmProviderCall");
  return result;
};

export const handleChatCompletion = async ({ virtualKey, project, providerModel, body, res, req }) => {
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
    result = await callProvider(providerModel, project, body, req);
  } catch (error) {
    // Don't make the client wait on a log write to receive an error they
    // already have — log it in the background and fail fast.
    logRequest({
      virtualKey,
      project,
      provider: served.provider,
      model: served.gatewayModel,
      latencyMs: Date.now() - startedAt,
      status: error.status || httpStatus.INTERNAL_SERVER_ERROR,
      error: error.message,
    }).catch((logError) => console.error("error-path log write failed", logError));
    throw error;
  }

  const baseLog = { virtualKey, project, provider: served.provider, model: served.gatewayModel };

  if (!isStreaming) {
    const { json, usage } = result;

    // The LLM has already answered by this point — incrementUsage/logRequest
    // are pure bookkeeping the client doesn't need to wait on. Fire them
    // after the response instead of before it. Trade-off: if the process
    // crashes in the (usually sub-second) window before these resolve, this
    // one request's usage counters/log row are lost — consistent with the
    // "best-effort" tolerance enforceLimits.js already documents for rate
    // limiting. This also means a Redis/MySQL hiccup here can no longer
    // fail the client's request after the LLM already answered it.
    res.json(json);

    incrementUsage({
      virtualKeyId: virtualKey.id,
      projectId: project?.id,
      costUsd: estimateCostUsd(rates, usage),
      usage,
    })
      .then(() =>
        logRequest({
          ...baseLog,
          usage,
          latencyMs: Date.now() - startedAt,
          status: httpStatus.OK,
        })
      )
      .then(() => {
        mark(req, "incrementUsageAndLog");
        logTimings(req);
      })
      .catch((error) => console.error("post-response usage/log bookkeeping failed", error));

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
    mark(req, "streamRelay");

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
    mark(req, "incrementUsageAndLog");
    logTimings(req);
  } catch (error) {
    logRequest({
      ...baseLog,
      latencyMs: Date.now() - startedAt,
      status: error.status || httpStatus.INTERNAL_SERVER_ERROR,
      error: error.message,
    }).catch((logError) => console.error("error-path log write failed", logError));

    if (headersSent) {
      res.write(`data: ${JSON.stringify({ error: { message: error.message } })}\n\n`);
      res.end();
      return;
    }
    throw error;
  }
};
