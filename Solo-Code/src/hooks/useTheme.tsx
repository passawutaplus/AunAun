import * as React from "react";

type Theme = "light" | "dark";
const KEY = "app-theme";

function getStoredTheme(): Theme {
  let saved: Theme | null = null;
  try {
    saved = localStorage.getItem(KEY) as Theme | null;
  } catch {
    // storage blocked (private mode etc.) — fall through to the system preference
  }
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function useTheme() {
  // Keep the server and first browser render identical, then hydrate preferences.
  const [theme, setThemeState] = React.useState<Theme>("light");
  const hydratedRef = React.useRef(false);

  React.useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      const stored = getStoredTheme();
      setThemeState(stored);
      apply(stored);
      return;
    }
    apply(theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {}
  }, [theme]);

  const setTheme = React.useCallback((t: Theme) => setThemeState(t), []);
  const toggle = React.useCallback(
    () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    [],
  );

  return { theme, setTheme, toggle };
}
