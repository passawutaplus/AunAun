import { createContext, useContext } from "react";

/** Where the search was opened from: the home page's own button, or the header on every other page. */
export type SearchFrom = "main" | "header";

/** Popups owned by the shell that a page can open (mock: ChatDock + Main). */
export type ShellPanels = {
  openSearch: (opener: HTMLElement | null, from: SearchFrom) => void;
  /** The "+" chooser: Showcase or Event. */
  openNew: (opener: HTMLElement | null) => void;
};

export const ShellPanelsContext = createContext<ShellPanels>({
  openSearch: () => undefined,
  openNew: () => undefined,
});

export const useShellPanels = () => useContext(ShellPanelsContext);

/** Esc closes every popup (design rule A7.3: veil, ×, Esc). */
export function onEscape(handler: () => void) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") handler();
  };
  document.addEventListener("keydown", onKey);
  return () => document.removeEventListener("keydown", onKey);
}
