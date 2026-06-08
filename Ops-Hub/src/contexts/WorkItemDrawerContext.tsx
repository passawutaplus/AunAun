import { createContext, useCallback, useContext, useState } from "react";
import type { WorkItem } from "@/lib/work-items";

type DrawerState = {
  item: WorkItem | null;
  open: (item: WorkItem) => void;
  close: () => void;
};

const WorkItemDrawerContext = createContext<DrawerState | null>(null);

export function WorkItemDrawerProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = useState<WorkItem | null>(null);
  const open = useCallback((next: WorkItem) => setItem(next), []);
  const close = useCallback(() => setItem(null), []);
  return (
    <WorkItemDrawerContext.Provider value={{ item, open, close }}>
      {children}
    </WorkItemDrawerContext.Provider>
  );
}

export function useWorkItemDrawer() {
  const ctx = useContext(WorkItemDrawerContext);
  if (!ctx) throw new Error("useWorkItemDrawer must be used within WorkItemDrawerProvider");
  return ctx;
}
