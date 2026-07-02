import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { KuyLanguage } from "@/lib/kuy-radar/types";
import { resolveUiLanguage, type KuyUiLanguage } from "@/lib/kuy-radar/i18n";

const ACTIVE_BIZ_KEY = "kuy-radar-active-business";
const LANG_KEY = "kuy-radar-ui-language";

type KuyRadarContextValue = {
  activeBusinessId: string | null;
  setActiveBusinessId: (id: string | null) => void;
  uiLanguage: KuyUiLanguage;
  toggleUiLanguage: () => void;
  languagePref: KuyLanguage;
  setLanguagePref: (lang: KuyLanguage) => void;
};

const KuyRadarContext = createContext<KuyRadarContextValue | null>(null);

export function KuyRadarProvider({ children }: { children: ReactNode }) {
  const [activeBusinessId, setActiveBusinessIdState] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_BIZ_KEY);
  });
  const [uiLanguage, setUiLanguage] = useState<KuyUiLanguage>(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === "en" ? "en" : "th";
  });
  const [languagePref, setLanguagePref] = useState<KuyLanguage>("both");

  const setActiveBusinessId = useCallback((id: string | null) => {
    setActiveBusinessIdState(id);
    if (id) localStorage.setItem(ACTIVE_BIZ_KEY, id);
    else localStorage.removeItem(ACTIVE_BIZ_KEY);
  }, []);

  const toggleUiLanguage = useCallback(() => {
    setUiLanguage((prev) => {
      const next = prev === "th" ? "en" : "th";
      localStorage.setItem(LANG_KEY, next);
      return next;
    });
  }, []);

  useEffect(() => {
    setUiLanguage(resolveUiLanguage(languagePref));
  }, [languagePref]);

  const value = useMemo(
    () => ({
      activeBusinessId,
      setActiveBusinessId,
      uiLanguage,
      toggleUiLanguage,
      languagePref,
      setLanguagePref,
    }),
    [activeBusinessId, setActiveBusinessId, uiLanguage, toggleUiLanguage, languagePref],
  );

  return <KuyRadarContext.Provider value={value}>{children}</KuyRadarContext.Provider>;
}

export function useKuyRadarContext(): KuyRadarContextValue {
  const ctx = useContext(KuyRadarContext);
  if (!ctx) throw new Error("useKuyRadarContext must be used within KuyRadarProvider");
  return ctx;
}
