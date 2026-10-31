import { useCallback, useEffect, useMemo, useState } from "react";
import { LANDING_COPY, type LandingLang } from "./copy";

const STORAGE_KEY = "samecor-landing-lang";
const ZH_FONT_HREF = "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500&display=swap";

function readSavedLang(): LandingLang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "th" || saved === "zh") return saved;
  } catch {
    /* private mode */
  }
  return "en";
}

export type LandingText = (key: string, vars?: Record<string, string | number>) => string;

export function useLandingCopy() {
  const [lang, setLangState] = useState<LandingLang>(readSavedLang);

  const setLang = useCallback((next: LandingLang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode */
    }
  }, []);

  // Chinese glyphs are heavy: only fetch them for readers who pick the language.
  useEffect(() => {
    if (lang !== "zh" || document.querySelector("link[data-landing-zh]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = ZH_FONT_HREF;
    link.dataset.landingZh = "";
    document.head.append(link);
  }, [lang]);

  const dict = useMemo(() => LANDING_COPY[lang] as Record<string, unknown>, [lang]);

  const t = useCallback<LandingText>(
    (key, vars) => {
      let value = String(dict[key] ?? key);
      if (vars) for (const [k, v] of Object.entries(vars)) value = value.replace(`{${k}}`, String(v));
      return value;
    },
    [dict],
  );
  const list = useCallback(<T,>(key: string) => dict[key] as T, [dict]);

  return { lang, setLang, t, list };
}
