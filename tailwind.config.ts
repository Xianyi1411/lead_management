import type { Config } from "tailwindcss";

// Design tokens are the single source of truth in DESIGN.md.
// Keep this in sync with app/globals.css :root custom properties.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fog: "#F7F8FA",
        surface: "#FFFFFF",
        rail: { DEFAULT: "#171922", hi: "#232634" },
        ink: "#1C1F27",
        slate: "#5B6170",
        mist: { DEFAULT: "#E6E8EE", 2: "#EEF0F4" },
        iris: { DEFAULT: "#4A45E0", soft: "#ECEBFB" },
        wa: "#1FA855",
        stage: {
          new: "#64748B",
          contacted: "#2F6FED",
          qualified: "#0E9AA7",
          proposal: "#D98A0B",
          won: "#17915B",
          lost: "#D2453E",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "'Cascadia Mono'", "Consolas", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,18,27,.04), 0 4px 12px rgba(16,18,27,.05)",
      },
      borderRadius: {
        card: "9px",
      },
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(.22,1,.36,1)",
      },
    },
  },
  plugins: [],
};

export default config;
