import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { getShareChatPeople } from "@/server/queries/shareChat";
import { sendWorkToChat } from "@/server/mutations/shareChat";

type Props = {
  userId: string;
  work: { id: string; title: string };
  say: (t: string) => void;
};

const MAX_PICK = 10;

/**
 * "ส่งในแชท" in the share panel (owner 2026-11-28, like Facebook's "send in Messenger"): pick friends from the
 * people you chat with or follow, add a note if you like, then send the work card into each chat.
 */
export default function ShareChat({ userId, work, say }: Props) {
  const people = useQuery({
    queryKey: ["share-chat-people", userId],
    queryFn: () => getShareChatPeople(userId),
    staleTime: 60_000,
  });
  const [picked, setPicked] = useState<string[]>([]);
  const [sent, setSent] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  // Arrows only where there is more to see (PC); phones swipe.
  const [edge, setEdge] = useState({ l: false, r: false });
  const measure = useCallback(() => {
    const el = row.current;
    if (el) setEdge({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  const list = people.data ?? [];
  useEffect(measure, [measure, list.length]);

  if (!list.length) return null;

  const toggle = (id: string) => {
    if (sent.includes(id)) return;
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_PICK ? p : [...p, id]));
  };

  const send = async () => {
    if (!picked.length || busy) return;
    setBusy(true);
    const done: string[] = [];
    let failed: string | null = null;
    for (const id of picked) {
      try {
        await sendWorkToChat(userId, id, work, note);
        done.push(id);
      } catch (e) {
        failed = e instanceof Error && e.message ? e.message : "ส่งไม่สำเร็จ";
      }
    }
    setBusy(false);
    setSent((s) => [...s, ...done]);
    setPicked((p) => p.filter((id) => !done.includes(id)));
    if (done.length) setNote("");
    if (failed) say(done.length ? `ส่งแล้ว ${done.length} คน · บางคน${failed}` : failed);
    else say(done.length > 1 ? `ส่งในแชทแล้ว ${done.length} คน` : "ส่งในแชทแล้ว");
  };

  const scroll = (dir: 1 | -1) => row.current?.scrollBy({ left: dir * 240, behavior: "smooth" });

  return (
    <section className="sh-sec" aria-labelledby="sh-chat-h">
      <h3 id="sh-chat-h">ส่งในแชท</h3>
      <div className="sh-row-wrap">
        <div className="sh-people" ref={row} onScroll={measure}>
          {list.map((p) => {
            const on = picked.includes(p.id);
            const done = sent.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                className="sh-person"
                aria-pressed={on}
                disabled={done}
                data-sent={done || undefined}
                onClick={() => toggle(p.id)}
              >
                <span className="sh-av">
                  {p.avatar ? <img src={proxiedImageUrl(p.avatar, 120)} alt="" /> : <span>{p.name.slice(0, 1).toUpperCase()}</span>}
                  {on || done ? (
                    <span className="sh-tick" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </span>
                  ) : null}
                </span>
                <span className="sh-pname">{done ? "ส่งแล้ว" : p.name}</span>
              </button>
            );
          })}
        </div>
        {edge.l ? (
          <button type="button" className="sh-nav" data-side="l" aria-label="เลื่อนซ้าย" onClick={() => scroll(-1)}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
        ) : null}
        {edge.r ? (
          <button type="button" className="sh-nav" data-side="r" aria-label="เลื่อนขวา" onClick={() => scroll(1)}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : null}
      </div>
      {picked.length ? (
        <div className="sh-send">
          <label className="sh-sr" htmlFor="sh-note">
            ข้อความ
          </label>
          <input id="sh-note" value={note} maxLength={500} placeholder="พิมพ์อะไรหน่อยก็ได้นะ" onChange={(e) => setNote(e.target.value)} />
          <button type="button" disabled={busy} onClick={() => void send()}>
            {busy ? "กำลังส่ง…" : picked.length > 1 ? `ส่ง (${picked.length})` : "ส่ง"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
