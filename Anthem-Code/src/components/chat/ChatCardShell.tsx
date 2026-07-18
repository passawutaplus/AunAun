import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";

/** Semantic tone for hire/collab chat cards. */
export type ChatCardTone = "hire" | "success" | "danger" | "neutral";

type ToneStyle = {
  header: string;
  border: string;
  accentText: string;
};

const TONE: Record<ChatCardTone, ToneStyle> = {
  hire: {
    header: "bg-[hsl(var(--chat-hire-soft))] text-[hsl(var(--chat-hire))]",
    border: "border-[hsl(var(--chat-hire)/0.35)]",
    accentText: "text-[hsl(var(--chat-hire))]",
  },
  success: {
    header: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/30",
    accentText: "text-emerald-700 dark:text-emerald-400",
  },
  danger: {
    header: "bg-destructive/10 text-destructive",
    border: "border-destructive/30",
    accentText: "text-destructive",
  },
  neutral: {
    header: "bg-muted text-muted-foreground",
    border: "border-border",
    accentText: "text-foreground",
  },
};

/** Accent text color for a tone — use inside card bodies for headline values. */
export function chatCardAccent(tone: ChatCardTone): string {
  return TONE[tone].accentText;
}

type ChatCardShellProps = {
  tone?: ChatCardTone;
  icon?: LucideIcon;
  title: string;
  /** Right-aligned header meta (e.g. quote number). */
  meta?: ReactNode;
  /** Far-right header slot for an actions menu (e.g. ⋮ order detail). */
  action?: ReactNode;
  children: ReactNode;
  /** Buttons / status row. Rendered with standard footer padding. */
  footer?: ReactNode;
  className?: string;
};

/**
 * Unified wrapper for all hire chat cards — consistent width, header strip,
 * body padding, and footer. Cards look identical on both sides of the thread.
 */
export function ChatCardShell({
  tone = "hire",
  icon: Icon,
  title,
  meta,
  action,
  children,
  footer,
  className,
}: ChatCardShellProps) {
  const t = TONE[tone];
  return (
    <div
      className={cn(
        "rounded-2xl border overflow-hidden shadow-sm w-full min-w-[16rem] max-w-[22rem] bg-card text-foreground",
        t.border,
        className,
      )}
    >
      <div
        className={cn(
          "px-3 py-2 flex items-center gap-1.5 text-[11px] font-semibold",
          t.header,
        )}
      >
        {Icon ? <Icon className="w-3.5 h-3.5 shrink-0" /> : null}
        <span className="truncate">{title}</span>
        {meta || action ? (
          <span className="ml-auto flex items-center gap-1 shrink-0">
            {meta ? (
              <span className="font-normal tabular-nums opacity-80">{meta}</span>
            ) : null}
            {action}
          </span>
        ) : null}
      </div>
      <div className="px-3 py-3 space-y-2.5">{children}</div>
      {footer ? <div className="px-3 pb-3">{footer}</div> : null}
    </div>
  );
}

/** Standard status line shown in a card footer when no actions are available. */
export function ChatCardStatus({ children }: { children: ReactNode }) {
  return <p className="text-[11px] text-muted-foreground">{children}</p>;
}

/**
 * Document icon shown in a hire card header — opens the full order-detail popup
 * directly. Pass to `ChatCardShell`'s `action` slot on hire-flow cards.
 */
export function ChatCardOrderMenu({ onOpenOrderDetail }: { onOpenOrderDetail: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-foreground/10 transition-colors"
      aria-label="รายละเอียดออเดอร์"
      title="รายละเอียดออเดอร์"
      onClick={(e) => {
        e.stopPropagation();
        onOpenOrderDetail();
      }}
    >
      <ReceiptText className="w-3.5 h-3.5" />
    </button>
  );
}

/** Primary hire action button classes (fill). */
export const CHAT_CARD_PRIMARY_BTN =
  "flex-1 rounded-full bg-[hsl(var(--chat-hire))] text-white hover:opacity-90";

/** Destructive/decline outline button classes. */
export const CHAT_CARD_DECLINE_BTN =
  "flex-1 rounded-full border-destructive/40 text-destructive hover:bg-destructive/10";

export default ChatCardShell;
