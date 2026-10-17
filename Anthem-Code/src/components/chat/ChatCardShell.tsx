import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Clock, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";

/** Semantic tone for hire/collab chat cards. */
export type ChatCardTone = "hire" | "collab" | "success" | "danger" | "neutral";

type ToneStyle = {
  /** Document: top bar + icon tile colour. Friendly: header band + icon colour. */
  bar: string;
  tile: string;
  band: string;
  bandText: string;
  accentText: string;
};

const TONE: Record<ChatCardTone, ToneStyle> = {
  hire: {
    bar: "bg-[hsl(var(--chat-hire))]",
    tile: "bg-[hsl(var(--chat-hire-soft))] text-[hsl(var(--chat-hire))]",
    band: "bg-[hsl(var(--chat-hire-soft))]",
    bandText: "text-[hsl(var(--chat-hire))]",
    accentText: "text-[hsl(var(--chat-hire))]",
  },
  collab: {
    bar: "bg-[hsl(var(--chat-collab))]",
    tile: "bg-[hsl(var(--chat-collab-soft))] text-[hsl(var(--chat-collab))]",
    band: "bg-[hsl(var(--chat-collab-soft))]",
    bandText: "text-[hsl(var(--chat-collab))]",
    accentText: "text-[hsl(var(--chat-collab))]",
  },
  success: {
    bar: "bg-emerald-500",
    tile: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    band: "bg-emerald-500/10",
    bandText: "text-emerald-700 dark:text-emerald-400",
    accentText: "text-emerald-700 dark:text-emerald-400",
  },
  danger: {
    bar: "bg-destructive",
    tile: "bg-destructive/10 text-destructive",
    band: "bg-destructive/10",
    bandText: "text-destructive",
    accentText: "text-destructive",
  },
  neutral: {
    bar: "bg-muted-foreground/40",
    tile: "bg-muted text-muted-foreground",
    band: "bg-muted",
    bandText: "text-muted-foreground",
    accentText: "text-foreground",
  },
};

/** Accent text color for a tone — use inside card bodies for headline values. */
export function chatCardAccent(tone: ChatCardTone): string {
  return TONE[tone].accentText;
}

/**
 * hire = "document" (reads like a work order: top bar, icon tile, dashed rule),
 * collab = "friendly" (rounder, soft orange band, icon in a circle).
 */
export type ChatCardFamily = "hire" | "collab";

type ChatCardShellProps = {
  tone?: ChatCardTone;
  /** Visual family; defaults from tone (collab → friendly, everything else → document). */
  family?: ChatCardFamily;
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

/** Unified wrapper for hire / collab chat cards — same on both sides of the thread. */
export function ChatCardShell({
  tone = "hire",
  family,
  icon: Icon,
  title,
  meta,
  action,
  children,
  footer,
  className,
}: ChatCardShellProps) {
  const t = TONE[tone];
  const fam: ChatCardFamily = family ?? (tone === "collab" ? "collab" : "hire");
  const right =
    meta || action ? (
      <span className="ml-auto flex shrink-0 items-center gap-1">
        {meta ? <span className="text-[11px] font-normal tabular-nums text-muted-foreground">{meta}</span> : null}
        {action}
      </span>
    ) : null;

  if (fam === "collab") {
    return (
      <div className={cn("w-full min-w-[16rem] max-w-[22rem] overflow-hidden rounded-[20px] border border-border bg-card text-foreground shadow-sm", className)}>
        <div className={cn("flex items-center gap-2.5 px-3.5 py-2.5", t.band)}>
          {Icon ? (
            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card", t.bandText)}>
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
          ) : null}
          <span className={cn("min-w-0 truncate text-xs font-medium", t.bandText)}>{title}</span>
          {right}
        </div>
        <div className="space-y-2.5 px-3.5 py-3">{children}</div>
        {footer ? <div className="px-3.5 pb-3.5 [&_button]:rounded-full">{footer}</div> : null}
      </div>
    );
  }

  return (
    <div className={cn("w-full min-w-[16rem] max-w-[22rem] overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-sm", className)}>
      <div className={cn("h-[3px]", t.bar)} aria-hidden />
      <div className="flex items-center gap-2.5 px-3.5 pb-2.5 pt-3">
        {Icon ? (
          <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", t.tile)}>
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
        <span className="min-w-0 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
        {right}
      </div>
      <div className="mx-3.5 border-t border-dashed border-border" aria-hidden />
      <div className="space-y-2.5 px-3.5 py-3">{children}</div>
      {footer ? <div className="border-t border-border px-3.5 py-2.5 [&_button]:rounded-lg">{footer}</div> : null}
    </div>
  );
}

/** Document-style key/value rows (label left, value right) for hire cards. */
export function ChatCardRows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  const shown = rows.filter((r) => r.value !== null && r.value !== undefined && r.value !== "");
  if (!shown.length) return null;
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
      {shown.map((r) => (
        <div key={r.label} className="contents">
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className="min-w-0 break-words text-right text-foreground">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Status pill: waiting = dashed outline + clock, ok = green, closed = gray. */
export function ChatCardStatusPill({ tone, children }: { tone: "wait" | "ok" | "closed"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "wait" && "border border-dashed border-foreground/30 text-muted-foreground",
        tone === "ok" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        tone === "closed" && "bg-muted text-muted-foreground",
      )}
    >
      {tone === "wait" ? <Clock className="h-3 w-3" aria-hidden /> : null}
      {children}
    </span>
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
  "flex-1 bg-[hsl(var(--chat-hire))] text-[hsl(var(--chat-hire-foreground))] hover:opacity-90";

/** Destructive/decline outline button classes. */
export const CHAT_CARD_DECLINE_BTN =
  "flex-1 border-destructive/40 text-destructive hover:bg-destructive/10";

/** ปุ่มปฏิเสธคำขอจ้าง/คอลแลป — ใช้คำว่า「ไม่สนใจ」แทน「ปฏิเสธ」 */
export const CHAT_CARD_DECLINE_LABEL = "ไม่สนใจ";

export default ChatCardShell;
