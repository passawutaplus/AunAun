import { useCallback } from "react";
import { useTheme } from "next-themes";

type Theme = "light" | "dark";

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
  const current = (resolvedTheme ?? theme) as Theme | undefined;
  const isDark = current === "dark";

  const setThemeWithFade = useCallback(
    (next: Theme) => {
      if (next === current) return;
      runWithViewTransition(() => setTheme(next));
    },
    [current, setTheme],
  );

  const toggleTheme = useCallback(() => {
    setThemeWithFade(isDark ? "light" : "dark");
  }, [isDark, setThemeWithFade]);

  return { theme: current, isDark, toggleTheme, setThemeWithFade };
}
