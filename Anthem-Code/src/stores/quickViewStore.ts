import { create } from "zustand";
import type { Project } from "@/data/projectTypes";

/** Phone feed Quick View: the feed registers its project order, cards open by id, swipes step. */
interface QuickViewState {
  projects: Project[];
  index: number | null;
  setProjects: (projects: Project[]) => void;
  openFor: (projectId: string) => void;
  step: (delta: 1 | -1) => void;
  close: () => void;
}

export const useQuickView = create<QuickViewState>((set, get) => ({
  projects: [],
  index: null,
  setProjects: (projects) => set({ projects }),
  openFor: (projectId) => {
    const i = get().projects.findIndex((p) => p.id === projectId);
    if (i >= 0) set({ index: i });
  },
  step: (delta) => {
    const { index, projects } = get();
    if (index == null) return;
    const next = index + delta;
    if (next >= 0 && next < projects.length) set({ index: next });
  },
  close: () => set({ index: null }),
}));
