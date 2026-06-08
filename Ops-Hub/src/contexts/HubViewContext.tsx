import { createContext, useContext, useState } from "react";
import type { HubView } from "@/hooks/useHubMetrics";

type HubViewState = {
  view: HubView;
  setView: (v: HubView) => void;
};

const HubViewContext = createContext<HubViewState | null>(null);

export function HubViewProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<HubView>("all");
  return (
    <HubViewContext.Provider value={{ view, setView }}>{children}</HubViewContext.Provider>
  );
}

export function useHubView() {
  const ctx = useContext(HubViewContext);
  if (!ctx) throw new Error("useHubView must be used within HubViewProvider");
  return ctx;
}
