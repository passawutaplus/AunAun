import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSignedStorageUrl } from "@/hooks/useSignedStorageUrl";
import { SC_LINKS } from "../routes";
import LoadError from "../shell/LoadError";
import { onEscape } from "../shell/panels";
import { baht, clock, dayWord, listTime, newDay } from "../chat/chatFormat";
import ReportPicker from "../chat/ReportPicker";
import {
  useChatActions,
  useChatRoom,
  useChatRooms,
  usePersonWorks,
  useRoomLock,
  useRoomMessages,
  type ChatMsg,
  type ChatRoom,
  type ChatWork,
} from "../chat/useChatStore";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/reset.css";
import "../styles/panels.css";
import "../styles/chat.css";

type Props = {
  /** Big chat popup over any page (opened from ChatDock / the header chat button): no URL change, × closes. */
  embedded?: boolean;
  onClose?: () => void;
  initialRoomId?: string | null;
  /** "ทักจากงาน": the work a greeting came from (big popup from ChatDock; on its own page: `location.state.greetWork`). */
  greetWork?: ChatWork | null;
};

const CREATORS = `${SC_LINKS.home}?tab=creators`;
const REPORTED = "ส่งรายงานแล้ว ทีมงานจะตรวจสอบให้นะ";
const bg = (url: string | null | undefined): CSSProperties | undefined => (url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined);

function Avatar({ room, size, hidden }: { room: ChatRoom; size: number; hidden?: boolean }) {
  const src = size > 60 ? room.other.avatarBig : room.other.avatar;
  return (
    <span
      aria-hidden="true"
      className="ch-av"
      style={{ width: size, height: size, visibility: hidden ? "hidden" : undefined, ...bg(src) }}
    >
      {src ? null : room.other.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Picture({ path }: { path: string }) {
  const url = useSignedStorageUrl(path);
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="ch-img" aria-label="รูปที่ส่งมา" style={bg(url)} />
  ) : (
    <span role="img" aria-label="รูปที่ส่งมา" className="ch-img" />
  );
}

/** A picture on its way up: the preview from this device (if any) under a spinner, until the stored one replaces it. */
const Uploading = ({ url }: { url: string | null }) => (
  <span role="img" aria-label="กำลังส่งรูป" className="ch-img ch-up" style={bg(url)}>
    <span aria-hidden="true" className="ch-spin" />
  </span>
);

function MediaThumb({ path }: { path: string }) {
  const url = useSignedStorageUrl(path);
  return <span role="img" aria-label="รูปในแชท" className="ch-th" style={bg(url)} />;
}

const Chevron = ({ open }: { open: boolean }) => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="ch-chev" data-open={open || undefined}>
    <path d="M6 9.5l6 6 6-6" />
  </svg>
);

/**
 * Chat (mock: pages/Chat.dc.html): list · room · chat info. On its own page (`/chat`, `/chat/:id`) and as the
 * big popup of ChatDock (`embedded`). Phones: list ↔ room, each full screen (mock data-chv list / conv).
 */
export function ChatView({ embedded = false, onClose, initialRoomId = null, greetWork = null }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const { rooms, loading, error: listError, refetch: refetchList } = useChatRooms(true);
  const actions = useChatActions();

  const [localId, setLocalId] = useState<string | null>(initialRoomId);
  const activeId = embedded ? localId : params.id ?? null;
  // A room not in the newest 100 (e.g. a notification link) is read by itself.
  const roomQ = useChatRoom(activeId, { rooms, loading });
  const cur = roomQ.room;
  const lock = useRoomLock(cur);

  // "ทักจากงาน": the card shows on top until the first message goes out with it.
  const stateWork = embedded ? null : (location.state as { greetWork?: ChatWork } | null)?.greetWork ?? null;
  const [about, setAbout] = useState<{ room: string; work: ChatWork } | null>(() => {
    const w = embedded ? greetWork : stateWork;
    return w && activeId ? { room: activeId, work: w } : null;
  });
  useEffect(() => {
    if (stateWork && params.id) setAbout({ room: params.id, work: stateWork });
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const [filter, setFilter] = useState<"all" | "req">("all");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");
  const [info, setInfo] = useState(false);
  const [find, setFind] = useState(false);
  const [fq, setFq] = useState("");
  const [share, setShare] = useState(false);
  const [sec, setSec] = useState({ works: false, media: false, priv: false });
  const [worksAll, setWorksAll] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const noticeTimer = useRef<number>();
  const logRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLTextAreaElement>(null);

  const say = (text: string) => {
    window.clearTimeout(noticeTimer.current);
    setNotice(text);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 2600);
  };
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  // A request opened by link (e.g. from a notification) shows under Requests.
  useEffect(() => {
    if (cur) setFilter(cur.request ? "req" : "all");
  }, [cur?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Opening a room reads it (a request is only "seen": the sender does not learn it was read until Accept).
  const readKey = cur ? `${cur.id}:${cur.unread}` : "";
  useEffect(() => {
    if (cur?.unread) void actions.openRoom(cur);
  }, [readKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const { items, loading: msgsLoading, error: msgsError, refetch: refetchMsgs } = useRoomMessages(cur?.id ?? null);
  const theirWorks = usePersonWorks(info && cur ? cur.other.id : null);
  const { user } = useAuth();
  const myWorks = usePersonWorks(share ? user?.id : null);
  const aboutWork = about && cur && about.room === cur.id && !items.some((m) => m.work?.id === about.work.id) ? about.work : null;

  // Open a room / send → the newest message (mock logEnd).
  const logKey = cur ? `${cur.id}:${items.length}` : "";
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logKey]);

  // The text box grows with the lines (Shift+Enter), up to its max height in chat.css.
  useLayoutEffect(() => {
    const el = inRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, cur?.id]);

  useEffect(() => (embedded && onClose ? onEscape(onClose) : undefined), [embedded, onClose]);

  const go = (id: string | null) => {
    setDraft("");
    setFind(false);
    setFq("");
    setShare(false);
    setWorksAll(false);
    setReporting(false);
    if (embedded) setLocalId(id);
    else navigate(id ? `/chat/${id}` : SC_LINKS.chat, { replace: !!id && !!activeId });
  };

  const onReq = filter === "req";
  const reqN = rooms.filter((r) => r.request).length;
  const query = q.trim().toLowerCase();
  const list = rooms.filter((r) => (onReq ? r.request : !r.request) && (!query || r.other.name.toLowerCase().includes(query)));

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      if (done) say(done);
    } catch (e) {
      say(e instanceof Error && e.message ? e.message : "ทำไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  };
  const removeCur = (fn: () => Promise<unknown>, done: string) =>
    void run(async () => {
      await fn();
      setInfo(false);
      go(null);
    }, done);

  const send = () => {
    const text = draft.trim();
    if (!cur || !text || lock) return;
    const work = aboutWork;
    setDraft("");
    void actions.sendText(cur.id, text, work).then(
      () => {
        if (work) setAbout(null);
      },
      (e: unknown) => {
        setDraft((d) => d || text);
        say(e instanceof Error ? e.message : "ส่งไม่สำเร็จ");
      },
    );
  };
  const sendReport = (reason: Parameters<typeof actions.report>[1]) => {
    if (!cur) return;
    removeCur(async () => {
      await actions.report(cur, reason);
      setReporting(false);
    }, REPORTED);
  };
  const sendWork = (w: ChatWork) => {
    if (!cur) return;
    setShare(false);
    void actions.sendWork(cur.id, w).catch((e: unknown) => say(e instanceof Error ? e.message : "ส่งไม่สำเร็จ"));
  };
  const pickImg = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !cur || lock) return;
    void actions.sendImage(cur.id, f).catch((err: unknown) => say(err instanceof Error ? err.message : "ส่งรูปไม่สำเร็จ"));
  };
  // Enter sends, Shift+Enter is a new line (not while a Thai / IME word is being composed).
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };
  const toggleFind = () => {
    const phone = window.matchMedia("(max-width: 600px)").matches;
    setFind((v) => !v);
    setFq("");
    if (phone) setInfo(false);
    window.setTimeout(() => document.getElementById("ch-f")?.focus(), 30);
  };
  const closeX = (e: MouseEvent) => {
    if (embedded && onClose) {
      e.preventDefault();
      onClose();
    }
  };
  const toProfile = () => {
    if (embedded) onClose?.();
  };

  const fqn = fq.trim().toLowerCase();
  let hits = 0;
  const msgs = items.map((m, k) => {
    const prev = items[k - 1];
    const day = newDay(prev?.at, m.at);
    const first = !prev || prev.me !== m.me || day;
    const hit = !fqn || m.text.toLowerCase().includes(fqn);
    if (fqn && hit) hits++;
    return { m, day, first, hit, gap: first && k > 0 && !day };
  });
  const pics = items.filter((m) => m.kind === "img" && m.path);
  const works = theirWorks.data ?? [];
  const showInfo = info && !!cur;
  const now = new Date();
  // Phones: a room opened by link shows its column while it loads (or says it is not there).
  const chv = (embedded ? "e" : "") + (cur || activeId ? "conv" : "list");

  const roomList = (
    <aside className="ch-list" aria-label="รายการแชท">
      <div className="ch-lh">
        <h1 lang="en">Chat</h1>
      </div>
      <div className="ch-q">
        <label htmlFor="ch-q" className="sc-sr">ค้นหาคน</label>
        <div>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4 4" />
          </svg>
          <input id="ch-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาคน" />
        </div>
      </div>
      <div role="group" aria-label="กรองแชท" lang="en" className="ch-filters">
        {(
          [
            ["all", "Messages"],
            ["req", `Requests${reqN ? ` ${reqN}` : ""}`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className="ch-chip"
            aria-pressed={filter === k}
            onClick={() => {
              setFilter(k);
              if (cur && (k === "req") !== cur.request) go(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {onReq && reqN > 0 ? <p className="ch-hint">ข้อความจากคนที่คุณยังไม่ได้ติดตาม เขาจะไม่รู้ว่าคุณอ่านแล้ว จนกว่าจะกด Accept</p> : null}
      {notice ? (
        <p role="status" className="ch-notice">
          {notice}
        </p>
      ) : null}
      <div className="ch-rows">
        {list.map((r) => (
          <button
            key={r.id}
            type="button"
            className="ch-row"
            aria-current={r.id === activeId ? "true" : undefined}
            aria-label={r.other.name + (r.unread ? " ยังไม่อ่าน" : "")}
            onClick={() => go(r.id)}
          >
            <Avatar room={r} size={52} />
            <span className="ch-rt">
              <span className="ch-r1">
                <span className="ch-name" data-unread={r.unread ? "" : undefined}>
                  {r.other.name}
                </span>
                {r.muted ? (
                  <svg role="img" aria-label="ปิดเสียงแล้ว" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="ch-mut">
                    <path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l1.5 2H8" />
                    <path d="M10 20.5a2 2 0 0 0 4 0M4 4l16 16" />
                  </svg>
                ) : null}
                <span className="ch-time">{listTime(r.lastAt, now)}</span>
              </span>
              <span className="ch-r2">
                <span className="ch-last" data-unread={r.unread ? "" : undefined}>
                  {(r.lastMine && r.last ? "คุณ: " : "") + r.last}
                </span>
                {r.unread ? <span aria-hidden="true" className="ch-dot" /> : null}
              </span>
            </span>
          </button>
        ))}
        {listError && !rooms.length ? <LoadError label="โหลดแชทไม่ขึ้น ลองใหม่อีกทีนะ" onRetry={() => void refetchList()} /> : null}
        {!loading && !listError && !list.length ? (
          <div className="ch-empty">
            <p>{query ? "ไม่มีแชทที่ตรงกัน" : onReq ? "ไม่มีคำขอใหม่" : "ยังไม่มีแชท ลองทักทายครีเอเตอร์ที่ชอบดูสิ"}</p>
            {!query && !onReq ? (
              <Link to={CREATORS} onClick={toProfile}>
                ไปดูครีเอเตอร์ในหน้าแรก
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );

  const bubble = (m: ChatMsg) => {
    if (m.kind === "img" && m.pending) return <Uploading url={m.localUrl} />;
    if (m.kind === "img" && m.path) return <Picture path={m.path} />;
    if (m.kind === "profile" && m.profile)
      return (
        <Link to={m.profile.href} className="ch-card-l ch-prof" onClick={toProfile}>
          <span aria-hidden="true" className="ch-av" style={{ width: 44, height: 44, ...bg(m.profile.avatar) }}>
            {m.profile.avatar ? null : m.profile.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="ch-wt">
            <span lang="en">Profile</span>
            <span>{m.profile.name}</span>
            {m.profile.field ? <span className="ch-cs">{m.profile.field}</span> : null}
          </span>
        </Link>
      );
    if (m.kind === "doc" && m.doc)
      return (
        <span className="ch-card-l ch-doc">
          <span aria-hidden="true" className="ch-doc-ic">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.4" strokeLinejoin="round">
              <path d="M6.5 3.5h7l4 4v13h-11z" />
              <path d="M13.5 3.5v4h4M9 12.5h6M9 16h4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="ch-wt">
            <span>{m.doc.kind}</span>
            <span>{m.doc.number || m.doc.kind}</span>
            {m.doc.title || m.doc.net ? (
              <span className="ch-cs">{[m.doc.title, m.doc.net ? baht(m.doc.net) : ""].filter(Boolean).join(" · ")}</span>
            ) : null}
          </span>
        </span>
      );
    if (m.kind === "object" && m.object) {
      const o = m.object;
      const inner = (
        <>
          {o.cover ? <span aria-hidden="true" className="ch-wth" style={bg(o.cover)} /> : null}
          <span className="ch-wt">
            <span>สินค้า</span>
            <span>{o.title}</span>
            {o.price || o.note ? <span className="ch-cs">{[o.price ? baht(o.price) : "", o.note].filter(Boolean).join(" · ")}</span> : null}
          </span>
        </>
      );
      return o.id ? (
        <Link to={`/object/${o.id}`} className="ch-work" onClick={toProfile}>
          {inner}
        </Link>
      ) : (
        <span className="ch-work">{inner}</span>
      );
    }
    if (m.kind === "exp" || (m.kind === "img" && !m.path))
      return (
        <span className="ch-exp">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8C8C5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
          </svg>
          รูปนี้หมดอายุแล้ว
        </span>
      );
    if (m.kind === "work" && m.work)
      return (
        <Link to={`/showcase/${m.work.id}`} className="ch-work" onClick={toProfile}>
          <span aria-hidden="true" className="ch-wth" style={bg(m.work.cover)} />
          <span className="ch-wt">
            <span lang="en">Work</span>
            <span>{m.work.title}</span>
          </span>
        </Link>
      );
    const ev = m.event;
    const text = m.text ? (
      <span className="ch-bub" data-me={m.me || undefined}>
        {m.text}
      </span>
    ) : null;
    if (!ev) return text;
    return (
      <span className="ch-stack" data-me={m.me || undefined}>
        {text}
        <Link to={`/exhibition/${ev.id}`} className="ch-card-l ch-ev" onClick={toProfile}>
          <span aria-hidden="true" className="ch-ev-th" style={bg(ev.cover)}>
            {ev.cover ? null : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
                <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
              </svg>
            )}
          </span>
          <span className="ch-wt">
            <span lang="en">Event</span>
            <span>{ev.title}</span>
            {ev.when ? <span className="ch-cs">{ev.when}</span> : null}
          </span>
        </Link>
      </span>
    );
  };

  const room = cur ? (
    <>
      <div className="ch-rh">
        <button type="button" className="ch-rb ch-back" aria-label="กลับไปรายการแชท" onClick={() => go(null)}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
        </button>
        <Link to={cur.other.href} className="ch-who" onClick={toProfile}>
          <Avatar room={cur} size={48} />
          <span className="ch-whot">
            <span className="ch-whon">{cur.other.name}</span>
            <span className="ch-whos">{(cur.other.field ? `${cur.other.field} · ` : "") + "ดูโปรไฟล์"}</span>
          </span>
        </Link>
        <button type="button" className="ch-rb ch-more" aria-label="ข้อมูลแชท" aria-expanded={info} data-on={info || undefined} onClick={() => setInfo((v) => !v)}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5.5" cy="12" r="1.4" />
            <circle cx="12" cy="12" r="1.4" />
            <circle cx="18.5" cy="12" r="1.4" />
          </svg>
        </button>
      </div>
      {find ? (
        <div className="ch-find">
          <label htmlFor="ch-f" className="sc-sr">ค้นหาในแชทนี้</label>
          <input id="ch-f" type="search" value={fq} onChange={(e) => setFq(e.target.value)} placeholder="ค้นหาในแชทนี้" />
          <span>{fqn ? (hits ? `${hits} ข้อความ` : "ไม่เจอ") : ""}</span>
        </div>
      ) : null}
      <div role="log" aria-live="polite" className="ch-log" ref={logRef}>
        {aboutWork ? (
          <Link to={`/showcase/${aboutWork.id}`} className="ch-about" onClick={toProfile}>
            <span aria-hidden="true" className="ch-about-th" style={bg(aboutWork.cover)} />
            <span className="ch-wt">
              <span>ทักจากงาน · ส่งข้อความแรกแล้วเขาจะเห็นงานนี้ด้วยนะ</span>
              <span>{aboutWork.title}</span>
            </span>
          </Link>
        ) : null}
        {msgsError && !items.length ? <LoadError label="โหลดข้อความไม่ขึ้น ลองใหม่อีกทีนะ" onRetry={() => void refetchMsgs()} /> : null}
        {!msgsLoading && !msgsError && !items.length ? <p className="ch-start">ลองบอกเขาสั้นๆ ว่าชอบอะไรในงานของเขา</p> : null}
        {msgs.map(({ m, day, first, hit, gap }) => (
          <div key={m.id} className="ch-m">
            {day ? <span className="ch-day">{dayWord(m.at, now)}</span> : null}
            <div className="ch-mr" data-me={m.me || undefined} data-gap={gap || undefined} data-miss={hit ? undefined : ""}>
              {m.me ? null : <Avatar room={cur} size={32} hidden={!first} />}
              {m.me ? (
                <span className="ch-t">
                  {m.pending ? (
                    <svg className="ch-clock" role="img" aria-label="กำลังส่ง" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A3A3A0" strokeWidth="1.8" strokeLinecap="round">
                      <circle cx="12" cy="12" r="8.5" />
                      <path className="hand" d="M12 12V7" />
                      <path d="M12 12h3.5" />
                    </svg>
                  ) : (
                    clock(m.at)
                  )}
                </span>
              ) : null}
              {bubble(m)}
              {m.me ? null : <span className="ch-t">{clock(m.at)}</span>}
            </div>
          </div>
        ))}
      </div>
      {cur.request && !lock ? (
        <div className="ch-req">
          <p>
            <span>{cur.other.name}</span> อยากทักทายคุณ
          </p>
          <div lang="en">
            <button type="button" className="ch-rq-rep" disabled={busy} aria-haspopup="dialog" onClick={() => setReporting(true)}>
              Report
            </button>
            <button type="button" className="ch-rq-ign" disabled={busy} onClick={() => removeCur(() => actions.ignore(cur.id), "")}>
              Ignore
            </button>
            <button
              type="button"
              className="ch-rq-ok"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await actions.accept(cur.id);
                  setFilter("all");
                })
              }
            >
              Accept
            </button>
          </div>
        </div>
      ) : lock ? (
        <p role="status" className="ch-lock">
          {lock}
        </p>
      ) : (
        <div className="ch-cmp">
          <label className="ch-rb" title="ส่งรูป">
            <span className="sc-sr">ส่งรูป</span>
            <input type="file" accept="image/*" onChange={pickImg} className="sc-sr" />
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
              <rect x="3.5" y="5" width="17" height="14" rx="3" />
              <circle cx="9" cy="10" r="1.6" />
              <path d="M5 17l4.5-4.5 3 3 2.5-2.5 4 4" />
            </svg>
          </label>
          <button type="button" className="ch-rb" aria-label="แชร์ผลงานของคุณ" title="แชร์ผลงาน" aria-expanded={share} data-on={share || undefined} onClick={() => setShare((v) => !v)}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
              <rect x="3.5" y="3.5" width="7" height="9" rx="1.5" />
              <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
              <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
              <rect x="3.5" y="15.5" width="7" height="5" rx="1.5" />
            </svg>
          </button>
          <label htmlFor="ch-in" className="sc-sr">
            พิมพ์ข้อความถึง {cur.other.name}
          </label>
          <textarea
            id="ch-in"
            ref={inRef}
            rows={1}
            value={draft}
            maxLength={4000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder="พิมพ์ข้อความ"
            autoComplete="off"
            enterKeyHint="send"
          />
          <button type="button" aria-label="ส่ง" className="ch-send" data-on={draft.trim() ? "" : undefined} onClick={send}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
          {share ? (
            <div role="menu" className="ch-shm" aria-label="เลือกผลงานที่จะแชร์">
              <p lang="en">Share your work</p>
              {(myWorks.data ?? []).map((w) => (
                <button key={w.id} type="button" role="menuitem" className="ch-row" onClick={() => sendWork(w)}>
                  <span aria-hidden="true" className="ch-shth" style={bg(w.cover)} />
                  <span>{w.title}</span>
                </button>
              ))}
              {myWorks.data && !myWorks.data.length ? <p className="ch-none">คุณยังไม่มีผลงาน</p> : null}
            </div>
          ) : null}
        </div>
      )}
    </>
  ) : activeId ? (
    <>
      <div className="ch-rh ch-rh-bare">
        <button type="button" className="ch-rb ch-back" aria-label="กลับไปรายการแชท" onClick={() => go(null)}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
        </button>
      </div>
      {roomQ.error ? (
        <LoadError label="โหลดแชทนี้ไม่ขึ้น ลองใหม่อีกทีนะ" onRetry={() => void roomQ.refetch()} />
      ) : roomQ.missing ? (
        <div className="ch-pick ch-gone" role="status">
          <p>ไม่พบบทสนทนานี้</p>
          <p>อาจถูกลบไปแล้ว หรือคุณไม่ได้อยู่ในแชทนี้</p>
          <button type="button" onClick={() => go(null)}>
            กลับไปรายการแชท
          </button>
        </div>
      ) : (
        <p className="ch-pick" role="status" aria-label="กำลังโหลดแชท">
          <span aria-hidden="true" className="ch-spin" />
        </p>
      )}
    </>
  ) : (
    <p className="ch-pick">เลือกแชททางซ้ายเพื่อเริ่มคุย</p>
  );

  const shownWorks = worksAll ? works : works.slice(0, 6);
  const infoPanel = (
    <aside className="ch-info" aria-label="ข้อมูลแชท" hidden={!showInfo}>
      {cur ? (
        <>
          <div className="ch-id">
            <Avatar room={cur} size={96} />
            <span className="ch-idn">{cur.other.name}</span>
            <span className="ch-idf">{cur.other.field}</span>
          </div>
          <div className="ch-acts">
            <Link to={cur.other.href} className="ch-act" onClick={toProfile}>
              <span className="ic">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="12" cy="9" r="3.5" />
                  <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
                </svg>
              </span>
              <span lang="en">Profile</span>
            </Link>
            <button type="button" className="ch-act" aria-pressed={cur.muted} onClick={() => void run(() => actions.setMuted(cur.id, !cur.muted))}>
              <span className="ic" data-on={cur.muted || undefined}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
                  <path d="M10 20.5a2 2 0 0 0 4 0" />
                </svg>
              </span>
              <span lang="en">{cur.muted ? "Unmute" : "Mute"}</span>
            </button>
            <button type="button" className="ch-act" aria-pressed={find} onClick={toggleFind}>
              <span className="ic">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="M16 16l4 4" />
                </svg>
              </span>
              <span lang="en">Search</span>
            </button>
          </div>
          <div className="ch-secs">
            <div className="ch-sw">
              <button type="button" className="ch-sec" lang="en" aria-expanded={sec.works} onClick={() => setSec((s) => ({ ...s, works: !s.works }))}>
                Works <Chevron open={sec.works} />
              </button>
              {sec.works ? (
                <div className="ch-sb">
                  {works.length ? (
                    <>
                      <div className="ch-grid">
                        {shownWorks.map((w) => (
                          <button key={w.id} type="button" className="ch-th" aria-label={`หยิบงาน ${w.title} มาคุย`} title={w.title} style={bg(w.cover)} onClick={() => sendWork(w)} />
                        ))}
                      </div>
                      {works.length > 6 ? (
                        <button type="button" className="ch-more-w" aria-expanded={worksAll} onClick={() => setWorksAll((v) => !v)}>
                          {worksAll ? "ย่อลง" : `ดูทั้งหมด (${works.length})`}
                        </button>
                      ) : null}
                    </>
                  ) : theirWorks.data ? (
                    <p className="ch-none">เขายังไม่มีผลงาน</p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="ch-sw">
              <button type="button" className="ch-sec" lang="en" aria-expanded={sec.media} onClick={() => setSec((s) => ({ ...s, media: !s.media }))}>
                <span className="ch-sect">
                  Media
                  <span className="ch-i" tabIndex={0} role="img" aria-label="รูปในแชทจะถูกลบอัตโนมัติหลัง 30 วัน" data-tip="รูปในแชทจะถูกลบอัตโนมัติหลัง 30 วัน">
                    <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <circle cx="12" cy="12" r="8.5" />
                      <path d="M12 11v5" />
                      <path d="M12 7.8v.01" strokeWidth="2.2" />
                    </svg>
                  </span>
                </span>{" "}
                <Chevron open={sec.media} />
              </button>
              {sec.media ? (
                <div className="ch-sb">
                  {pics.length ? (
                    <div className="ch-grid">
                      {pics.map((p) => (
                        <MediaThumb key={p.id} path={p.path!} />
                      ))}
                    </div>
                  ) : (
                    <p className="ch-none">ยังไม่มีรูปในแชทนี้</p>
                  )}
                </div>
              ) : null}
            </div>
            <div className="ch-sw ch-sw-last">
              <button type="button" className="ch-sec" lang="en" aria-expanded={sec.priv} onClick={() => setSec((s) => ({ ...s, priv: !s.priv }))}>
                Privacy &amp; support <Chevron open={sec.priv} />
              </button>
              {sec.priv ? (
                <div lang="en" className="ch-priv">
                  <button type="button" className="ch-mi" disabled={busy} onClick={() => removeCur(() => actions.block(cur), `บล็อก ${cur.other.name} แล้ว เขาจะทักคุณไม่ได้อีก`)}>
                    Block
                  </button>
                  <button type="button" className="ch-mi ch-mi-red" disabled={busy} aria-haspopup="dialog" onClick={() => setReporting(true)}>
                    Report
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </aside>
  );

  const card = (
    <div className="ch-wrap" data-info={showInfo || undefined}>
      <div className="ch-card" data-info={showInfo || undefined}>
        {roomList}
        <section className="ch-room" aria-label="ห้องคุย">
          {room}
        </section>
        {infoPanel}
      </div>
      <Link to={SC_LINKS.home} onClick={closeX} className="ch-rb ch-x" aria-label="ปิดหน้าแชท" title="ปิด">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </Link>
      {cur ? (
        <button
          type="button"
          className="ch-tab"
          aria-label={info ? "ซ่อนข้อมูลแชท" : "เปิดข้อมูลแชท"}
          title={info ? "ซ่อนข้อมูลแชท" : "เปิดข้อมูลแชท"}
          aria-expanded={info}
          data-on={info || undefined}
          onClick={() => setInfo((v) => !v)}
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 6l6 6-6 6" />
          </svg>
        </button>
      ) : null}
      {reporting && cur ? <ReportPicker name={cur.other.name} busy={busy} onSend={sendReport} onClose={() => setReporting(false)} /> : null}
    </div>
  );

  if (embedded) {
    return (
      <div className="pv-veil ch-veil">
        <div aria-hidden="true" className="ch-veil-hit" onClick={onClose} />
        <main className="pv-box ch-main ch-emb" data-chv={chv} role="dialog" aria-modal="true" aria-label="แชท">
          {card}
        </main>
      </div>
    );
  }
  return (
    <main className="sc-main ch-main" data-chv={chv}>
      {card}
    </main>
  );
}

/** `/chat` and `/chat/:id` (old URLs). Signed-out visitors go to log in. */
export default function Chat() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <main className="sc-main ch-main" />;
  if (!user) return <Navigate to={`${SC_LINKS.login}?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  return <ChatView />;
}
