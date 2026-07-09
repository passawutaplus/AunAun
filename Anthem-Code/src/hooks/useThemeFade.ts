import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";

export type ThemePreference = "light" | "dark" | "system";

function runWithViewTransition(apply: () => void) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    apply();
    return;
  }

  const doc = document as Document & {
    startViewTransition?: (callback: () => void) => { finished: Promise<void> };
  };
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(apply);
    return;
  }

  const root = document.documentElement;
  root.classList.add("theme-fade-active");
  apply();
  window.setTimeout(() => root.classList.remove("theme-fade-active"), 480);
}

export function useThemeFade() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const preference = (theme ?? "light") as ThemePreference;
  const resolved = (resolvedTheme ?? theme ?? "light") as "light" | "dark";
  const isDark = resolved === "dark";

  const setThemeWithFade = useCallback(
    (next: ThemePreference) => {
      if (next === theme) return;
      runWithViewTransition(() => setTheme(next));
    },
    [theme, setTheme],
  );

  const toggleTheme = useCallback(() => {
    setThemeWithFade(isDark ? "light" : "dark");
  }, [isDark, setThemeWithFade]);

  return {
    theme: preference,
    resolvedTheme: resolved,
    isDark,
    mounted,
    toggleTheme,
    setThemeWithFade,
  };
}
