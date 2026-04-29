"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

const themes = [
  { value: "sage", label: "Sage Light", swatch: "#0f766e" },
  { value: "graphite", label: "Graphite Light", swatch: "#475569" },
  { value: "midnight", label: "Midnight", swatch: "#60a5fa" },
  { value: "ember", label: "Ember Dark", swatch: "#f59e0b" },
] as const;

type ThemeName = typeof themes[number]["value"];

function isThemeName(value: string | null): value is ThemeName {
  return themes.some((theme) => theme.value === value);
}

export function ThemeControl() {
  const [theme, setTheme] = useState<ThemeName>("sage");

  useEffect(() => {
    const stored = window.localStorage.getItem("tcc-theme");
    const initialTheme = isThemeName(stored) ? stored : isThemeName(document.documentElement.dataset.theme ?? null)
      ? document.documentElement.dataset.theme as ThemeName
      : "sage";
    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
  }, []);

  function chooseTheme(nextTheme: ThemeName) {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("tcc-theme", nextTheme);
    document.cookie = `tcc-theme=${nextTheme}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className="theme-control" aria-label="Color theme">
      <span className="field-label">Color theme</span>
      <div className="theme-swatch-row" role="radiogroup" aria-label="Choose color theme">
        {themes.map((item) => (
          <button
            aria-checked={theme === item.value}
            aria-label={`${item.label} theme`}
            className={theme === item.value ? "theme-swatch is-active" : "theme-swatch"}
            key={item.value}
            onClick={() => chooseTheme(item.value)}
            role="radio"
            style={{ "--swatch": item.swatch } as CSSProperties}
            title={`${item.label} theme`}
            type="button"
          >
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
