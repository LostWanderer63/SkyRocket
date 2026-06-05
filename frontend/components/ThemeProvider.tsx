"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
const KEY = "skyroute_theme";

const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void } | null>(null);

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function initialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const t = initialTheme();
    setThemeState(t);
    apply(t);
  }, []);

  function setTheme(t: Theme) {
    localStorage.setItem(KEY, t);
    setThemeState(t);
    apply(t);
  }

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
      className="grid h-9 w-9 place-items-center rounded-[10px] border border-line text-base hover:bg-bg"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
