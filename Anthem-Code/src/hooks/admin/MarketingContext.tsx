import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { MarketingLanguage } from "@/lib/marketing/types";
import { resolveUiLanguage, type MarketingUiLanguage } from "@/lib/marketing/i18n";

const ACTIVE_BIZ_KEY = "marketing-module-active-business";
const LANG_KEY = "marketing-module-ui-language";

type MarketingContextValue = {
  activeBusinessId: string | null;
  setActiveBusinessId: (id: string | null) => void;
  uiLanguage: MarketingUiLanguage;
  toggleUiLanguage: () => void;
  languagePref: MarketingLanguage;
  setLanguagePref: (lang: MarketingLanguage) => void;
};

const MarketingContext = createContext<MarketingContextValue | null>(null);

export function MarketingProvider({ children }: { children: ReactNode }) {
  const [activeBusinessId, setActiveBusinessIdState] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_BIZ_KEY);
  });
  const [uiLanguage, setUiLanguage] = useState<MarketingUiLanguage>(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === "en" ? "en" : "th";
  });
  const [languagePref, setLanguagePref] = useState<MarketingLanguage>("both");

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

  return <MarketingContext.Provider value={value}>{children}</MarketingContext.Provider>;
}

export function useMarketingContext(): MarketingContextValue {
  const ctx = useContext(MarketingContext);
  if (!ctx) throw new Error("useMarketingContext must be used within MarketingProvider");
  return ctx;
}
