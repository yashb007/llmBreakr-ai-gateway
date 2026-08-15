import httpStatus from "http-status";
import APIError from "../utils/APIError.js";

const DEFAULT_API_BASE = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MAX_TOKENS = 4096;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const readErrorMessage = async (response) => {
  try {
    const data = await response.json();
    return data?.error?.message || response.statusText;
  } catch {
    return response.statusText;
  }
};

// Anthropic has no "system" role in `messages` — it's a separate top-level field.
const toAnthropicRequest = (messages = []) => {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n");
  const rest = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
  return { system: system || undefined, messages: rest };
};

const usageFromAnthropic = (u = {}) => ({
  prompt_tokens: u.input_tokens ?? 0,
  completion_tokens: u.output_tokens ?? 0,
  total_tokens: (u.input_tokens ?? 0) + (u.output_tokens ?? 0),
});

// Unlike OpenAI, Anthropic's cache fields are separate, mutually-exclusive
// pools from input_tokens (not a subset of it) — input_tokens is already the
// non-cached count. Reads Anthropic's own field names directly, since both
// the raw non-streaming response and the streaming translator below populate
// those same names on whatever usage object reaches here.
export const extractBillingUsage = (usage = {}) => ({
  prompt_tokens: usage.input_tokens ?? 0,
  completion_tokens: usage.output_tokens ?? 0,
  cache_write_tokens: usage.cache_creation_input_tokens ?? 0,
  cache_read_tokens: usage.cache_read_input_tokens ?? 0,
});

const toOpenAiResponse = (anthropicJson, model) => {
  const text = (anthropicJson.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  return {
    json: {
      id: anthropicJson.id,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: text },
          finish_reason: anthropicJson.stop_reason === "max_tokens" ? "length" : "stop",
        },
      ],
      // Client-facing usage stays the flat OpenAI-compatible shape,
      // unchanged — billing usage (with the cache breakdown) is computed
      // separately below, from the raw Anthropic usage object.
      usage: usageFromAnthropic(anthropicJson.usage),
    },
    usage: extractBillingUsage(anthropicJson.usage),
  };
};

const sseLine = (data) => encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

const openAiChunk = ({ id, model, delta, finishReason, usage }) => ({
  id,
  object: "chat.completion.chunk",
  created: Math.floor(Date.now() / 1000),
  model,
  choices: [{ index: 0, delta, finish_reason: finishReason ?? null }],
  ...(usage && { usage }),
});

// Re-emits Anthropic's SSE event stream (message_start/content_block_delta/message_delta/...)
// as OpenAI-style "chat.completion.chunk" events, ending with a usage-bearing final chunk +
// [DONE] so relayStreamAndCaptureUsage (chat.service.js) can bill/log it like any other provider.
const translateAnthropicStream = (upstream, { model }) => {
  const reader = upstream.getReader();
  const id = `chatcmpl-${crypto.randomUUID()}`;
  let buffer = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheCreationTokens = 0;
  let cacheReadTokens = 0;
  let sentRole = false;

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.enqueue(
          sseLine(
            openAiChunk({
              id,
              model,
              delta: {},
              finishReason: "stop",
              usage: {
                // Client-facing fields, unchanged from before cache tracking existed.
                prompt_tokens: inputTokens,
                completion_tokens: outputTokens,
                total_tokens: inputTokens + outputTokens,
                // Anthropic-native names, additive extras an OpenAI-compatible
                // client just ignores — this is what extractBillingUsage reads,
                // the same field names the non-streaming raw response uses.
                input_tokens: inputTokens,
                output_tokens: outputTokens,
                cache_creation_input_tokens: cacheCreationTokens,
                cache_read_input_tokens: cacheReadTokens,
              },
            })
          )
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop();

      for (const event of events) {
        const dataLine = event.split("\n").find((line) => line.startsWith("data:"));
        if (!dataLine) continue;

        let parsed;
        try {
          parsed = JSON.parse(dataLine.slice(5).trim());
        } catch {
          continue;
        }

        if (parsed.type === "message_start") {
          const u = parsed.message?.usage ?? {};
          inputTokens = u.input_tokens ?? 0;
          cacheCreationTokens = u.cache_creation_input_tokens ?? 0;
          cacheReadTokens = u.cache_read_input_tokens ?? 0;
        } else if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
          const delta = sentRole
            ? { content: parsed.delta.text }
            : { role: "assistant", content: parsed.delta.text };
          sentRole = true;
          controller.enqueue(sseLine(openAiChunk({ id, model, delta })));
        } else if (parsed.type === "message_delta") {
          outputTokens = parsed.usage?.output_tokens ?? outputTokens;
        } else if (parsed.type === "error") {
          controller.error(new APIError({ message: parsed.error?.message || "Anthropic stream error" }));
        }
      }
    },
  });
};

/**
 * Forwards a chat completion request to Anthropic's Messages API, translating the
 * OpenAI-shaped request/response (the gateway's public contract) to/from Anthropic's format.
 * @param {{ apiKey: string, model: string, body: object, apiBase?: string }} params
 * @returns {Promise<{ json: object, usage: object } | { stream: ReadableStream }>}
 */
export const createChatCompletion = async ({ apiKey, model, body, apiBase }) => {
  const stream = body.stream === true;
  const { system, messages } = toAnthropicRequest(body.messages);

  const payload = {
    model,
    messages,
    max_tokens: body.max_tokens ?? DEFAULT_MAX_TOKENS,
    stream,
    ...(system && { system }),
    ...(body.temperature !== undefined && { temperature: body.temperature }),
    ...(body.top_p !== undefined && { top_p: body.top_p }),
    ...(body.stop !== undefined && {
      stop_sequences: Array.isArray(body.stop) ? body.stop : [body.stop],
    }),
  };

  const url = `${(apiBase || DEFAULT_API_BASE).replace(/\/$/, "")}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new APIError({
      message: await readErrorMessage(response),
      status: response.status || httpStatus.BAD_GATEWAY,
    });
  }

  if (stream) {
    return { stream: translateAnthropicStream(response.body, { model }) };
  }

  const json = await response.json();
  return toOpenAiResponse(json, model);
};

/**
 * Lists every model id available to this API key, paging through the full catalog.
 * @param {{ apiKey: string, apiBase?: string }} params
 * @returns {Promise<string[]>}
 */
export const listModels = async ({ apiKey, apiBase }) => {
  const base = (apiBase || DEFAULT_API_BASE).replace(/\/$/, "");
  const ids = [];
  let afterId;

  for (;;) {
    const url = new URL(`${base}/models`);
    url.searchParams.set("limit", "1000");
    if (afterId) url.searchParams.set("after_id", afterId);

    const response = await fetch(url, {
      headers: { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION },
    });

    if (!response.ok) {
      throw new APIError({
        message: await readErrorMessage(response),
        status: response.status || httpStatus.BAD_GATEWAY,
      });
    }

    const json = await response.json();
    ids.push(...(json.data || []).map((model) => model.id));
    if (!json.has_more || !json.data?.length) break;
    afterId = json.last_id;
  }

  return ids;
};
