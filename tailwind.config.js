/** @type {import('tailwindcss').Config} */
// Palette + scales lifted directly from .claude/DESIGN.md (Anthropic claude.com
// editorial system): warm cream canvas, coral primary, dark navy product
// surfaces, slab-serif display + humanist sans body.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand / accent
        primary: { DEFAULT: "#cc785c", active: "#a9583e", disabled: "#e6dfd8" },
        "accent-teal": "#5db8a6",
        "accent-amber": "#e8a55a",
        // Surfaces
        canvas: "#faf9f5",
        "surface-soft": "#f5f0e8",
        "surface-card": "#efe9de",
        "surface-strong": "#e8e0d2",
        "surface-dark": "#181715",
        "surface-dark-elevated": "#252320",
        "surface-dark-soft": "#1f1e1b",
        hairline: "#e6dfd8",
        "hairline-soft": "#ebe6df",
        // Text
        ink: "#141413",
        "body-strong": "#252523",
        body: "#3d3d3a",
        muted: "#6c6a64",
        "muted-soft": "#8e8b82",
        "on-primary": "#ffffff",
        "on-dark": "#faf9f5",
        "on-dark-soft": "#a09d96",
        // Semantic
        success: "#5db872",
        warning: "#d4a017",
        error: "#c64545",
      },
      fontFamily: {
        // Copernicus/Tiempos substitute → Cormorant Garamond per DESIGN.md note.
        display: ['"Cormorant Garamond"', '"EB Garamond"', "Garamond", "serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-xl": ["64px", { lineHeight: "1.05", letterSpacing: "-1.5px" }],
        "display-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-1px" }],
        "display-md": ["36px", { lineHeight: "1.15", letterSpacing: "-0.5px" }],
        "display-sm": ["28px", { lineHeight: "1.2", letterSpacing: "-0.3px" }],
        "title-lg": ["22px", { lineHeight: "1.3" }],
        "title-md": ["18px", { lineHeight: "1.4" }],
        "title-sm": ["16px", { lineHeight: "1.4" }],
        "caption-up": ["12px", { lineHeight: "1.4", letterSpacing: "1.5px" }],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        pill: "9999px",
      },
      spacing: {
        section: "96px",
      },
      boxShadow: {
        // "color-block first, shadow rare" — a single faint elevation token.
        soft: "0 1px 3px rgba(20,20,19,0.08)",
        card: "0 1px 2px rgba(20,20,19,0.05)",
        coral: "0 8px 24px rgba(204,120,92,0.25)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: { shimmer: "shimmer 1.6s linear infinite" },
    },
  },
  plugins: [],
};
