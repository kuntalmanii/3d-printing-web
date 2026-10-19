/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FF5A00",
        secondary: "#111111",
        accent: "#D94D00",
        background: "#111111",
        surface: "#EAEAEA",
        borderDark: "#333333",
        textPrimary: "#FFFFFF",
        textSecondary: "#A1A1AA",
      },
      borderRadius: {
        card: "1px",
        control: "1px",
        pill: "9999px",
        DEFAULT: "1px",
        sm: "1px",
        md: "1px",
        lg: "1px",
        xl: "1px",
        "2xl": "1px",
        "3xl": "1px",
        full: "9999px",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
      },
      borderWidth: {
        DEFAULT: "1px",
      },
      boxShadow: {
        "glow-primary": "0 0 24px 0 rgba(255, 90, 0, 0.25)",
        "glow-accent": "0 0 16px 0 rgba(217, 77, 0, 0.20)",
        "inner-dark": "inset 0 1px 0 rgba(255,255,255,0.04)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-orange": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "scan-line": {
          from: { transform: "translateY(-100%)" },
          to: { transform: "translateY(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out both",
        "pulse-orange": "pulse-orange 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan-line": "scan-line 2s linear infinite",
      },
    },
  },
  plugins: [],
};
