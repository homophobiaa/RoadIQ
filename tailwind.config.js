/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark glass base with a coral accent (a nod to design.md's Anthropic coral).
        coral: {
          DEFAULT: "#cc785c",
          active: "#a9583e",
          soft: "#e8a55a",
        },
        ink: "#0b0d10",
        glass: "rgba(255,255,255,0.04)",
        success: "#34d399",
        danger: "#f87171",
        amber: "#fbbf24",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Sora", "Inter", "sans-serif"],
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.45)",
        glow: "0 0 40px rgba(204,120,92,0.35)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};
