import { create } from "zustand";

type Mode = "signup" | "login";

interface AuthDialogState {
  open: boolean;
  mode: Mode;
  redirectPath: string;
  openSignup: (redirectPath?: string) => void;
  openLogin: (redirectPath?: string) => void;
  setMode: (m: Mode) => void;
  close: () => void;
}

const currentPath = () =>
  typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/";

export const useAuthDialog = create<AuthDialogState>((set) => ({
  open: false,
  mode: "signup",
  redirectPath: "/",
  openSignup: (redirectPath) =>
    set({ open: true, mode: "signup", redirectPath: redirectPath ?? currentPath() }),
  openLogin: (redirectPath) =>
    set({ open: true, mode: "login", redirectPath: redirectPath ?? currentPath() }),
  setMode: (mode) => set({ mode }),
  close: () => set({ open: false }),
}));
