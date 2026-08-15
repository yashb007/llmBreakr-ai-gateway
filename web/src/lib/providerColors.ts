const PROVIDER_COLORS: Record<string, string> = {
  openai: "var(--color-openai)",
  anthropic: "var(--color-anthropic)",
  gemini: "var(--color-gemini)",
};

export function providerColor(provider: string): string {
  return PROVIDER_COLORS[provider] ?? "var(--color-blue)";
}

export function providerBadge(provider: string): string {
  return provider.slice(0, 2).toUpperCase();
}
