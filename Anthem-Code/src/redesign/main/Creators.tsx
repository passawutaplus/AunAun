import { useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { proxiedImageUrl } from "@/lib/imageProxy";
import type { ScCategory } from "../lib/categories";
import { loginHref } from "../lib/loginHref";
import LoadError from "../shell/LoadError";
import { useGreet } from "../shell/panels";
import EmptyNote from "./EmptyNote";
import ScLoader from "./ScLoader";
import { useCreators, type Creator, type CreatorView } from "./useCreators";
import { useFollows } from "./useFollows";

const WEEK = 7 * 24 * 60 * 60 * 1000;

const Avatar = ({ src, size }: { src: string; size: 44 | 72 }) =>
  src ? (
    <img alt="" src={proxiedImageUrl(src, 256)} className={`cr-av cr-av-${size}`} loading="lazy" decoding="async" />
  ) : (
    <span aria-hidden="true" className={`cr-av cr-av-${size}`} />
  );

type FollowProps = { creator: Creator; followed: boolean; onToggle: (id: string) => void; onGreet: (id: string, el: HTMLElement) => void };

type Props = {
  view: CreatorView;
  category: ScCategory | null;
  /** The text filter (`?find=`). */
  find?: string;
  onClear?: () => void;
};

/**
 * Creators tab of the home page (mock: Main.dc.html, isCreators): "NEW THIS WEEK" strip and the
 * "ALL CREATORS" grid. No follower counts and nothing about hiring, by design.
 * "ทักทาย" (say hi) next to a followed creator opens the small chat window (ChatDock), or the chat page on phones.
 */
export default function Creators({ view, category, find = "", onClear }: Props) {
  const navigate = useNavigate();
  const { data, isPending, isError, refetch } = useCreators(find);
  const follows = useFollows();
  const greeting = useGreet();
  const onGreet = (id: string, el: HTMLElement) => greeting.greet({ otherId: id }, el);
  const trackRef = useRef<HTMLDivElement>(null);
  // Discover shows people in a different order on every visit, so nobody owns the top row.
  const seed = useRef(Math.random());

  const onToggle = (id: string) => {
    if (!follows.signedIn) navigate(loginHref());
    else follows.toggle(id);
  };

  const inCategory = useMemo(() => (data ?? []).filter((c) => !category || c.categories.includes(category)), [data, category]);

  const all = useMemo(() => {
    if (view === "following") return inCategory.filter((c) => follows.ids.has(c.id));
    if (view === "new") return [...inCategory].sort((a, b) => b.joinedAt - a.joinedAt);
    // stable shuffle for this visit: order by a hash of id and seed
    const key = (id: string) => {
      let h = Math.floor(seed.current * 2 ** 31);
      for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
      return h;
    };
    return [...inCategory].sort((a, b) => key(a.id) - key(b.id));
  }, [inCategory, view, follows.ids]);

  const fresh = useMemo(() => {
    if (view !== "discover") return [];
    const since = Date.now() - WEEK;
    return inCategory.filter((c) => c.joinedAt >= since).sort((a, b) => b.joinedAt - a.joinedAt);
  }, [inCategory, view]);

  const scroll = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * (el.clientWidth / 2 + 12), behavior: calm ? "auto" : "smooth" });
  };

  if (isPending) return <ScLoader label="กำลังโหลดผลงานเพิ่ม" />;
  if (isError && !data) return <LoadError onRetry={() => void refetch()} />;
  if (!all.length) return <EmptyNote text="ไม่เจอสิ่งที่ตรงกัน" action={onClear ? { label: "ล้างตัวกรอง", onClick: onClear } : null} />;

  return (
    <section aria-label="ครีเอเตอร์" className="cr">
      {fresh.length ? (
        <div className="cr-sec">
          <div className="cr-head">
            <h2 lang="en">NEW THIS WEEK</h2>
            <div className="cr-arrows">
              <button type="button" className="cr-arrow" aria-label="เลื่อนไปทางซ้าย" onClick={() => scroll(-1)}>
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 6l-6 6 6 6" />
                </svg>
              </button>
              <button type="button" className="cr-arrow" aria-label="เลื่อนไปทางขวา" onClick={() => scroll(1)}>
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.5 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
          <div className="cr-track" ref={trackRef}>
            {fresh.map((c) => (
              <NewCard key={c.id} creator={c} followed={follows.ids.has(c.id)} onToggle={onToggle} onGreet={onGreet} self={follows.selfId === c.id} />
            ))}
          </div>
        </div>
      ) : null}
      <div className="cr-sec">
        <div className="cr-head">
          <h2 lang="en">ALL CREATORS</h2>
        </div>
        <div className="cr-all">
          {all.map((c) => (
            <AllCard key={c.id} creator={c} followed={follows.ids.has(c.id)} onToggle={onToggle} onGreet={onGreet} self={follows.selfId === c.id} />
          ))}
        </div>
      </div>
      {greeting.error ? (
        <div role="status" className="cd-say">
          {greeting.error}
        </div>
      ) : null}
    </section>
  );
}

function NewCard({ creator: c, followed, onToggle, onGreet, self }: FollowProps & { self: boolean }) {
  return (
    <div className="cr-new">
      <span className="cr-new-av">
        <Link to={c.href} aria-label={`ไปที่โปรไฟล์ ${c.name}`} className="cr-av-link">
          <Avatar src={c.avatar} size={72} />
        </Link>
        {self ? null : (
          <button type="button" className="cr-badge" aria-label={`${followed ? "เลิกติดตาม" : "ติดตาม"} ${c.name}`} aria-pressed={followed} onClick={() => onToggle(c.id)}>
            {followed ? "✓" : "+"}
          </button>
        )}
      </span>
      <Link to={c.href} className="cr-who">
        <span className="cr-who-n">{c.name}</span>
        <span className="cr-who-s">{c.sub}</span>
      </Link>
      <div className="cr-hi">
        {followed && !self ? (
          <button type="button" className="cd-hi" onClick={(e) => onGreet(c.id, e.currentTarget)}>
            ทักทาย
          </button>
        ) : null}
      </div>
      <Link to={c.href} className="cr-th cr-th4" aria-label={`ผลงานของ ${c.name}`}>
        {c.covers.slice(0, 4).map((src) => (
          <img key={src} alt="" src={proxiedImageUrl(src, 256)} loading="lazy" decoding="async" />
        ))}
      </Link>
    </div>
  );
}

function AllCard({ creator: c, followed, onToggle, onGreet, self }: FollowProps & { self: boolean }) {
  return (
    <div className="cr-card">
      {/* One or two works fill the row instead of leaving empty space (owner 2026-11-28). */}
      <Link to={c.href} className="cr-th cr-th3" data-n={Math.min(3, Math.max(1, c.covers.length))} aria-label={`ผลงานของ ${c.name}`}>
        {c.covers.slice(0, 3).map((src) => (
          <img key={src} alt="" src={proxiedImageUrl(src, 384)} loading="lazy" decoding="async" />
        ))}
      </Link>
      <div className="cr-row">
        <Link to={c.href} aria-label={`ไปที่โปรไฟล์ ${c.name}`} className="cr-av-link">
          <Avatar src={c.avatar} size={44} />
        </Link>
        <Link to={c.href} className="cr-row-who">
          <span className="cr-row-n">{c.name}</span>
          <span className="cr-who-s">{c.sub}</span>
        </Link>
        {followed && !self ? (
          <button type="button" className="cd-hi" onClick={(e) => onGreet(c.id, e.currentTarget)}>
            ทักทาย
          </button>
        ) : null}
        {self ? null : (
          <button type="button" className="cr-follow" aria-label={`${followed ? "เลิกติดตาม" : "ติดตาม"} ${c.name}`} aria-pressed={followed} onClick={() => onToggle(c.id)}>
            {followed ? "✓" : "ติดตาม"}
          </button>
        )}
      </div>
    </div>
  );
}
