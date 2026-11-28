import { useMemo, useState, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { proxiedImageSrcSet, proxiedImageUrl } from "@/lib/imageProxy";
import type { StudioWork } from "@/server/queries/studio";
import { SC_LINKS } from "../routes";
import { count } from "../profile/tiles";
import EmptyNote from "../main/EmptyNote";

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

/** A work card of the Studio: cover at its own ratio, title, status chip; children = tools or a picker button. */
export function StudioTile({ w, i, children, meta, className = "pf-tile ms-tile", style }: { w: StudioWork; i: number; children?: React.ReactNode; meta?: string; className?: string; style?: CSSProperties }) {
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
 */
export default function StudioWorks({ works, onDelete }: { works: StudioWork[]; onDelete: (w: StudioWork) => void }) {
  const location = useLocation();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const query = q.trim().toLocaleLowerCase("th");
  const list = useMemo(
    () => works.filter((w) => (filter === "all" || w.status === filter) && (!query || (w.title ?? "").toLocaleLowerCase("th").includes(query))),
    [works, filter, query],
  );
  const linkState = useMemo(() => ({ backgroundLocation: location, scList: list.map((w) => w.id) }), [location, list]);
  return (
    <>
      <div className="ms-bar">
        {FILTERS.map(([k, label]) => (
          <button key={k} type="button" className={filter === k ? "ms-pill ms-pill-on" : "ms-pill"} aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
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
          <StudioTile key={w.id} w={w} i={i} meta={w.status === "Published" ? `${count(w.views ?? 0)} views` : ""}>
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
