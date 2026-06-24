import * as React from "react";
import { loadSidebarWidth } from "@/hooks/useResizableSidebar";

export type AssistantView = "closed" | "mini" | "sidebar";
export type AssistantPreset = "mentor" | "business" | "copy" | "legal";

const PRESET_STORAGE_KEY = "so1o:assistant-preset:v1";

function loadPreset(): AssistantPreset {
  if (typeof window === "undefined") return "mentor";
  try {
    const v = localStorage.getItem(PRESET_STORAGE_KEY);
    if (v === "mentor" || v === "business" || v === "copy" || v === "legal") return v;
  } catch {
    /* noop */
  }
  return "mentor";
}

type AssistantContextValue = {
  view: AssistantView;
  preset: AssistantPreset;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  setPreset: (preset: AssistantPreset) => void;
  openMini: () => void;
  openSidebar: () => void;
  close: () => void;
  collapseToMini: () => void;
};

const AssistantContext = React.createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = React.useState<AssistantView>("closed");
  const [preset, setPresetState] = React.useState<AssistantPreset>(loadPreset);
  const [sidebarWidth, setSidebarWidth] = React.useState(loadSidebarWidth);

  const setPreset = React.useCallback((next: AssistantPreset) => {
    setPresetState(next);
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, next);
    } catch {
      /* noop */
    }
  }, []);

  const openMini = React.useCallback(() => setView("mini"), []);
  const openSidebar = React.useCallback(() => setView("sidebar"), []);
  const close = React.useCallback(() => setView("closed"), []);
  const collapseToMini = React.useCallback(() => setView("mini"), []);

  const value = React.useMemo(
    () => ({
      view,
      preset,
      sidebarWidth,
      setSidebarWidth,
      setPreset,
      openMini,
      openSidebar,
      close,
      collapseToMini,
    }),
    [view, preset, sidebarWidth, setPreset, openMini, openSidebar, close, collapseToMini],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const ctx = React.useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within AssistantProvider");
  return ctx;
}
