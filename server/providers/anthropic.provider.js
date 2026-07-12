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

const toOpenAiResponse = (anthropicJson, model) => {
  const text = (anthropicJson.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  const usage = usageFromAnthropic(anthropicJson.usage);

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
      usage,
    },
    usage,
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
                prompt_tokens: inputTokens,
                completion_tokens: outputTokens,
                total_tokens: inputTokens + outputTokens,
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
          inputTokens = parsed.message?.usage?.input_tokens ?? 0;
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
