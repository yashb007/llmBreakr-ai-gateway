import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        panel: "var(--color-panel)",
        panel2: "var(--color-panel2)",
        raise: "var(--color-raise)",
        border: "var(--color-border)",
        border2: "var(--color-border2)",
        tx: "var(--color-tx)",
        txm: "var(--color-txm)",
        txd: "var(--color-txd)",
        accent: "var(--color-accent)",
        "accent-soft": "var(--color-accent-soft)",
        accent2: "var(--color-accent2)",
        amber: "var(--color-amber)",
        red: "var(--color-red)",
        blue: "var(--color-blue)",
        openai: "var(--color-openai)",
        anthropic: "var(--color-anthropic)",
        gemini: "var(--color-gemini)",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        panel: "13px",
      },
    },
  },
  plugins: [],
} satisfies Config;
