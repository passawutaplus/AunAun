import {
  forwardRef,
  Fragment,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { SC_LINKS } from "../routes";
import { usePresence } from "../lib/usePresence";
import { clock, dayWord, listTime, newDay } from "../chat/chatFormat";
import ChatTools from "../chat/ChatTools";
import { PlanCard } from "../chat/CollabCards";
import DocCardView, { OfferCardView } from "../chat/DocCard";
import ReportPicker from "../chat/ReportPicker";
import {
  chatMsgQuote,
  useChatActions,
  useChatRoom,
  useChatRooms,
  useRoomLock,
  useRoomMessages,
  useUnreadRooms,
  type ChatMsg,
  type ChatRoom,
  type ChatWork,
} from "../chat/useChatStore";
import { getBackgroundLocation } from "@/lib/projectOverlay";
import LoadError from "./LoadError";
import { onEscape, workOverlayOpen } from "./panels";
import "../styles/chat-dock.css";

/** Big chat popup = the chat page itself, embedded (mock: dc-import name="Chat" embedded). */
const ChatView = lazy(() => import("../pages/Chat").then((m) => ({ default: m.ChatView })));

export type ChatDockHandle = {
  /** Small chat window with this room (mock greet-signal); `work` puts the "ทักจากงาน" card on top. */
  openRoom: (roomId: string, work: ChatWork | null, opener?: HTMLElement | null) => void;
  /** Big chat popup over the page (mock open-signal, "เปิดแชทหน้าต่างใหญ่"). */
  openBig: (roomId: string | null, opener?: HTMLElement | null) => void;
  /** Another shell popup opened (mock: listOpen false). */
  closeList: () => void;
};

const CREATORS = `${SC_LINKS.home}?tab=creators`;
const MAX_MINS = 3;
const REPORTED = "ส่งรายงานแล้ว ทีมงานจะตรวจสอบให้นะ";

const bg = (url: string) => (url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined);
const plainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/** Words for a message in the small window (mock ChatStore.label): pictures and cards as short text. */
const label = (m: ChatMsg) => {
  if (m.kind === "work") return `แชร์ผลงาน ${m.work?.title ?? m.text}`.trim();
  if (m.kind === "img" && m.pending) return "กำลังส่งรูป…";
  if (m.kind === "profile") return `แชร์โปรไฟล์ ${m.profile?.name ?? ""}`.trim();
  return m.text;
};

/** Where a card in the small window leads (work, profile, product), or null for plain words. */
const cardHref = (m: ChatMsg): string | null => {
  if (m.kind === "work" && m.work) return `/showcase/${m.work.id}`;
  if (m.kind === "profile" && m.profile) return m.profile.href;
  if (m.kind === "object" && m.object?.id) return `/object/${m.object.id}`;
  return null;
};

function Face({ room, size, hidden }: { room: ChatRoom; size: number; hidden?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="cd-av"
      style={{ width: size, height: size, visibility: hidden ? "hidden" : undefined, ...bg(room.other.avatar) }}
    />
  );
}

const ChatIcon = () => (
  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.4" strokeLinejoin="round">
    <path d="M12 3.5a8.5 8.5 0 0 1 0 17c-1.5 0-2.9-.4-4.1-1L3.5 20.5l1.1-4.2A8.5 8.5 0 0 1 12 3.5z" />
  </svg>
);

const CloseIcon = ({ size = 16, stroke = "currentColor", width = 1.5 }: { size?: number; stroke?: string; width?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const BigIcon = ({ size }: { size: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
  </svg>
);

/**
 * Floating chat of the new design (mock: pages/ChatDock.dc.html): round button → room list "Chat"; a room opens in
 * the small window on the bottom edge; minimised rooms wait as faces above the button; "เปิดแชทหน้าต่างใหญ่" and the
 * header chat icon open the big popup (the Chat page, embedded). Hidden on phones (≤600px), which use /chat.
 */
const ChatDock = forwardRef<ChatDockHandle>(function ChatDock(_props, ref) {
  const location = useLocation();
  // A work opening over the page (or closing again) is not "another page": the popups stay.
  const page = getBackgroundLocation(location.state)?.pathname ?? location.pathname;
  const unread = useUnreadRooms();
  const actions = useChatActions();

  const list = usePresence(180);
  const win = usePresence(180);
  const { open: openList, close: closeList } = list;
  const { open: openWin, close: closeWin } = win;
  /** Room of the small window (kept while it fades out). */
  const [active, setActive] = useState<string | null>(null);
  const [mins, setMins] = useState<string[]>([]);
  /** "ทักจากงาน": the work a greeting came from, per room (this visit only, like the mock), until the first message takes it along. */
  const [works, setWorks] = useState<Record<string, ChatWork>>({});
  const [big, setBig] = useState<{ room: string | null; work: ChatWork | null } | null>(null);
  const [reporting, setReporting] = useState(false);
  /** Reply: the message the next text answers (bar above the text box). */
  const [replyTo, setReplyTo] = useState<{ id: string; mine: boolean; text: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "req">("all");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [winErr, setWinErr] = useState("");
  const [busy, setBusy] = useState(false);
  const noticeTimer = useRef<number | undefined>(undefined);
  const fabRef = useRef<HTMLButtonElement>(null);
  const qRef = useRef<HTMLInputElement>(null);
  const inRef = useRef<HTMLTextAreaElement>(null);
  const winRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const { rooms, loading, error: listError, refetch: refetchList } = useChatRooms(list.mounted || win.mounted || mins.length > 0);
  const byId = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const openId = win.isOpen ? active : null;
  // A room that is not in the newest 100 is read by itself (same as the Chat page).
  const { room: winRoom } = useChatRoom(win.mounted ? active : null, { rooms, loading });
  const cur = win.mounted && active ? winRoom : null;
  const curId = cur?.id ?? null;
  const lock = useRoomLock(cur);
  const { items, loading: msgsLoading, error: msgsError, refetch: refetchMsgs } = useRoomMessages(curId);

  const say = (text: string) => {
    window.clearTimeout(noticeTimer.current);
    setNotice(text);
    if (text) noticeTimer.current = window.setTimeout(() => setNotice(""), 2600);
  };
  /** A chat tool's words, in the small window (the list is not in view there). */
  const winTimer = useRef<number | undefined>(undefined);
  const sayWin = (text: string) => {
    window.clearTimeout(winTimer.current);
    setWinErr(text);
    winTimer.current = window.setTimeout(() => setWinErr(""), 2600);
  };
  useEffect(() => () => window.clearTimeout(winTimer.current), []);
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const focusBack = () => {
    const el = opener.current;
    (el && el.isConnected ? el : fabRef.current)?.focus();
  };

  /** Mock openConv: the room opens in the small window; the one that was open waits as a face. */
  const openConv = (id: string) => {
    setMins((m) => [...m.filter((k) => k !== id), ...(openId && openId !== id ? [openId] : [])].slice(-MAX_MINS));
    if (id !== openId) {
      setDraft("");
      setWinErr("");
      setReporting(false);
      setReplyTo(null);
    }
    setActive(id);
    closeList();
    openWin();
  };

  const minimize = () => {
    if (active) setMins((m) => [...m.filter((k) => k !== active), active].slice(-MAX_MINS));
    closeWin();
    focusBack();
  };

  const closeRoom = () => {
    closeWin();
    focusBack();
  };

  /** Ignore / Report: the room leaves; the list comes back with the notice (mock removeConv). */
  const removeConv = (id: string, text: string) => {
    setMins((m) => m.filter((k) => k !== id));
    closeWin();
    openList();
    say(text);
  };

  const openBig = (roomId: string | null, el?: HTMLElement | null) => {
    opener.current = el ?? null;
    closeList();
    closeWin();
    setBig({ room: roomId, work: roomId ? works[roomId] ?? null : null });
  };

  const closeBig = useCallback(() => {
    setBig(null);
    const el = opener.current;
    (el && el.isConnected ? el : fabRef.current)?.focus();
  }, []);

  useImperativeHandle(ref, () => ({
    openRoom: (roomId, work, el) => {
      opener.current = el ?? null;
      if (work) setWorks((w) => ({ ...w, [roomId]: work }));
      setBig(null);
      openConv(roomId);
    },
    openBig,
    closeList,
  }));

  // Another page: the popups close (minimised faces stay).
  useEffect(() => {
    closeList();
    closeWin();
    setBig(null);
  }, [page, closeList, closeWin]);

  // Esc while the focus is elsewhere on the page. A work open over the page answers first (the chat waits for the next Esc).
  const anyOpen = list.isOpen || win.isOpen;
  useEffect(
    () =>
      anyOpen
        ? onEscape(() => {
            if (workOverlayOpen()) return;
            closeList();
            closeWin();
          })
        : undefined,
    [anyOpen, closeList, closeWin],
  );

  // Inside a popup, Esc closes only that popup (not the work open behind it).
  const escList = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    closeList();
    fabRef.current?.focus();
  };
  const escWin = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || e.nativeEvent.isComposing) return;
    e.stopPropagation();
    closeRoom();
  };

  useEffect(() => {
    if (list.isOpen) qRef.current?.focus();
  }, [list.isOpen]);

  // A room opens: the text field (or Accept for a request) takes the focus.
  const curReady = !!cur;
  useEffect(() => {
    if (openId && curReady) winRef.current?.querySelector<HTMLElement>("#cd-input, .cd-rq-btn")?.focus();
  }, [openId, curReady]);

  // Opening a room reads it (a request is only "seen" until Accept, so the sender does not learn it was read).
  const readKey = cur && win.isOpen ? `${cur.id}:${cur.unread}:${cur.request}` : "";
  useEffect(() => {
    if (cur && win.isOpen && (cur.unread || cur.request)) void actions.openRoom(cur).catch(() => undefined);
  }, [readKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // The newest message stays in view.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [curId, items.length]);

  // The text box grows with the lines (Shift+Enter), up to its max height in chat-dock.css.
  useLayoutEffect(() => {
    const el = inRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, curId]);

  const work = cur ? works[cur.id] ?? null : null;
  /** The greeting's work, until it is in the room (the other person then sees it as a work card). */
  const aboutWork = work && !items.some((m) => m.work?.id === work.id) ? work : null;

  const send = async () => {
    const text = draft.trim();
    if (!cur || !text || lock) return;
    const roomId = cur.id;
    const about = aboutWork;
    const answer = replyTo;
    setDraft("");
    setWinErr("");
    setReplyTo(null);
    try {
      await actions.sendText(roomId, text, { about, replyTo: answer?.id });
      if (about)
        setWorks((w) => {
          const next = { ...w };
          delete next[roomId];
          return next;
        });
    } catch (e) {
      setWinErr(errText(e, "ส่งไม่สำเร็จ ลองอีกครั้ง"));
      setDraft((d) => d || text);
      setReplyTo((r) => r ?? answer);
    }
  };

  const startReply = (m: ChatMsg) => {
    setReplyTo({ id: m.id, mine: m.me, text: chatMsgQuote(m) });
    inRef.current?.focus();
  };

  const unsend = (m: ChatMsg) => {
    if (!cur) return;
    if (replyTo?.id === m.id) setReplyTo(null);
    setWinErr("");
    void actions.unsend(cur.id, m).catch((e: unknown) => setWinErr(errText(e, "ยกเลิกไม่สำเร็จ ลองอีกครั้ง")));
  };

  /** Tap a quote → the message it answers (when it is among the loaded ones). */
  const jump = (id: string) => {
    const el = logRef.current?.querySelector<HTMLElement>(`[data-mid="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.dataset.hl = "";
    window.setTimeout(() => delete el.dataset.hl, 1500);
  };

  const run = async (job: () => Promise<void>, done: () => void) => {
    setBusy(true);
    setWinErr("");
    try {
      await job();
      done();
    } catch (e) {
      setWinErr(errText(e, "ทำรายการไม่สำเร็จ ลองอีกครั้ง"));
    } finally {
      setBusy(false);
    }
  };

  const now = new Date();
  const term = q.trim().toLowerCase();
  const onReq = filter === "req";
  const reqN = rooms.filter((r) => r.request).length;
  const rows = rooms.filter((r) => (onReq ? r.request : !r.request) && (!term || r.other.name.toLowerCase().includes(term)));
  const faces = mins.map((id) => byId.get(id)).filter((r): r is ChatRoom => !!r);

  const bigLink = (roomId: string | null) => (e: MouseEvent) => {
    if (!plainClick(e)) return;
    e.preventDefault();
    openBig(roomId, opener.current);
  };

  return (
    <>
      {list.mounted ? (
        <div className="cd-list pv-rise" role="dialog" aria-label="ข้อความ" data-leaving={list.leaving ? "" : undefined} onKeyDown={escList}>
          <div className="cd-list-hd">
            <h2 lang="en">Chat</h2>
            <Link to={SC_LINKS.chat} className="cd-ib" aria-label="เปิดแชทหน้าต่างใหญ่" title="เปิดแชทหน้าต่างใหญ่" onClick={bigLink(null)}>
              <BigIcon size={16} />
            </Link>
            <button
              type="button"
              className="cd-ib"
              aria-label="ปิดรายการแชท"
              title="ปิด"
              onClick={() => {
                closeList();
                fabRef.current?.focus();
              }}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="cd-q">
            <label htmlFor="cd-q" className="cd-sr">ค้นหาคน</label>
            <div className="cd-q-in">
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4 4" />
              </svg>
              <input ref={qRef} id="cd-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาคน" />
            </div>
          </div>
          <div role="group" aria-label="กรองแชท" className="cd-chips">
            {(
              [
                ["all", "Messages"],
                ["req", `Requests${reqN ? ` ${reqN}` : ""}`],
              ] as const
            ).map(([k, text]) => (
              <button key={k} type="button" lang="en" className="cd-chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
                {text}
              </button>
            ))}
          </div>
          {onReq && reqN > 0 ? <p className="cd-hint">ข้อความจากคนที่คุณยังไม่ได้ติดตาม เขาจะไม่รู้ว่าคุณอ่านแล้ว จนกว่าคุณจะกด Accept</p> : null}
          {notice ? (
            <p role="status" className="cd-note">
              {notice}
            </p>
          ) : null}
          <div className="cd-rows">
            {rows.map((r) => (
              <button key={r.id} type="button" className="cd-row" aria-label={`${r.other.name}${r.unread ? " ยังไม่อ่าน" : ""}`} onClick={() => openConv(r.id)}>
                <Face room={r} size={44} />
                <span className="cd-row-tx">
                  <span className="cd-row-l1">
                    <span className="cd-row-n" data-unread={r.unread ? "" : undefined}>{r.other.name}</span>
                {r.kind === "collab" ? (
                  <span lang="en" className="ct-tag">
                    Collab
                  </span>
                ) : null}
                    {r.muted ? (
                      <svg role="img" aria-label="ปิดเสียงแล้ว" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l1.5 2H8" />
                        <path d="M10 20.5a2 2 0 0 0 4 0M4 4l16 16" />
                      </svg>
                    ) : null}
                    <span className="cd-row-t">{listTime(r.lastAt, now)}</span>
                  </span>
                  <span className="cd-row-l2">
                    <span className="cd-row-last" data-unread={r.unread ? "" : undefined}>
                      {r.last ? `${r.lastMine ? "คุณ: " : ""}${r.last}` : "ยังไม่มีข้อความ"}
                    </span>
                    {r.unread ? (
                      <span aria-hidden="true" className="cd-row-un">
                        {r.unread}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            ))}
            {listError && !rooms.length ? <LoadError label="โหลดแชทไม่ขึ้น ลองใหม่อีกทีนะ" onRetry={() => void refetchList()} /> : null}
            {!loading && !listError && !rows.length ? (
              <div className="cd-empty">
                <p>{term ? "ไม่มีแชทที่ตรงกัน" : onReq ? "ไม่มีคำขอใหม่" : "ยังไม่มีแชท ลองทักทายครีเอเตอร์ที่ชอบดูสิ"}</p>
                {!term && !onReq ? <Link to={CREATORS}>ไปดูครีเอเตอร์ในหน้าแรก</Link> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {cur ? (
        <div
          ref={winRef}
          className="cd-win pv-rise"
          role="dialog"
          aria-label={`แชทกับ ${cur.other.name}`}
          data-leaving={win.leaving ? "" : undefined}
          onKeyDown={escWin}
        >
          <div className="cd-win-hd">
            <Face room={cur} size={36} />
            <Link to={cur.other.href} className="cd-who" onClick={() => closeWin()}>
              <span className="cd-who-n">{cur.other.name}</span>
              <span className="cd-who-s">{cur.other.field ? `${cur.other.field} · ดูโปรไฟล์` : "ดูโปรไฟล์"}</span>
            </Link>
            <Link to={`${SC_LINKS.chat}/${cur.id}`} className="cd-ib cd-big" aria-label="เปิดแชทหน้าต่างใหญ่" title="เปิดแชทหน้าต่างใหญ่" onClick={bigLink(cur.id)}>
              <BigIcon size={15} />
            </Link>
            <button type="button" className="cd-ib cd-min" aria-label="ย่อแชท" title="ย่อ" onClick={minimize}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M5 12h14" />
              </svg>
            </button>
            <button type="button" className="cd-ib" aria-label="ปิดแชท" title="ปิด" onClick={closeRoom}>
              <CloseIcon />
            </button>
          </div>
          <div ref={logRef} role="log" aria-live="polite" className="cd-log">
            {aboutWork ? (
              <Link to={`/showcase/${aboutWork.id}`} className="cd-work">
                {aboutWork.cover ? <img src={aboutWork.cover} alt="" className="cd-work-img" /> : <span aria-hidden="true" className="cd-work-img" />}
                <span className="cd-work-tx">
                  <span className="cd-work-k">ทักจากงาน · ส่งข้อความแรกแล้วเขาจะเห็นงานนี้ด้วย</span>
                  <span className="cd-work-t">{aboutWork.title}</span>
                </span>
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : null}
            {msgsError && !items.length ? <LoadError label="โหลดข้อความไม่ขึ้น ลองใหม่อีกทีนะ" onRetry={() => void refetchMsgs()} /> : null}
            {!msgsLoading && !msgsError && !items.length ? <p className="cd-nomsg">ลองบอกเขาสั้นๆ ว่าชอบอะไรในงานนี้</p> : null}
            {items.map((m, k) => {
              const prev = items[k - 1];
              const day = newDay(prev?.at, m.at);
              const first = !prev || prev.me !== m.me || day;
              const href = cardHref(m);
              const words = label(m);
              const q = m.replyTo;
              const canWrite = !cur.request && !lock;
              return (
                <Fragment key={m.id}>
                  {day ? <span className="cd-day">{dayWord(m.at, now)}</span> : null}
                  <div className="cd-msg" data-mid={m.id} data-me={m.me ? "" : undefined} data-gap={first && k && !day ? "" : undefined}>
                    {m.me ? (
                      <span className="cd-st">
                        {m.pending ? (
                          <span title="กำลังส่ง">
                            <svg className="cd-clock" role="img" aria-label="กำลังส่ง" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.8" strokeLinecap="round">
                              <circle cx="12" cy="12" r="8.5" />
                              <path className="hand" d="M12 12V7" />
                              <path d="M12 12h3.5" />
                            </svg>
                          </span>
                        ) : (
                          <span title="ส่งแล้ว">
                            <svg role="img" aria-label="ส่งแล้ว" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12.5l4.5 4.5L19 7.5" />
                            </svg>
                          </span>
                        )}
                        <span>{clock(m.at)}</span>
                      </span>
                    ) : (
                      <Face room={cur} size={28} hidden={!first} />
                    )}
                    {m.kind === "doc" && m.doc ? (
                      <DocCardView doc={m.doc} compact />
                    ) : m.kind === "offer" && m.offer ? (
                      <OfferCardView offer={m.offer} compact />
                    ) : m.kind === "plan" ? (
                      <PlanCard room={cur} say={sayWin} compact />
                    ) : m.kind === "collab" ? (
                      // The invite is answered in the big chat (its card has room for the buttons).
                      <Link to={`${SC_LINKS.chat}/${cur.id}`} className="cd-bub cd-bub-link" onClick={bigLink(cur.id)}>
                        {m.me ? `คุณชวน ${cur.other.name} คอลแลป` : `${cur.other.name} ชวนคุณคอลแลป`}
                      </Link>
                    ) : m.kind === "gone" ? (
                      <span className="cd-bub cd-unsent">{words}</span>
                    ) : href ? (
                      <Link to={href} className="cd-bub cd-bub-link">
                        {words}
                      </Link>
                    ) : q ? (
                      <span className="cd-bub">
                        <button type="button" className="cd-quote" aria-label={`ไปที่ข้อความที่ตอบ: ${q.text}`} onClick={() => jump(q.id)}>
                          <span>{q.mine ? "คุณ" : cur.other.name}</span>
                          <span>{q.text}</span>
                        </button>
                        {words}
                      </span>
                    ) : m.event ? (
                      <span className="cd-stack">
                        {words ? <span className="cd-bub">{words}</span> : null}
                        <Link to={`/exhibition/${m.event.id}`} className="cd-bub cd-bub-link">
                          {`อีเวนต์ ${m.event.title}`}
                        </Link>
                      </span>
                    ) : (
                      <span className="cd-bub">{words}</span>
                    )}
                    {m.me ? null : <span className="cd-t">{clock(m.at)}</span>}
                    {m.pending || m.kind === "gone" || (!canWrite && !m.canUnsend) ? null : (
                      <span className="cd-macts" data-me={m.me ? "" : undefined}>
                        {canWrite ? (
                          <button type="button" className="cd-mact" aria-label="ตอบกลับข้อความนี้" title="ตอบกลับ" onClick={() => startReply(m)}>
                            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9.5 7L4.5 12l5 5" />
                              <path d="M4.5 12H14a5.5 5.5 0 0 1 5.5 5.5V19" />
                            </svg>
                          </button>
                        ) : null}
                        {m.canUnsend ? (
                          <button type="button" className="cd-mact" aria-label="ยกเลิกการส่งข้อความนี้" title="ยกเลิกการส่ง" onClick={() => unsend(m)}>
                            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />
                            </svg>
                          </button>
                        ) : null}
                      </span>
                    )}
                  </div>
                </Fragment>
              );
            })}
          </div>
          {winErr ? (
            <p role="status" className="cd-win-note">
              {winErr}
            </p>
          ) : null}
          {cur.request && !lock ? (
            <div className="cd-rq">
              <p>
                <b>{cur.other.name}</b> อยากทักทายคุณ
              </p>
              <div lang="en" className="cd-rq-acts">
                <button
                  type="button"
                  className="cd-rq-btn"
                  data-k="accept"
                  disabled={busy}
                  onClick={() => {
                    setFilter("all");
                    void run(() => actions.accept(cur.id), () => undefined);
                  }}
                >
                  Accept
                </button>
                <button type="button" className="cd-rq-btn" disabled={busy} onClick={() => void run(() => actions.ignore(cur.id), () => removeConv(cur.id, ""))}>
                  Ignore
                </button>
                <button
                  type="button"
                  className="cd-rq-btn"
                  data-k="report"
                  disabled={busy}
                  aria-haspopup="dialog"
                  onClick={() => setReporting(true)}
                >
                  Report
                </button>
              </div>
            </div>
          ) : lock ? (
            <p role="status" className="cd-lock">
              {lock}
            </p>
          ) : (
            <>
            {replyTo ? (
              <div className="cd-replybar" role="status">
                <span className="cd-replybar-t">
                  <span>{replyTo.mine ? "ตอบกลับข้อความของคุณ" : `ตอบกลับ ${cur.other.name}`}</span>
                  <span>{replyTo.text}</span>
                </span>
                <button type="button" className="cd-ib" aria-label="ยกเลิกการตอบกลับ" title="ยกเลิก" onClick={() => setReplyTo(null)}>
                  <CloseIcon size={14} />
                </button>
              </div>
            ) : null}
            <div className="cd-comp">
              <ChatTools small room={cur} say={sayWin} onOpenRoom={(id) => openConv(id)} />
              <label htmlFor="cd-input" className="cd-sr">{`พิมพ์ข้อความถึง ${cur.other.name}`}</label>
              <textarea
                id="cd-input"
                ref={inRef}
                rows={1}
                value={draft}
                maxLength={4000}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  // Enter sends, Shift+Enter is a new line (not while a Thai / IME word is being composed).
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send();
                  }
                  // Esc while replying drops the reply first (the window stays open).
                  if (e.key === "Escape" && replyTo && !e.nativeEvent.isComposing) {
                    e.stopPropagation();
                    setReplyTo(null);
                  }
                }}
                placeholder="พิมพ์ข้อความ"
                enterKeyHint="send"
              />
              <button type="button" className="cd-send" aria-label="ส่ง" data-on={draft.trim() ? "" : undefined} onClick={() => void send()}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
            </>
          )}
          {reporting ? (
            <ReportPicker
              name={cur.other.name}
              busy={busy}
              onClose={() => setReporting(false)}
              onSend={(reason) =>
                void run(
                  () => actions.report(cur, reason),
                  () => {
                    setReporting(false);
                    removeConv(cur.id, REPORTED);
                  },
                )
              }
            />
          ) : null}
        </div>
      ) : null}

      {!list.mounted && faces.length ? (
        <div className="cd-mins">
          {faces.map((r) => (
            <button key={r.id} type="button" className="cd-face" aria-label={`เปิดแชทกับ ${r.other.name}`} title={r.other.name} style={bg(r.other.avatar)} onClick={(e) => {
              opener.current = e.currentTarget;
              openConv(r.id);
            }}>
              {r.unread ? (
                <span className="cd-badge" aria-hidden="true">
                  {r.unread}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {big ? (
        <Suspense fallback={null}>
          <ChatView embedded onClose={closeBig} initialRoomId={big.room} greetWork={big.work} />
        </Suspense>
      ) : null}

      <button
        ref={fabRef}
        type="button"
        className="cd-fab"
        aria-label={list.isOpen ? "ปิดรายการแชท" : `ข้อความ${unread ? ` ยังไม่อ่าน ${unread}` : ""}`}
        aria-haspopup="dialog"
        aria-expanded={list.isOpen}
        onClick={() => {
          if (list.isOpen) closeList();
          else {
            opener.current = fabRef.current;
            openList();
          }
        }}
      >
        {list.isOpen ? (
          <CloseIcon size={18} stroke="#FFFFFF" width={1.6} />
        ) : (
          <>
            <ChatIcon />
            {unread ? (
              <span className="cd-badge" aria-hidden="true">
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </>
        )}
      </button>
    </>
  );
});

export default ChatDock;
