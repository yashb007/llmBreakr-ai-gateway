import RequestLog from "../../models/requestLog.model.js";

// Shared by chat.service.js (successful/failed provider calls) and the
// virtualKeyAuth/resolveModel/enforceLimits middlewares (rejections before a
// provider call is ever made) so every data-plane request produces exactly
// one row, regardless of which stage it was stopped at.
export const logRequest = ({
  virtualKeyId,
  projectId,
  provider,
  model,
  requestedModel,
  fallbackAttempt,
  promptTokens,
  completionTokens,
  cacheWriteTokens,
  cacheReadTokens,
  latencyMs,
  status,
  blockedBy,
  error,
}) =>
  RequestLog.create({
    virtual_key_id: virtualKeyId ?? null,
    project_id: projectId ?? null,
    provider: provider ?? null,
    model: model ?? null,
    // Only meaningfully set when a fallback fired and this differs from
    // `model` above — see dataplane/services/chat.service.js's fallback walk.
    requested_model: requestedModel ?? null,
    fallback_attempt: fallbackAttempt ?? null,
    prompt_tokens: promptTokens ?? null,
    completion_tokens: completionTokens ?? null,
    cache_write_tokens: cacheWriteTokens ?? null,
    cache_read_tokens: cacheReadTokens ?? null,
    latency_ms: latencyMs ?? null,
    status,
    blocked_by: blockedBy ?? null,
    error: error ?? null,
  });
