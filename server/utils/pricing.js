import ProviderModel from "../models/providerModel.model.js";

// USD per 1M tokens, sourced from provider_models.{input,output,cache_write,cache_read}_price_per_million
// — no provider exposes pricing via their models API, so this is
// admin-maintained per catalog model rather than something sync can populate.
// cache_write only applies to Anthropic (prompt cache creation) — OpenAI and
// Gemini cache reads are automatic with no separate write charge, so that
// rate/category is always $0 for them.
export const estimateCostUsd = (rates, usage) => {
  if (!rates || (rates.inputPricePerMillion == null && rates.outputPricePerMillion == null)) {
    if (rates?.modelName) console.warn(`No pricing set for model "${rates.modelName}"; treating cost as $0`);
    return 0;
  }
  const { prompt_tokens = 0, completion_tokens = 0, cache_write_tokens = 0, cache_read_tokens = 0 } = usage || {};
  return (
    (prompt_tokens / 1_000_000) * (rates.inputPricePerMillion ?? 0) +
    (completion_tokens / 1_000_000) * (rates.outputPricePerMillion ?? 0) +
    (cache_write_tokens / 1_000_000) * (rates.cacheWritePricePerMillion ?? 0) +
    (cache_read_tokens / 1_000_000) * (rates.cacheReadPricePerMillion ?? 0)
  );
};

// Builds a "provider:model_id" -> rates lookup for the whole catalog in one
// query. Used where cost is computed in bulk over already-logged requests
// (log.service.js, usage.service.js) — those only have the provider/model
// strings that were logged at request time, not a live provider_model
// association like chat.service.js has during dispatch. Keyed on the pair
// (not model_id alone) since the same raw model id can exist under two
// different providers.
export const pricingKey = (provider, modelId) => `${provider}:${modelId}`;

export const loadPricingByProviderModel = async () => {
  const models = await ProviderModel.findAll({
    attributes: [
      "provider",
      "model_id",
      "input_price_per_million",
      "output_price_per_million",
      "cache_write_price_per_million",
      "cache_read_price_per_million",
    ],
  });

  const map = new Map();
  for (const m of models) {
    map.set(pricingKey(m.provider, m.model_id), {
      modelName: m.model_id,
      inputPricePerMillion: m.input_price_per_million,
      outputPricePerMillion: m.output_price_per_million,
      cacheWritePricePerMillion: m.cache_write_price_per_million,
      cacheReadPricePerMillion: m.cache_read_price_per_million,
    });
  }
  return map;
};
