import { create } from "zustand";

/**
 * Opens the shared collab plan document sheet from invite accept,
 * plan doc cards, or side-panel actions.
 */
interface CollabPlanUiState {
  conversationId: string | null;
  open: boolean;
  openFor: (conversationId: string) => void;
  setOpen: (open: boolean) => void;
  close: () => void;
}

export const useCollabPlanUi = create<CollabPlanUiState>((set) => ({
  conversationId: null,
  open: false,
  openFor: (conversationId) => set({ conversationId, open: true }),
  setOpen: (open) => set((s) => ({ open, conversationId: open ? s.conversationId : s.conversationId })),
  close: () => set({ open: false }),
}));
