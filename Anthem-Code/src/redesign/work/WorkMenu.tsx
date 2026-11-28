import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useEnsureSensitiveAction } from "@/components/legal/SensitiveActionReauthProvider";
import { REPORT } from "@/lib/i18n/report";
import { tr } from "@/lib/i18n";
import type { WorkReportReason } from "@/server/mutations/work";
import { reportErrorText, useBlockPerson, useSendReport } from "./useWork";

/**
 * The ⋯ menus of the Work page (old ProjectViewerMenu / CommentOwnerMenu / CommentViewerMenu, new look):
 * the menu itself, a yes/no box, and the report box. Esc closes the top layer only (the work stays open).
 */

export type MenuItem = { key: string; label: string; hint?: string; danger?: boolean; disabled?: boolean; onSelect: () => void };

/** Esc for one layer: handled before the page's own Esc (which would close the work), and not passed on. */
function useEscape(on: boolean, close: () => void) {
  const ref = useRef(close);
  ref.current = close;
  useEffect(() => {
    if (!on) return;
    const k = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      ref.current();
    };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [on]);
}

const dots = (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5.5" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="18.5" cy="12" r="1.5" />
  </svg>
);

/** A ⋯ button and its list. `place`: "rail" opens beside the work's side rail (above it on phones), "below" under the button. */
export function MoreMenu({ items, label, place, buttonClass }: { items: MenuItem[]; label: string; place: "rail" | "below"; buttonClass: string }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) btn.current?.focus();
  };
  useEscape(open, close);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    const away = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const arrows = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const all = [...(list.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
    const at = all.indexOf(document.activeElement as HTMLButtonElement);
    all[(at + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length]?.focus();
  };

  return (
    <div ref={wrap} className="wk-mn" data-place={place}>
      <button
        ref={btn}
        type="button"
        className={buttonClass}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {dots}
      </button>
      {open ? (
        <div ref={list} role="menu" aria-label={label} className="wk-mn-list" onKeyDown={arrows}>
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              className="wk-mn-it"
              data-danger={it.danger ? "" : undefined}
              disabled={it.disabled}
              onClick={() => {
                close(false);
                it.onSelect();
              }}
            >
              <span>{it.label}</span>
              {it.hint ? <span className="wk-mn-hint">{it.hint}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** The frame of a small box over the page (same look as the share panel and My Studio's "ลบ…?"). */
function Box({ titleId, title, onClose, children }: { titleId: string; title: string; onClose: () => void; children: ReactNode }) {
  useEscape(true, onClose);
  return (
    <div className="sh-veil">
      <div aria-hidden="true" className="sh-hit" onClick={onClose} />
      <div className="sh-box wk-dlg" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Asks before something that cannot be undone (delete, block). */
export function ConfirmBox({
  title,
  body,
  yes,
  danger,
  onYes,
  onClose,
}: {
  title: string;
  body: string;
  yes: string;
  danger?: boolean;
  onYes: () => Promise<void> | void;
  onClose: () => void;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  return (
    <Box titleId={id} title={title} onClose={() => !busy && onClose()}>
      <p className="wk-dlg-p">{body}</p>
      <div className="wk-dlg-row">
        <button type="button" className="wk-dlg-line" autoFocus disabled={busy} onClick={onClose}>
          ยกเลิก
        </button>
        <button
          type="button"
          className="wk-dlg-ink"
          data-danger={danger ? "" : undefined}
          aria-busy={busy || undefined}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onYes();
            } finally {
              setBusy(false);
            }
          }}
        >
          {yes}
        </button>
      </div>
    </Box>
  );
}

/** Reasons the review team sorts by (the old dialog's list; the RPC takes these codes). */
const REASONS: { key: WorkReportReason; label: string }[] = [
  { key: "spam", label: "สแปม / โฆษณา" },
  { key: "harassment", label: "คุกคาม / Hate speech" },
  { key: "nsfw", label: "18+ / ไม่เหมาะสม" },
  { key: "copyright", label: "ละเมิดลิขสิทธิ์" },
  { key: "scam", label: "หลอกลวง / Scam" },
  { key: "impersonation", label: "ปลอมเป็นคนอื่น" },
  { key: "other", label: "อื่นๆ" },
];

/** Report a work or a comment; can block its owner in the same go. Old ReportDialog without evidence files. */
export function ReportBox({
  target,
  ownerId,
  ownerName,
  canBlock,
  onDone,
  onClose,
}: {
  target: { type: "project" | "comment"; id: string };
  ownerId: string | null;
  ownerName: string;
  /** Not blocked yet and not me: offer "บล็อกด้วย". */
  canBlock: boolean;
  onDone: (note: string, blocked: boolean) => void;
  onClose: () => void;
}) {
  const id = useId();
  const ensureVerified = useEnsureSensitiveAction();
  const report = useSendReport();
  const block = useBlockPerson();
  const [reason, setReason] = useState<WorkReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [error, setError] = useState("");
  const busy = report.isPending || block.isPending;

  const send = async () => {
    if (!reason || busy) return;
    setError("");
    try {
      await ensureVerified(tr(REPORT.verifyAction));
    } catch {
      return;
    }
    try {
      await report.mutateAsync({ targetType: target.type, targetId: target.id, ownerId, reason, details: details.trim() });
    } catch (e) {
      setError(reportErrorText(e));
      return;
    }
    let blocked = false;
    if (alsoBlock && canBlock && ownerId) {
      blocked = await block.mutateAsync(ownerId).then(
        () => true,
        () => false,
      );
    }
    onDone(blocked ? `ส่งรายงานและบล็อก ${ownerName || "แล้ว"}` : "ส่งรายงานแล้ว ขอบคุณนะ", blocked);
  };

  return (
    <Box titleId={id} title={target.type === "project" ? "รายงานผลงานนี้" : "รายงานคอมเมนต์นี้"} onClose={() => !busy && onClose()}>
      <p className="wk-dlg-p">ทีมงานจะดูให้นะ คนที่โดนรายงานจะไม่รู้ว่าใครส่ง</p>
      <div className="wk-dlg-reasons" role="radiogroup" aria-label="เหตุผล">
        {REASONS.map((r) => (
          <button key={r.key} type="button" role="radio" aria-checked={reason === r.key} className="wk-dlg-reason" onClick={() => setReason(r.key)}>
            {r.label}
          </button>
        ))}
      </div>
      <label className="wk-dlg-field">
        <span>เล่าเพิ่มอีกนิด (ไม่ใส่ก็ได้)</span>
        <textarea rows={3} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} />
      </label>
      {canBlock ? (
        <label className="wk-dlg-check">
          <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} />
          <span>บล็อก {ownerName || "คนนี้"} ด้วย</span>
        </label>
      ) : null}
      {error ? (
        <p className="wk-dlg-err" role="alert">
          {error}
        </p>
      ) : null}
      <div className="wk-dlg-row">
        <button type="button" className="wk-dlg-line" disabled={busy} onClick={onClose}>
          ยกเลิก
        </button>
        <button type="button" className="wk-dlg-ink" aria-busy={busy || undefined} disabled={!reason || busy} onClick={() => void send()}>
          {alsoBlock && canBlock ? "ส่งและบล็อก" : "ส่งรายงาน"}
        </button>
      </div>
    </Box>
  );
}
