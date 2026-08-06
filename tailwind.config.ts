import type { Config } from "tailwindcss";

const config: Config = {
  // Dark is the default theme; light mode is opted into via a `.light` class on
  // <html> (see globals.css + ThemeToggle). This selector makes Tailwind's
  // `dark:` variants apply by default and switch OFF under `.light`.
  darkMode: ["selector", ":root:not(.light)"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    // tracker/side color classes live as string literals here (EVENT_DEFS, SIDE)
    "./lib/**/*.{js,ts}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        // Semantic surface/text/line tokens — theme-aware via CSS variables so a
        // single :root swap re-themes the whole app (light <-> dark). Channel-
        // triplet vars let opacity modifiers (bg-surface/90) work.
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          muted: "rgb(var(--surface-muted) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          soft: "rgb(var(--ink-soft) / <alpha-value>)",
          faint: "rgb(var(--ink-faint) / <alpha-value>)",
        },
        line: "rgb(var(--line) / <alpha-value>)",
        // Soft accent (active chips / tints) — light indigo on light, deep on dark.
        "accent-soft": "rgb(var(--accent-soft-bg) / <alpha-value>)",
        "accent-soft-fg": "rgb(var(--accent-soft-fg) / <alpha-value>)",
        // Brand accent — the single source of truth for the app's primary color.
        // Change these values to re-theme every button/link/chip at once.
        // (Currently the indigo scale.)
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
      },
    },
  },
  plugins: [],
};
export default config;
