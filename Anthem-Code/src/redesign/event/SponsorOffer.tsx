import { useEffect, useState } from "react";
import { SPONSOR_OFFER_HEADER } from "@/lib/chat/eventLink";
import { openConnectChat } from "@/lib/chat/openConnectChat";
import { trackProductEvent } from "@/lib/productEvents";

/** Same choices and chat wording as the old page (components/exhibition/SponsorOfferDialog). */
const SUPPORT = ["เงินทุน", "สถานที่", "สินค้า / อุปกรณ์", "สื่อ / ประชาสัมพันธ์", "อาหาร / เครื่องดื่ม", "อื่น ๆ"] as const;

type Props = {
  userId: string;
  event: { id: string; title: string; owner_id: string; organizer_name: string | null };
  onClose: () => void;
  /** Opens the new chat room (small chat window, or the chat page on phones). */
  onSent: (roomId: string) => void;
  say: (t: string) => void;
};

/**
 * "เสนอเป็นสปอนเซอร์": who you are + what you can support, sent to the organiser as a chat message with the
 * event link at the end (the chat shows it as the event's card). Uses the share panel's box (work.css .sh-*).
 */
export default function SponsorOffer({ userId, event, onClose, onSent, say }: Props) {
  const [who, setWho] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = who.trim().length > 0 && (types.length > 0 || details.trim().length > 0);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose, busy]);

  const send = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const intro = [
        `${SPONSOR_OFFER_HEADER} "${event.title}"`,
        `ผู้สนับสนุน: ${who.trim()}`,
        types.length ? `สนับสนุนเรื่อง: ${types.join(", ")}` : "",
        details.trim(),
      ]
        .filter(Boolean)
        .join("\n");
      const roomId = await openConnectChat(userId, event.owner_id, `${intro}\n\n${window.location.origin}/exhibition/${event.id}`);
      void trackProductEvent("connect_message", { recipient_id: event.owner_id, source: "event_sponsor" }, { debounceMs: 0 });
      say("ส่งข้อเสนอแล้ว");
      onSent(roomId);
      onClose();
    } catch (e) {
      say(e instanceof Error && /[฀-๿]/.test(e.message) ? e.message : "ส่งไม่สำเร็จ ลองใหม่อีกทีนะ");
      setBusy(false);
    }
  };

  return (
    <div className="sh-veil">
      <div aria-hidden="true" className="sh-hit" onClick={busy ? undefined : onClose} />
      <div className="sh-box ev-so" role="dialog" aria-modal="true" aria-labelledby="ev-so-h">
        <button type="button" className="sh-x" aria-label="ปิด" onClick={onClose} disabled={busy}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <h2 id="ev-so-h">เสนอเป็นสปอนเซอร์</h2>
        <p className="ev-so-lead">บอก {event.organizer_name?.trim() || "ผู้จัด"} สั้นๆ ว่าคุณคือใคร ช่วยอะไรได้บ้าง ข้อความจะไปที่แชทพร้อมการ์ดงานนี้นะ</p>
        <label className="ev-so-f">
          <span>คุณคือใคร</span>
          <input autoFocus maxLength={80} value={who} onChange={(e) => setWho(e.target.value)} placeholder="ชื่อแบรนด์ / บริษัท / ตัวคุณ" disabled={busy} />
        </label>
        <fieldset className="ev-so-f">
          <legend>สนับสนุนเรื่องอะไร</legend>
          <div className="ev-so-chips">
            {SUPPORT.map((k) => {
              const on = types.includes(k);
              return (
                <button key={k} type="button" aria-pressed={on} disabled={busy} onClick={() => setTypes((cur) => (on ? cur.filter((x) => x !== k) : [...cur, k]))}>
                  {k}
                </button>
              );
            })}
          </div>
        </fieldset>
        <label className="ev-so-f">
          <span>รายละเอียดคร่าวๆ</span>
          <textarea
            rows={3}
            maxLength={600}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="เช่น ให้ใช้พื้นที่ร้านจัดเวิร์กช็อปฟรี 1 วัน"
            disabled={busy}
          />
        </label>
        <button type="button" className="ev-so-send" aria-disabled={!ready || busy} aria-busy={busy || undefined} onClick={() => void send()}>
          ส่งข้อเสนอ
        </button>
      </div>
    </div>
  );
}
