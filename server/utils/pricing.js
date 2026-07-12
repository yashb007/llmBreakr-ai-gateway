// USD per 1K tokens. Manually maintained — update when a provider changes pricing.
const PRICING = {
  "gpt-4o": { prompt: 0.005, completion: 0.015 },
  "gpt-4o-mini": { prompt: 0.00015, completion: 0.0006 },
  "gpt-4-turbo": { prompt: 0.01, completion: 0.03 },
  "gpt-3.5-turbo": { prompt: 0.0005, completion: 0.0015 },
  "claude-opus-4-5": { prompt: 0.015, completion: 0.075 },
  "claude-sonnet-4-5": { prompt: 0.003, completion: 0.015 },
  "claude-haiku-4-5": { prompt: 0.001, completion: 0.005 },
  "gemini-2.5-pro": { prompt: 0.00125, completion: 0.005 },
  "gemini-2.5-flash": { prompt: 0.0003, completion: 0.0025 },
  "gemini-2.5-flash-lite": { prompt: 0.0001, completion: 0.0004 },
};

export const estimateCostUsd = (model, promptTokens = 0, completionTokens = 0) => {
  const rates = PRICING[model];
  if (!rates) {
    console.warn(`No pricing entry for model "${model}"; treating cost as $0`);
    return 0;
  }
  return (promptTokens / 1000) * rates.prompt + (completionTokens / 1000) * rates.completion;
};
