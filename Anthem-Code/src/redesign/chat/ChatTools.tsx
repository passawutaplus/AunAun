import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ChatRoom } from "./useChatStore";
import "../styles/chat-tools.css";

const QuoteSheet = lazy(() => import("./QuoteSheet"));
const InstallmentSheet = lazy(() => import("./InstallmentSheet"));
const CollabSheet = lazy(() => import("./CollabSheet"));
const PlanSheet = lazy(() => import("./PlanSheet"));

export type ChatTool = "quote" | "invoice" | "receipt" | "collab" | "plan";

const Icon = ({ k }: { k: ChatTool }) => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {k === "collab" ? (
      <>
        <circle cx="8.5" cy="9" r="3" />
        <circle cx="16" cy="9" r="3" />
        <path d="M3.5 19a5 5 0 0 1 10 0M11 19a5 5 0 0 1 9.5-1" />
      </>
    ) : k === "plan" ? (
      <>
        <rect x="4.5" y="4" width="15" height="16.5" rx="2" />
        <path d="M8.5 9l1.5 1.5L13 7.5M8.5 15h7" />
      </>
    ) : (
      <>
        <path d="M6.5 3.5h7l4 4v13h-11z" />
        <path d="M13.5 3.5v4h4" />
        {k === "quote" ? <path d="M9 12.5h6M9 16h4" /> : k === "invoice" ? <path d="M12 11v6M10 12.5c0-.8.9-1.5 2-1.5s2 .7 2 1.5-.9 1.5-2 1.5-2 .7-2 1.5.9 1.5 2 1.5 2-.7 2-1.5" /> : <path d="M9 14l2 2 4-4" />}
      </>
    )}
  </svg>
);

/**
 * "+" in the chat composer (Chat page, big popup, ChatDock): the quotation tools and the collab tools that came
 * back (owner 2026-11-28). Each opens its box over the chat; the documents and invites post their own cards.
 * No hiring here: no Hire button, no job queue, no platform payment.
 */
export default function ChatTools({
  room,
  say,
  onOpenRoom,
  small = false,
  open: openTool = null,
  onOpenChange,
}: {
  room: Pick<ChatRoom, "id" | "other" | "kind">;
  say: (t: string) => void;
  /** A collab invite opens its own room: the chat goes there. */
  onOpenRoom: (roomId: string) => void;
  small?: boolean;
  /** A tool opened from outside (a card / the collab bar). */
  open?: ChatTool | null;
  onOpenChange?: (t: ChatTool | null) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [own, setOwn] = useState<ChatTool | null>(null);
  const tool = openTool ?? own;
  const setTool = (t: ChatTool | null) => {
    setOwn(t);
    onOpenChange?.(t);
  };
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!menu) return;
    const out = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setMenu(false);
    };
    document.addEventListener("pointerdown", out);
    document.addEventListener("keydown", esc, true);
    return () => {
      document.removeEventListener("pointerdown", out);
      document.removeEventListener("keydown", esc, true);
    };
  }, [menu]);

  const items: ReadonlyArray<readonly [ChatTool, string]> = [
    ["quote", "ทำใบเสนอราคา"],
    ["invoice", "ใบแจ้งหนี้"],
    ["receipt", "ใบเสร็จ"],
    ...(room.kind === "collab" ? ([["plan", "แผนคอลแลป"]] as const) : []),
    ["collab", "ชวนคอลแลป"],
  ];
  const pick = (t: ChatTool) => {
    setMenu(false);
    setTool(t);
  };
  const close = () => setTool(null);

  return (
    <span ref={wrapRef} className="ct-wrap" data-small={small || undefined}>
      <button
        type="button"
        className={small ? "cd-ib ct-plus" : "ch-rb ct-plus"}
        aria-label="เครื่องมือ: ใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ คอลแลป"
        title="เครื่องมือ"
        aria-haspopup="menu"
        aria-expanded={menu}
        data-on={menu || undefined}
        onClick={() => setMenu((v) => !v)}
      >
        <svg aria-hidden="true" width={small ? 16 : 20} height={small ? 16 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      {menu ? (
        <span role="menu" className="ct-menu" aria-label="เครื่องมือ">
          {items.map(([k, label]) => (
            <button key={k} type="button" role="menuitem" className="ct-mi" onClick={() => pick(k)}>
              <span className="ct-mi-ic">
                <Icon k={k} />
              </span>
              {label}
            </button>
          ))}
        </span>
      ) : null}
      {tool ? (
        <Suspense fallback={null}>
          {tool === "quote" ? (
            <QuoteSheet room={room} onClose={close} say={say} />
          ) : tool === "invoice" || tool === "receipt" ? (
            <InstallmentSheet mode={tool} roomId={room.id} onClose={close} say={say} onNeedQuote={() => setTool("quote")} />
          ) : tool === "plan" ? (
            <PlanSheet room={room} onClose={close} say={say} />
          ) : (
            <CollabSheet room={room} onClose={close} say={say} onOpened={onOpenRoom} />
          )}
        </Suspense>
      ) : null}
    </span>
  );
}
