import * as openaiProvider from "./openai.provider.js";
import * as anthropicProvider from "./anthropic.provider.js";
import * as geminiProvider from "./gemini.provider.js";

export const PROVIDERS = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
};
