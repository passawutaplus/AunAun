import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { CHAT_REPORT_REASONS, type ChatReportReason } from "@/server/mutations/chatRooms";
import "../styles/chat-report.css";

const LABEL: Record<ChatReportReason, string> = {
  spam: "สแปม / โฆษณา",
  harassment: "คุกคาม / พูดจาไม่ดี",
  scam: "หลอกลวง / Scam",
  nsfw: "เนื้อหา 18+ / ไม่เหมาะสม",
  impersonation: "ปลอมเป็นคนอื่น",
  other: "อื่นๆ",
};

/**
 * "Report" in a chat (Chat page, big popup, ChatDock): pick why — the reasons of the old chat's ReportDialog that fit
 * a person — then send. Esc, a click outside or ยกเลิก close only this box; the focus goes back to Report.
 * Drawn in the nearest `.sc-app` (portal): the chat popups move with transforms, which would trap a fixed veil.
 */
export default function ReportPicker({
  name,
  busy,
  onSend,
  onClose,
}: {
  name: string;
  busy: boolean;
  onSend: (reason: ChatReportReason) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ChatReportReason | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const backRef = useRef<HTMLElement | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    backRef.current = document.activeElement as HTMLElement | null;
    setHost((anchorRef.current?.closest(".sc-app") as HTMLElement | null) ?? document.body);
    return () => {
      const back = backRef.current;
      if (back?.isConnected) back.focus();
    };
  }, []);

  useEffect(() => {
    if (host) boxRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [host]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || e.nativeEvent.isComposing) return;
    e.stopPropagation();
    onClose();
  };

  const veil = (
    <div className="cr-veil" onKeyDown={onKey}>
      <div aria-hidden="true" className="cr-hit" onClick={onClose} />
      <div ref={boxRef} className="cr-box" role="dialog" aria-modal="true" aria-labelledby="cr-h">
        <p id="cr-h" className="cr-h">
          รายงาน {name}
        </p>
        <p className="cr-sub">เกิดอะไรขึ้น บอกเราหน่อยนะ ทีมงานจะตรวจสอบให้</p>
        <div role="radiogroup" aria-labelledby="cr-h" className="cr-opts">
          {CHAT_REPORT_REASONS.map((k) => (
            <label key={k} className="cr-opt" data-on={reason === k || undefined}>
              <input type="radio" name="cr-reason" value={k} checked={reason === k} onChange={() => setReason(k)} />
              <span>{LABEL[k]}</span>
            </label>
          ))}
        </div>
        <div className="cr-acts">
          <button type="button" className="cr-cancel" onClick={onClose}>
            ยกเลิก
          </button>
          <button type="button" className="cr-send" disabled={!reason || busy} onClick={() => reason && onSend(reason)}>
            ส่งรายงาน
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <span ref={anchorRef} hidden />
      {host ? createPortal(veil, host) : null}
    </>
  );
}
