import { useState } from "react";
import { CHAT_REPORT_REASONS, type ChatReportReason } from "@/server/mutations/chatRooms";
import ChatSheet from "./ChatSheet";

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
 * a person — then send.
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
  return (
    <ChatSheet label={{ id: "cr-h" }} onClose={onClose}>
      <p id="cr-h" className="cs-h">
        รายงาน {name}
      </p>
      <p className="cs-sub">เกิดอะไรขึ้น บอกเราหน่อยนะ ทีมงานจะตรวจสอบให้</p>
      <div role="radiogroup" aria-labelledby="cr-h" className="cr-opts">
        {CHAT_REPORT_REASONS.map((k) => (
          <label key={k} className="cr-opt" data-on={reason === k || undefined}>
            <input type="radio" name="cr-reason" value={k} checked={reason === k} onChange={() => setReason(k)} />
            <span>{LABEL[k]}</span>
          </label>
        ))}
      </div>
      <div className="cs-acts">
        <button type="button" className="cs-cancel" onClick={onClose}>
          ยกเลิก
        </button>
        <button type="button" className="cr-send" disabled={!reason || busy} onClick={() => reason && onSend(reason)}>
          ส่งรายงาน
        </button>
      </div>
    </ChatSheet>
  );
}
