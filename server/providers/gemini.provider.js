import httpStatus from "http-status";
import APIError from "../utils/APIError.js";

const DEFAULT_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

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

// Gemini has no "system" role in `contents` — it's a separate top-level field, and
// assistant turns are role "model" rather than "assistant".
const toGeminiRequest = (messages = []) => {
  const systemParts = messages.filter((m) => m.role === "system").map((m) => ({ text: m.content }));
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  return { systemInstruction: systemParts.length ? { parts: systemParts } : undefined, contents };
};

const usageFromGemini = (u = {}) => ({
  prompt_tokens: u.promptTokenCount ?? 0,
  completion_tokens: u.candidatesTokenCount ?? 0,
  total_tokens: u.totalTokenCount ?? (u.promptTokenCount ?? 0) + (u.candidatesTokenCount ?? 0),
});

const toOpenAiResponse = (geminiJson, model) => {
  const candidate = geminiJson.candidates?.[0];
  const text = (candidate?.content?.parts || []).map((part) => part.text || "").join("");
  const usage = usageFromGemini(geminiJson.usageMetadata);

  return {
    json: {
      id: `chatcmpl-${crypto.randomUUID()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: text },
          finish_reason: candidate?.finishReason === "MAX_TOKENS" ? "length" : "stop",
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

// Re-emits Gemini's SSE stream (each event a partial GenerateContentResponse) as
// OpenAI-style "chat.completion.chunk" events, ending with a usage-bearing final chunk +
// [DONE] so relayStreamAndCaptureUsage (chat.service.js) can bill/log it like any other provider.
const translateGeminiStream = (upstream, { model }) => {
  const reader = upstream.getReader();
  const id = `chatcmpl-${crypto.randomUUID()}`;
  let buffer = "";
  let promptTokens = 0;
  let completionTokens = 0;
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
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens,
                total_tokens: promptTokens + completionTokens,
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

        const candidate = parsed.candidates?.[0];
        const text = (candidate?.content?.parts || []).map((part) => part.text || "").join("");
        if (text) {
          const delta = sentRole ? { content: text } : { role: "assistant", content: text };
          sentRole = true;
          controller.enqueue(sseLine(openAiChunk({ id, model, delta })));
        }
        if (parsed.usageMetadata) {
          promptTokens = parsed.usageMetadata.promptTokenCount ?? promptTokens;
          completionTokens = parsed.usageMetadata.candidatesTokenCount ?? completionTokens;
        }
      }
    },
  });
};

/**
 * Forwards a chat completion request to Google's Gemini API, translating the OpenAI-shaped
 * request/response (the gateway's public contract) to/from Gemini's format.
 * @param {{ apiKey: string, model: string, body: object, apiBase?: string }} params
 * @returns {Promise<{ json: object, usage: object } | { stream: ReadableStream }>}
 */
export const createChatCompletion = async ({ apiKey, model, body, apiBase }) => {
  const stream = body.stream === true;
  const { systemInstruction, contents } = toGeminiRequest(body.messages);

  const payload = {
    contents,
    ...(systemInstruction && { systemInstruction }),
    generationConfig: {
      ...(body.temperature !== undefined && { temperature: body.temperature }),
      ...(body.top_p !== undefined && { topP: body.top_p }),
      ...(body.max_tokens !== undefined && { maxOutputTokens: body.max_tokens }),
      ...(body.stop !== undefined && {
        stopSequences: Array.isArray(body.stop) ? body.stop : [body.stop],
      }),
    },
  };

  const base = (apiBase || DEFAULT_API_BASE).replace(/\/$/, "");
  const url = stream
    ? `${base}/models/${model}:streamGenerateContent?alt=sse`
    : `${base}/models/${model}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
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
    return { stream: translateGeminiStream(response.body, { model }) };
  }

  const json = await response.json();
  return toOpenAiResponse(json, model);
};
