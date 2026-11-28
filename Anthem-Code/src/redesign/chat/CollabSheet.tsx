import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_COLLAB_MESSAGE } from "@/lib/chatContext";
import { formatCollabTypesLabel, parseCollabReferenceLinks } from "@/lib/collabBrief";
import ChatSheet from "./ChatSheet";
import { useCollabActions } from "./useCollab";
import { usePersonWorks, type ChatRoom } from "./useChatStore";
import "../styles/chat-tools.css";

/** The old collab types, in the order creators picked them most. */
const TYPES = ["joint-project", "skill-swap", "content", "experiment", "studio", "chat", "other"] as const;

/**
 * ชวนคอลแลป (old CollabDialog, short): how to work together, a line to them, optionally one of my works and links.
 * Sending opens a collab room with them (old site: a collab has its own room) with the invite card in it.
 */
export default function CollabSheet({
  room,
  onClose,
  say,
  onOpened,
}: {
  room: Pick<ChatRoom, "id" | "other">;
  onClose: () => void;
  say: (t: string) => void;
  /** The new collab room (the chat goes there). */
  onOpened: (roomId: string) => void;
}) {
  const { user } = useAuth();
  const works = usePersonWorks(user?.id);
  const collab = useCollabActions();
  const [type, setType] = useState<string>("joint-project");
  const [otherNote, setOtherNote] = useState("");
  const [message, setMessage] = useState("");
  const [workId, setWorkId] = useState<string | null>(null);
  const [links, setLinks] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    if (busy) return;
    if (type === "other" && !otherNote.trim()) {
      setErr("บอกหน่อยว่าอยากร่วมงานแบบไหนนะ");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const w = (works.data ?? []).find((x) => x.id === workId);
      const id = await collab.invite({
        other: room.other.id,
        type,
        otherNote,
        message: message.trim() || DEFAULT_COLLAB_MESSAGE,
        work: w ? { id: w.id, title: w.title } : null,
        links: parseCollabReferenceLinks(links).slice(0, 5),
      });
      say(`ชวน ${room.other.name} คอลแลปแล้ว`);
      onOpened(id);
      onClose();
    } catch (e) {
      setErr(e instanceof Error && e.message ? e.message : "ชวนไม่สำเร็จ ลองอีกครั้งนะ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ChatSheet label={{ id: "ct-c-h" }} onClose={onClose} wide>
      <div className="cs-doc-hd">
        <div>
          <p id="ct-c-h" className="cs-h">
            ชวน {room.other.name} คอลแลป
          </p>
          <p className="cs-sub">จะเปิดห้องคอลแลปกับเขาแยกไว้ให้นะ เขาตกลงแล้วค่อยวางแผนกันในนั้น</p>
        </div>
        <button type="button" className="cs-x" aria-label="ปิด" title="ปิด" onClick={onClose}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div className="ct-form">
        <fieldset className="ct-f">
          <legend>อยากร่วมงานแบบไหน</legend>
          <div className="ct-chips">
            {TYPES.map((t) => (
              <button key={t} type="button" className="ct-chip" aria-pressed={type === t} onClick={() => setType(t)}>
                {formatCollabTypesLabel([t])}
              </button>
            ))}
          </div>
        </fieldset>
        {type === "other" ? (
          <label className="ct-f">
            <span>แบบไหนดี</span>
            <input value={otherNote} maxLength={200} onChange={(e) => setOtherNote(e.target.value)} placeholder="เช่น ทำซีนร่วมกัน" />
          </label>
        ) : null}
        <label className="ct-f">
          <span>บอก {room.other.name} สั้นๆ</span>
          <textarea rows={3} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={DEFAULT_COLLAB_MESSAGE} />
        </label>
        {works.data?.length ? (
          <fieldset className="ct-f">
            <legend>งานของคุณที่อยากให้เขาดู (ถ้ามี)</legend>
            <div className="ct-works">
              {works.data.slice(0, 12).map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className="ct-work"
                  aria-pressed={workId === w.id}
                  aria-label={w.title}
                  title={w.title}
                  style={w.cover ? { backgroundImage: `url(${JSON.stringify(w.cover)})` } : undefined}
                  onClick={() => setWorkId((v) => (v === w.id ? null : w.id))}
                />
              ))}
            </div>
          </fieldset>
        ) : null}
        <label className="ct-f">
          <span>ลิงก์อ้างอิง (ถ้ามี)</span>
          <input value={links} maxLength={600} onChange={(e) => setLinks(e.target.value)} placeholder="https://" inputMode="url" />
        </label>
      </div>
      {err ? (
        <p role="alert" className="ct-err">
          {err}
        </p>
      ) : null}
      <div className="cs-acts ct-acts">
        <button type="button" className="cs-cancel" onClick={onClose}>
          ยกเลิก
        </button>
        <button type="button" className="ct-go" disabled={busy} onClick={() => void send()}>
          {busy ? "กำลังส่ง…" : "ส่งคำชวน"}
        </button>
      </div>
    </ChatSheet>
  );
}
