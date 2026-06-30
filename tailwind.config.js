/** @type {import('tailwindcss').Config} */
export default {
  content: ["./client/index.html", "./client/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Barlow", "Rajdhani", "Inter", "system-ui", "sans-serif"],
        body: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
        title: ["Anton", "Barlow", "system-ui", "sans-serif"],
      },
      colors: {
        pebol: {
          bg: "rgb(var(--color-pebol-bg) / <alpha-value>)",
          panel: "rgb(var(--color-pebol-panel) / <alpha-value>)",
          panel2: "rgb(var(--color-pebol-panel-2) / <alpha-value>)",
          line: "rgb(var(--color-pebol-line) / <alpha-value>)",
          text: "rgb(var(--color-pebol-text) / <alpha-value>)",
          muted: "rgb(var(--color-pebol-muted) / <alpha-value>)",
          faint: "rgb(var(--color-pebol-faint) / <alpha-value>)",
          accent: "rgb(var(--color-pebol-accent) / <alpha-value>)",
          accent2: "rgb(var(--color-pebol-accent-2) / <alpha-value>)",
          gold: "rgb(var(--color-pebol-gold) / <alpha-value>)",
          blue: "rgb(var(--color-pebol-blue) / <alpha-value>)",
        },
      },
      boxShadow: {
        premium: "var(--shadow-premium)",
        glow: "var(--shadow-glow)",
        goldGlow: "var(--shadow-gold-glow)",
      },
      borderRadius: {
        pebol: "0.5rem",
      },
      backgroundImage: {
        "stadium-depth": "var(--app-background)",
        glass: "linear-gradient(180deg, rgb(255 255 255 / 0.075), rgb(255 255 255 / 0.035))",
        "accent-gold":
          "linear-gradient(135deg, rgb(var(--color-pebol-accent)), rgb(var(--color-pebol-gold)))",
        "pitch-lines":
          "linear-gradient(var(--pitch-line) 1px, transparent 1px), linear-gradient(90deg, var(--pitch-line-soft) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
