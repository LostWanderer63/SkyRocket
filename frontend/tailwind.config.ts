import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme tokens read CSS variables (RGB channels) so a single `.dark`
        // class on <html> swaps the whole palette — no per-component edits.
        bg: "rgb(var(--c-bg) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        ink: { DEFAULT: "rgb(var(--c-ink) / <alpha-value>)", soft: "rgb(var(--c-ink-soft) / <alpha-value>)" },
        line: "rgb(var(--c-line) / <alpha-value>)",
        brand: { DEFAULT: "#1f6feb", dark: "#1657c2", tint: "rgb(var(--c-brand-tint) / <alpha-value>)" },
        accent: "#ff7a45",
        ok: "#18a957",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 18px 40px -22px rgba(15,27,45,0.35)",
        soft: "0 6px 18px -10px rgba(15,27,45,0.30)",
      },
      borderRadius: {
        xl2: "16px",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise .35s ease both",
      },
    },
  },
  plugins: [],
};

export default config;
