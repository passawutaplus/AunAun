import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  ABOUT_EDIT_COPY,
  readAboutEditLang,
  writeAboutEditLang,
  type AboutEditCopy,
  type AboutEditLang,
} from "@/lib/aboutEditCopy";
import { cn } from "@/lib/utils";

type Ctx = {
  lang: AboutEditLang;
  setLang: (lang: AboutEditLang) => void;
  t: AboutEditCopy;
};

const AboutEditLocaleContext = createContext<Ctx | null>(null);

export function AboutEditLocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AboutEditLang>(() =>
    typeof window === "undefined" ? "th" : readAboutEditLang(),
  );
  const setLang = (next: AboutEditLang) => {
    setLangState(next);
    writeAboutEditLang(next);
  };
  const value = useMemo(() => ({ lang, setLang, t: ABOUT_EDIT_COPY[lang] }), [lang]);
  return <AboutEditLocaleContext.Provider value={value}>{children}</AboutEditLocaleContext.Provider>;
}

export function useAboutEditLocale(): Ctx {
  return (
    useContext(AboutEditLocaleContext) ?? {
      lang: "th",
      setLang: () => {},
      t: ABOUT_EDIT_COPY.th,
    }
  );
}

export function AboutEditLangToggle() {
  const { lang, setLang, t } = useAboutEditLocale();
  return (
    <div className="flex items-center gap-1.5">
      <span className="hidden text-[11px] text-muted-foreground sm:inline">{t.langSwitch}</span>
      <div
        className="inline-flex rounded-full border border-border p-0.5"
        role="group"
        aria-label={t.langSwitch}
      >
        {(["th", "en"] as const).map((id) => {
          const active = lang === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => setLang(id)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {id.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
