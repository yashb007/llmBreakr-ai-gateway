import httpStatus from "http-status";
import APIError from "../../utils/APIError.js";
import { decrypt } from "../../utils/encryption.js";
import { estimateCostUsd } from "../../utils/pricing.js";
import { incrementUsage } from "../middlewares/enforceLimits.js";
import { logRequest as logRequestRow } from "../utils/requestLogger.js";
import { mark, logTimings } from "../utils/timing.js";
import { PROVIDERS } from "../../providers/index.js";

const logRequest = ({ virtualKey, project, provider, model, requestedModel, fallbackAttempt, usage, latencyMs, status, error }) =>
  logRequestRow({
    virtualKeyId: virtualKey.id,
    projectId: project?.id,
    provider,
    model,
    requestedModel,
    fallbackAttempt,
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

// Any 5xx is transient/provider-side — worth one retry on the SAME model
// before giving up on it. A range check, not a fixed set of codes: a
// provider can return a plain 500 just as easily as 502/503/504, and all of
// them mean the same thing here.
const isServerError = (status) => typeof status === "number" && status >= 500 && status < 600;
// Sustained failures a retry can't fix, but a DIFFERENT provider/model
// might: rate limited, or a credential problem specific to that one provider.
const FALLBACK_ELIGIBLE_EXTRA_STATUSES = new Set([httpStatus.TOO_MANY_REQUESTS, httpStatus.UNAUTHORIZED, httpStatus.FORBIDDEN]);
// A malformed request (400) is never retryable or fallback-eligible — it's
// the same broken request on every provider. No status at all (a thrown
// network-level error) is treated as retryable/fallback-eligible, same as a
// 5xx, since it's the same class of "couldn't reach the provider" failure.
const isRetryable = (error) => !error.status || isServerError(error.status);
const isFallbackEligible = (error) => !error.status || isServerError(error.status) || FALLBACK_ELIGIBLE_EXTRA_STATUSES.has(error.status);

// Tries the primary model, retrying it once on a transient failure, then
// walks the fallback chain (already sorted by priority in resolveModel.js)
// on any fallback-eligible failure — trying each candidate exactly once, no
// retries within the chain itself. Returns whichever model actually served
// the request. If every candidate is exhausted, throws the PRIMARY model's
// original error — not the last fallback's — since that's what the caller
// actually asked about.
const callWithFallback = async ({ providerModel, project, body, req, chain }) => {
  const candidates = [
    { providerModel, attempt: 0 },
    ...chain.map((link, i) => ({ providerModel: link.fallbackModel.providerModel, attempt: i + 1 })),
  ];

  let primaryError = null;

  for (const candidate of candidates) {
    const retriesAllowed = candidate.attempt === 0 ? 1 : 0;
    let lastError;

    for (let attempt = 0; attempt <= retriesAllowed; attempt++) {
      try {
        const result = await callProvider(candidate.providerModel, project, body, req);
        return { result, servedProviderModel: candidate.providerModel, fallbackAttempt: candidate.attempt };
      } catch (error) {
        lastError = error;
        if (candidate.attempt === 0) primaryError = error;
        if (attempt < retriesAllowed && isRetryable(error)) continue;
        break;
      }
    }

    if (!isFallbackEligible(lastError)) throw primaryError;
    // else: fall through to the next candidate in the chain
  }

  throw primaryError;
};

export const handleChatCompletion = async ({ virtualKey, project, providerModel, body, res, req }) => {
  const startedAt = Date.now();
  const isStreaming = body.stream === true;
  const requestedModelId = providerModel.model_id;

  let result, servedProviderModel, fallbackAttempt;
  try {
    ({ result, servedProviderModel, fallbackAttempt } = await callWithFallback({
      providerModel,
      project,
      body,
      req,
      chain: req?.fallbackChain || [],
    }));
  } catch (error) {
    // Don't make the client wait on a log write to receive an error they
    // already have — log it in the background and fail fast. Reported
    // against the PRIMARY model, since that's the one the caller asked for.
    logRequest({
      virtualKey,
      project,
      provider: providerModel.provider,
      model: requestedModelId,
      latencyMs: Date.now() - startedAt,
      status: error.status || httpStatus.INTERNAL_SERVER_ERROR,
      error: error.message,
    }).catch((logError) => console.error("error-path log write failed", logError));
    throw error;
  }

  const served = {
    provider: servedProviderModel.provider,
    gatewayModel: servedProviderModel.model_id,
    inputPricePerMillion: servedProviderModel.input_price_per_million,
    outputPricePerMillion: servedProviderModel.output_price_per_million,
    cacheWritePricePerMillion: servedProviderModel.cache_write_price_per_million,
    cacheReadPricePerMillion: servedProviderModel.cache_read_price_per_million,
  };
  const rates = {
    modelName: served.gatewayModel,
    inputPricePerMillion: served.inputPricePerMillion,
    outputPricePerMillion: served.outputPricePerMillion,
    cacheWritePricePerMillion: served.cacheWritePricePerMillion,
    cacheReadPricePerMillion: served.cacheReadPricePerMillion,
  };
  // Only meaningfully non-null when a fallback actually fired.
  const requestedModelForLog = fallbackAttempt > 0 ? requestedModelId : null;
  if (fallbackAttempt > 0) {
    res.setHeader("X-LLMBreakr-Served-Model", served.gatewayModel);
  }

  const baseLog = {
    virtualKey,
    project,
    provider: served.provider,
    model: served.gatewayModel,
    requestedModel: requestedModelForLog,
    fallbackAttempt,
  };

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
  // terminate the stream ourselves instead of rethrowing. Fallback never
  // applies past this point either, for the same reason — see
  // callWithFallback above, which only ever runs before this line.
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
