import { useState } from "react";

const THEME_KEY = "pebol:theme";
type AppTheme = "dark" | "light";

function readSavedTheme(): AppTheme {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.resolvedTheme = theme;
  localStorage.setItem(THEME_KEY, theme);
}

export function initializeTheme(): AppTheme {
  const theme = readSavedTheme();
  applyTheme(theme);
  return theme;
}

export function ThemeSwitch() {
  const [theme, setTheme] = useState<AppTheme>(() => readSavedTheme());
  const light = theme === "light";

  return (
    <button
      type="button"
      className="theme-switch"
      aria-label={light ? "Ativar tema escuro" : "Ativar tema claro"}
      aria-pressed={light}
      title={light ? "Tema claro" : "Tema escuro"}
      onClick={() => {
        const next = light ? "dark" : "light";
        applyTheme(next);
        setTheme(next);
      }}
    >
      <span className="theme-switch-track" aria-hidden="true">
        <span className="theme-icon theme-icon-moon" />
        <span className="theme-icon theme-icon-sun" />
        <span className="theme-switch-thumb" />
      </span>
    </button>
  );
}
