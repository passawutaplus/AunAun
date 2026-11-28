import { useMemo, useState, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { proxiedImageSrcSet, proxiedImageUrl } from "@/lib/imageProxy";
import type { StudioWork } from "@/server/queries/studio";
import { SC_LINKS } from "../routes";
import { count } from "../profile/tiles";
import EmptyNote from "../main/EmptyNote";
import { MAX_PINNED, inProfileOrder, useWorkOrder, type OrderedWork } from "./useStudio";
import "../styles/work-pin.css";

type Filter = "all" | "Published" | "Draft" | "Private";
const FILTERS: ReadonlyArray<readonly [Filter, string]> = [
  ["all", "All"],
  ["Published", "Published"],
  ["Draft", "Draft"],
  ["Private", "Private"],
];

export const editHref = (id: string) => `/portfolio/${id}/edit`;
export const coverOf = (w: Pick<StudioWork, "cover_url" | "gallery_urls">) => w.cover_url || w.gallery_urls?.[0] || "";
export const ratioOf = (w: Pick<StudioWork, "cover_width" | "cover_height">) => (w.cover_width && w.cover_height ? w.cover_width / w.cover_height : null);

const PinIcon = ({ fill = "none", stroke = "currentColor", size = 14 }: { fill?: string; stroke?: string; size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5M9 10.8a2 2 0 0 1-1.1 1.8l-1.8.9A2 2 0 0 0 5 15.2v.8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.8a2 2 0 0 0-1.1-1.8l-1.8-.9A2 2 0 0 1 15 10.8V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
  </svg>
);

/** Pinned work: pin + its place among the pinned ones (old site), top left of the card. */
export const PinMark = ({ n }: { n: number }) => (
  <span className="sc-pin-mark" title="ปักหมุดไว้">
    <PinIcon fill="#282929" />
    {n}
    <span className="sc-sr">ปักหมุดลำดับ {n}</span>
  </span>
);

/** A work card of the Studio: cover at its own ratio, title, status chip; children = tools or a picker button. */
export function StudioTile({ w, i, children, meta, pin, className = "pf-tile ms-tile", style }: { w: StudioWork; i: number; children?: React.ReactNode; meta?: string; pin?: number; className?: string; style?: CSSProperties }) {
  const cover = coverOf(w);
  const ratio = ratioOf(w);
  return (
    <div className={className} style={{ aspectRatio: String(ratio ?? 4 / 5), ...style }}>
      {cover ? (
        <img
          data-sc-work=""
          className="pf-art"
          src={proxiedImageUrl(cover, 640)}
          srcSet={proxiedImageSrcSet(cover, [384, 640, 828]) || undefined}
          sizes="(max-width: 600px) 50vw, 30vw"
          alt=""
          loading={i < 6 ? "eager" : "lazy"}
          decoding="async"
          style={ratio ? undefined : { objectFit: "contain" }}
        />
      ) : null}
      <span className="pf-art pf-shade" aria-hidden="true" />
      {pin ? <PinMark n={pin} /> : null}
      {w.status === "Draft" ? <span className="ms-stc ms-stc-draft">Draft</span> : w.status === "Private" ? <span className="ms-stc ms-stc-priv">Private</span> : null}
      <span className="pf-tt">
        <b>{w.title?.trim() || "Untitled"}</b>
        {meta ? <span>{meta}</span> : null}
      </span>
      {children}
    </div>
  );
}

/**
 * My Studio → Works: every own work with Edit and Delete (mock MyStudio "Works"). Lock/unlock stays in My Profile.
 * The card opens the work over this page, like My Profile; the two buttons sit above that link.
 * Works are in my profile's order. "จัดลำดับ" (old ManageProjectCard): pin up to 3, move earlier / later.
 */
export default function StudioWorks({ uid, works, onDelete, say }: { uid: string; works: StudioWork[]; onDelete: (w: StudioWork) => void; say: (t: string) => void }) {
  const location = useLocation();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [ordering, setOrdering] = useState(false);
  // While ordering, news goes in the bar at the bottom (a toast would sit on top of it).
  const [note, setNote] = useState("");
  const order = useWorkOrder(uid);
  const query = q.trim().toLocaleLowerCase("th");
  const ordered = useMemo(() => inProfileOrder(works), [works]);
  const pinNo = useMemo(() => new Map(ordered.filter((w) => w.is_pinned).map((w, n) => [w.id, n + 1])), [ordered]);
  const list = useMemo(
    () => ordered.filter((w) => (filter === "all" || w.status === filter) && (!query || (w.title ?? "").toLocaleLowerCase("th").includes(query))),
    [ordered, filter, query],
  );
  const linkState = useMemo(() => ({ backgroundLocation: location, scList: list.map((w) => w.id) }), [location, list]);

  const failed = () => setNote("บันทึกไม่สำเร็จ ลองอีกทีนะ");
  const togglePin = (w: OrderedWork) => {
    if (!w.is_pinned && pinNo.size >= MAX_PINNED) {
      setNote(`ปักหมุดได้สูงสุด ${MAX_PINNED} งานนะ`);
      return;
    }
    order.pin.mutate({ id: w.id, pinned: !w.is_pinned }, { onError: failed });
    setNote(w.is_pinned ? "เลิกปักหมุดแล้ว" : "ปักหมุดแล้ว อยู่บนสุดของโปรไฟล์เลย");
  };
  // Earlier / later only among works of the same kind (pinned ones always come first).
  const canMove = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    return j >= 0 && j < ordered.length && !!ordered[i].is_pinned === !!ordered[j].is_pinned;
  };
  const startOrdering = () => {
    setFilter("all");
    setQ("");
    setNote("");
    setOrdering(true);
  };
  const stopOrdering = () => {
    setOrdering(false);
    say("บันทึกลำดับแล้ว");
  };

  if (ordering) {
    return (
      <>
        <div className="ms-bar">
          <button type="button" className="ms-pill ms-pill-on" aria-pressed="true" onClick={stopOrdering}>
            จัดลำดับ
          </button>
        </div>
        <div className="pf-pin">
          {ordered.map((w, i) => {
            const name = w.title?.trim() || "Untitled";
            return (
              <StudioTile key={w.id} w={w} i={i}>
                <div className="ms-tools">
                  <button
                    type="button"
                    className="ms-tl2"
                    aria-pressed={!!w.is_pinned}
                    aria-label={`${w.is_pinned ? "เลิกปักหมุด" : "ปักหมุด"} ${name}`}
                    title={w.is_pinned ? "เลิกปักหมุด" : "ปักหมุด"}
                    onClick={() => togglePin(w)}
                  >
                    <PinIcon size={16} fill={w.is_pinned ? "#282929" : "none"} stroke={w.is_pinned ? "#282929" : "rgba(255,255,255,.85)"} />
                  </button>
                  <button type="button" className="ms-tl2" disabled={!canMove(i, -1)} aria-label={`เลื่อน ${name} ขึ้นก่อน`} title="เลื่อนขึ้นก่อน" onClick={() => order.move(ordered, w.id, -1, { onError: failed })}>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 19V5M6 11l6-6 6 6" />
                    </svg>
                  </button>
                  <button type="button" className="ms-tl2" disabled={!canMove(i, 1)} aria-label={`เลื่อน ${name} ไปทีหลัง`} title="เลื่อนไปทีหลัง" onClick={() => order.move(ordered, w.id, 1, { onError: failed })}>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M6 13l6 6 6-6" />
                    </svg>
                  </button>
                </div>
              </StudioTile>
            );
          })}
        </div>
        <div className="ms-catbar" role="toolbar" aria-label="จัดลำดับผลงาน">
          <span role="status">{note || "ลำดับนี้คือที่โชว์ในโปรไฟล์"}</span>
          <button type="button" onClick={stopOrdering}>
            เสร็จ
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="ms-bar">
        {FILTERS.map(([k, label]) => (
          <button key={k} type="button" className={filter === k ? "ms-pill ms-pill-on" : "ms-pill"} aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
        {works.length > 1 ? (
          <button type="button" className="ms-pill" aria-pressed="false" onClick={startOrdering}>
            จัดลำดับ
          </button>
        ) : null}
        <span className="ms-grow" />
        <label className="ms-search">
          <span className="ms-sr">ค้นหาผลงาน</span>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4 4" />
          </svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา" />
        </label>
      </div>
      <div className="pf-pin">
        {filter === "all" && !query ? (
          <Link to={SC_LINKS.upload} className="ms-addt">
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>ลงงาน</span>
          </Link>
        ) : null}
        {list.map((w, i) => (
          <StudioTile key={w.id} w={w} i={i} pin={pinNo.get(w.id)} meta={w.status === "Published" ? `${count(w.views ?? 0)} views` : ""}>
            <Link to={`/showcase/${w.id}`} state={linkState} className="pf-open" aria-label={`เปิด ${w.title?.trim() || "Untitled"}`} />
            <div className="ms-tools">
              <Link to={editHref(w.id)} className="ms-tl2" aria-label={`แก้ไข ${w.title ?? ""}`} title="แก้ไข">
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20h4L19 9l-4-4L4 16z" />
                  <path d="M13.5 6.5l4 4" />
                </svg>
              </Link>
              <button type="button" className="ms-tl2" aria-label={`ลบ ${w.title ?? ""}`} title="ลบ" onClick={() => onDelete(w)}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />
                </svg>
              </button>
            </div>
          </StudioTile>
        ))}
      </div>
      {list.length ? null : works.length ? (
        <EmptyNote text="ไม่เจองานที่ตรงกัน" />
      ) : (
        <EmptyNote text="ยังไม่มีผลงานเลย ลงงานแรกกันนะ" />
      )}
    </>
  );
}
