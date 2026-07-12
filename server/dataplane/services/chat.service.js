import httpStatus from "http-status";
import ProviderCredential from "../../models/providerCredential.model.js";
import RequestLog from "../../models/requestLog.model.js";
import APIError from "../../utils/APIError.js";
import { decrypt } from "../../utils/encryption.js";
import { estimateCostUsd } from "../../utils/pricing.js";
import { incrementBudget } from "../middlewares/enforceLimits.js";
import * as openaiProvider from "../../providers/openai.provider.js";
import * as anthropicProvider from "../../providers/anthropic.provider.js";
import * as geminiProvider from "../../providers/gemini.provider.js";

const PROVIDERS = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
};

const logRequest = ({ virtualKey, project, provider, model, promptTokens, completionTokens, latencyMs, status, error }) =>
  RequestLog.create({
    virtual_key_id: virtualKey.id,
    project_id: project?.id ?? null,
    provider,
    model,
    prompt_tokens: promptTokens ?? null,
    completion_tokens: completionTokens ?? null,
    latency_ms: latencyMs,
    status,
    error: error ?? null,
  });

// Reads the SSE stream chunk-by-chunk, forwarding each raw chunk to `res` as it
// arrives while also scanning completed "data: {...}" events for the trailing
// usage payload (requested via stream_options.include_usage) so the request
// can still be logged/billed once the stream ends.
const relayStreamAndCaptureUsage = async (webStream, res) => {
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

  return usage;
};

export const handleChatCompletion = async ({ virtualKey, project, proxyModel, body, res }) => {
  const {
    provider,
    model: providerModel,
    provider_credential_id: credentialId,
    api_base: apiBase,
  } = proxyModel.provider_params;
  const adapter = PROVIDERS[provider];
  if (!adapter) {
    throw new APIError({ message: `Unsupported provider "${provider}"`, status: httpStatus.BAD_GATEWAY });
  }

  const credential = await ProviderCredential.findByPk(credentialId);
  if (!credential) {
    throw new APIError({
      message: "Provider credential not found for this model",
      status: httpStatus.INTERNAL_SERVER_ERROR,
    });
  }
  const apiKey = decrypt(credential.encrypted_key);

  const startedAt = Date.now();
  const isStreaming = body.stream === true;
  const baseLog = { virtualKey, project, provider, model: proxyModel.model_name };

  if (!isStreaming) {
    try {
      const { json, usage } = await adapter.createChatCompletion({ apiKey, model: providerModel, body, apiBase });
      await incrementBudget(virtualKey.id, estimateCostUsd(providerModel, usage?.prompt_tokens, usage?.completion_tokens));
      await logRequest({
        ...baseLog,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        latencyMs: Date.now() - startedAt,
        status: httpStatus.OK,
      });
      res.json(json);
    } catch (error) {
      await logRequest({
        ...baseLog,
        latencyMs: Date.now() - startedAt,
        status: error.status || httpStatus.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
      throw error;
    }
    return;
  }

  // Streaming: once headers are sent we can no longer hand the error back to
  // the controller (it would try to send a second response), so from that
  // point on we log and terminate the stream ourselves instead of rethrowing.
  let headersSent = false;
  try {
    const { stream } = await adapter.createChatCompletion({ apiKey, model: providerModel, body, apiBase });

    res.status(httpStatus.OK);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    headersSent = true;

    const usage = await relayStreamAndCaptureUsage(stream, res);
    res.end();

    await incrementBudget(virtualKey.id, estimateCostUsd(providerModel, usage?.prompt_tokens, usage?.completion_tokens));
    await logRequest({
      ...baseLog,
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
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
