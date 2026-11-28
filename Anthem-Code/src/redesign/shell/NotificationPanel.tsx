import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { NotificationRow } from "../lib/notificationRows";
import { onEscape } from "./panels";

type Props = {
  rows: NotificationRow[];
  loading: boolean;
  /** Under the bell: CSS top / right in px. */
  top: number;
  right: number;
  leaving: boolean;
  onOpenRow: (row: NotificationRow) => void;
  onReadAll: () => void;
  onClose: (restoreFocus?: boolean) => void;
};

const pic = (url: string) => (url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined);

/** Small panel under the bell (mock: ChatDock.dc.html). No blur behind it; a click outside, × or Esc closes it. */
export default function NotificationPanel({ rows, loading, top, right, leaving, onOpenRow, onReadAll, onClose }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const hasUnread = rows.some((r) => r.unread);

  useEffect(() => {
    boxRef.current?.querySelector<HTMLElement>(".nt-row, .nt-x")?.focus();
  }, []);

  useEffect(() => onEscape(() => onClose()), [onClose]);

  return (
    <>
      <div className="nt-catch" aria-hidden="true" onClick={() => onClose()} />
      <div
        ref={boxRef}
        className="nt-box pv-drop"
        role="dialog"
        aria-label="การแจ้งเตือน"
        style={{ top, right }}
        data-leaving={leaving ? "" : undefined}
      >
        <div className="nt-hd">
          <h2 lang="en">Notifications</h2>
          {hasUnread ? (
            <button type="button" className="nt-all" onClick={onReadAll}>
              อ่านทั้งหมด
            </button>
          ) : null}
          <button type="button" className="nt-x" aria-label="ปิดการแจ้งเตือน" title="ปิด" onClick={() => onClose()}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="nt-list">
          {rows.map((r) => (
            <Link
              key={r.id}
              to={r.href}
              className="nt-row"
              aria-label={`${r.who} ${r.what}${r.unread ? " ยังไม่อ่าน" : ""}`}
              onClick={() => onOpenRow(r)}
            >
              <span aria-hidden="true" className="nt-pic" data-round={r.round ? "" : undefined} style={pic(r.picture)} />
              <span className="nt-tx">
                <span className="nt-who" data-unread={r.unread ? "" : undefined}>{r.who}</span>
                <span className="nt-what">{r.what}</span>
              </span>
              <span className="nt-side">
                <span className="nt-time">{r.time}</span>
                <span aria-hidden="true" className="nt-dot" data-unread={r.unread ? "" : undefined} />
              </span>
            </Link>
          ))}
          {/* The mock has no empty state (question for Beam): one short line. */}
          {!loading && !rows.length ? <p className="nt-none">ยังไม่มีการแจ้งเตือน</p> : null}
        </div>
      </div>
    </>
  );
}
