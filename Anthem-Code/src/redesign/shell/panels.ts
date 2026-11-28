import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/** Where the search was opened from: the home page's own button, or the header on every other page. */
export type SearchFrom = "main" | "header";

/** What a "ทักทาย" button or the chat icon asks the shell to open (mock ChatDock: greet-signal / big-signal / open-signal). */
export type OpenChatOpts = {
  /** Person to chat with: their existing 1:1 room, or a new one. */
  otherId?: string;
  roomId?: string;
  /** Greeting from a work: its card ("ทักจากงาน") sits on top of the small chat window. */
  work?: { id: string; title: string; cover: string } | null;
  /** The big chat popup (the whole chat page over the page) instead of the small window. */
  big?: boolean;
};

/** Popups owned by the shell that a page can open (mock: ChatDock + Main). */
export type ShellPanels = {
  openSearch: (opener: HTMLElement | null, from: SearchFrom) => void;
  /** The "+" chooser: Showcase or Event. */
  openNew: (opener: HTMLElement | null) => void;
  /** Event Calendar (Event page "Calendar", home Event tab "Full Calendar"). */
  openCalendar: (opener: HTMLElement | null) => void;
  /**
   * Chat: phones (≤600px) and pages without ChatDock go to `/chat/<room>`; larger screens open the room in the
   * small chat window (or the big popup with `big`). Rejects with a Thai message when the room cannot be opened.
   */
  openChat: (opts: OpenChatOpts, opener?: HTMLElement | null) => Promise<void>;
};

/**
 * The shell registers its `openChat` here, so a work open over the page (rendered outside the shell's tree,
 * see BackgroundAwareRoutes in App.tsx) still reaches ChatDock.
 */
let chatHost: ShellPanels["openChat"] | null = null;
export function setChatHost(fn: ShellPanels["openChat"] | null) {
  chatHost = fn;
}

export const ShellPanelsContext = createContext<ShellPanels>({
  openSearch: () => undefined,
  openNew: () => undefined,
  openCalendar: () => undefined,
  openChat: (opts, opener) => (chatHost ? chatHost(opts, opener) : Promise.reject(new Error("เปิดแชทไม่สำเร็จ ลองอีกครั้ง"))),
});

export const useShellPanels = () => useContext(ShellPanelsContext);

/**
 * "ทักทาย" on a profile, a creator card, Following, My Studio: opens the chat; when that fails the reason shows
 * for a moment (`error`, rendered by the page as a `role="status"` pill, class `cd-say`).
 */
export function useGreet() {
  const { openChat } = useShellPanels();
  const [error, setError] = useState("");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const greet = useCallback(
    (opts: OpenChatOpts, opener?: HTMLElement | null) => {
      openChat(opts, opener).catch((e: unknown) => {
        window.clearTimeout(timer.current);
        setError(e instanceof Error && e.message ? e.message : "เปิดแชทไม่สำเร็จ ลองอีกครั้ง");
        timer.current = window.setTimeout(() => setError(""), 2600);
      });
    },
    [openChat],
  );
  return { greet, error };
}

/**
 * Esc closes one layer at a time. These two answer "is a layer above/beside me open?" for the page-wide
 * (document) Esc handlers: the big chat popup is on top, then the work overlay, then the small chat window.
 * (Esc inside the small chat stops at the chat itself — see ChatDock.)
 */
export const workOverlayOpen = () => document.documentElement.classList.contains("sc-wk-open");
export const bigChatOpen = () => document.querySelector(".ch-emb") !== null;

/** Esc closes every popup (design rule A7.3: veil, ×, Esc). */
export function onEscape(handler: () => void) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") handler();
  };
  document.addEventListener("keydown", onKey);
  return () => document.removeEventListener("keydown", onKey);
}
