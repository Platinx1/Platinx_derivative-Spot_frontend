/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // PlatinX Color Palette
        "platinx-bg": "#070814",
        "platinx-surface": "#0F1725",
        "platinx-card": "#131A28",
        "platinx-border": "#1E2433",
        "platinx-primary": "#7B2FF7",
        "platinx-primary-light": "#A855F7",
        "platinx-secondary": "#C084FC",
        "platinx-success": "#22C55E",
        "platinx-danger": "#EF4444",
        "platinx-text": "#FFFFFF",
        "platinx-text-secondary": "#94A3B8",
        // Legacy colors (for backward compatibility)
        primary: "#7B2FF7",
        secondary: "#0F1725",
        accent: "#22C55E",
        danger: "#EF4444",
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
