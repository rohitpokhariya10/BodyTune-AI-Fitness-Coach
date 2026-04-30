import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        carbon: {
          950: "#070808",
          925: "#0B0D0F",
          900: "#101214",
          850: "#161A1D",
          800: "#1D2226",
          700: "#2B3238",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          hover: "hsl(var(--secondary) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "#FF4D4F",
          foreground: "#FFFFFF",
        },
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        nutrition: {
          DEFAULT: "var(--theme-primary)",
          foreground: "hsl(var(--primary-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        ring: "hsl(var(--ring) / <alpha-value>)",
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        volt: {
          400: "var(--theme-primary)",
          500: "var(--theme-primary-hover)",
        },
        aqua: {
          400: "var(--theme-primary)",
          500: "var(--theme-primary-hover)",
        },
        ember: {
          400: "var(--theme-primary)",
          500: "var(--theme-primary)",
          600: "var(--theme-primary-hover)",
        },
        warning: {
          DEFAULT: "#FFB000",
          foreground: "#160A00",
        },
        success: {
          DEFAULT: "var(--app-success)",
          foreground: "var(--app-success-foreground)",
        },
      },
      boxShadow: {
        glow: "0 0 18px var(--theme-primary-glow)",
        "glow-volt": "0 0 18px var(--theme-primary-glow)",
        "glow-ember": "var(--theme-shadow)",
        premium: "0 16px 42px rgba(0, 0, 0, 0.28)",
        "soft-panel": "0 10px 28px rgba(0, 0, 0, 0.2)",
        "inner-glass": "inset 0 1px 0 rgba(255,255,255,0.045)",
      },
      fontFamily: {
        display: [
          "Sora",
          "Manrope",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        sans: [
          "Inter",
          "Manrope",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      backgroundImage: {
        "premium-line": "var(--theme-gradient)",
        "ember-line": "var(--theme-gradient)",
        "orange-line": "var(--theme-gradient)",
        "premium-field":
          "linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.016)), radial-gradient(circle at 18% 10%, rgb(var(--theme-primary-rgb) / 0.07), transparent 32%), radial-gradient(circle at 86% 18%, rgb(var(--theme-secondary-rgb) / 0.035), transparent 28%), #050505",
        "nutrition-line": "var(--theme-gradient)",
      },
    },
  },
  plugins: [],
} satisfies Config;
