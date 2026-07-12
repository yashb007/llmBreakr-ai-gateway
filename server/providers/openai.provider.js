import httpStatus from "http-status";
import APIError from "../utils/APIError.js";

const DEFAULT_API_BASE = "https://api.openai.com/v1";

const readErrorMessage = async (response) => {
  try {
    const data = await response.json();
    return data?.error?.message || response.statusText;
  } catch {
    return response.statusText;
  }
};

/**
 * Forwards a chat completion request to OpenAI (or an OpenAI-compatible endpoint).
 * @param {{ apiKey: string, model: string, body: object, apiBase?: string }} params - body is the client's request body (already validated upstream); apiBase defaults to https://api.openai.com/v1
 * @returns {Promise<{ json: object, usage: object } | { stream: ReadableStream }>} non-streaming resolves with the parsed response; streaming resolves with the raw response body stream
 */
export const createChatCompletion = async ({ apiKey, model, body, apiBase }) => {
  const stream = body.stream === true;
  const payload = {
    ...body,
    model,
    // Ensures the final SSE chunk carries token usage so the gateway can log/bill it.
    ...(stream && { stream_options: { ...body.stream_options, include_usage: true } }),
  };

  const url = `${(apiBase || DEFAULT_API_BASE).replace(/\/$/, "")}/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
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
    return { stream: response.body };
  }

  const json = await response.json();
  return { json, usage: json.usage };
};
