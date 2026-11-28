import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { proxiedImageSrcSet, proxiedImageUrl } from "@/lib/imageProxy";
import EmptyNote from "../main/EmptyNote";
import ScLoader from "../main/ScLoader";
import { SC_LINKS } from "../routes";
import LoadError from "../shell/LoadError";
import { OnlyYou } from "./MyFollowing";
import { count, toTile, type Tile } from "./tiles";
import { ALL_SAVED, useMySaved } from "./useMyProfile";

const ALL_NAME = "ทั้งหมดที่บันทึก";

const Globe = ({ size = 16, stroke = "currentColor" }: { size?: number; stroke?: string }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={size < 16 ? 1.5 : 1.4} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" /></svg>
);
const Lock = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9.5" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);
const Check = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

type SavedTile = Tile & { artist: string };

/** Saved: "ทั้งหมดที่บันทึก" + my collections; open one to rename, show/hide, share, re-cover, delete or pick works to move. */
export default function MySaved({ uid, say }: { uid: string; say: (t: string) => void }) {
  const s = useMySaved(uid, true);
  const [open, setOpen] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [menu, setMenu] = useState(false);
  // Deleting a collection asks first, like deleting a work (owner 2026-11-28, Beam 46).
  const [askDel, setAskDel] = useState(false);
  const [moveMenu, setMoveMenu] = useState(false);

  const groups = useMemo(
    () => [{ id: ALL_SAVED, name: ALL_NAME, isPublic: false, projectIds: s.allIds }, ...s.colls],
    [s.allIds, s.colls],
  );
  const shown = (ids: readonly string[]) => ids.filter((id) => s.works.has(id));
  const cur = open ? groups.find((g) => g.id === open) ?? null : null;
  const isAll = cur?.id === ALL_SAVED;

  const [draft, setDraft] = useState("");
  useEffect(() => setDraft(cur?.name ?? ""), [cur?.id, cur?.name]);

  const reset = () => {
    setSelecting(false);
    setPicked(new Set());
    setMenu(false);
    setMoveMenu(false);
  };
  const openGroup = (id: string | null) => {
    reset();
    setOpen(id);
  };

  const tiles = useMemo<SavedTile[]>(() => {
    if (!cur) return [];
    return cur.projectIds
      .map((id) => s.works.get(id))
      .filter((w): w is NonNullable<typeof w> => !!w)
      .map((w) => {
        const t = toTile(w);
        const o = w.owner_id ? s.owners[w.owner_id] : undefined;
        return t ? { ...t, artist: o?.username || o?.display_name || "" } : null;
      })
      .filter((t): t is SavedTile => !!t);
  }, [cur, s.works, s.owners]);

  if (!cur) {
    return (
      <>
        <OnlyYou />
        <div className="pf-colls">
          {groups.map((g) => {
            const ids = shown(g.projectIds);
            const covers = ids.slice(0, 3).map((id) => {
              const w = s.works.get(id);
              return w ? toTile(w)?.cover ?? "" : "";
            });
            return (
              <button key={g.id} type="button" className="pf-coll" onClick={() => openGroup(g.id)}>
                <span className="pf-mosaic">
                  {[0, 1, 2].map((i) => (covers[i] ? <img key={i} src={proxiedImageUrl(covers[i], 640)} alt="" loading="lazy" decoding="async" /> : <span key={i} />))}
                </span>
                <span className="pf-coll-name mp-coll-name">
                  {g.name}
                  {g.isPublic ? <Globe size={13} stroke="#8A8A87" /> : null}
                </span>
                <span className="pf-coll-n">{count(ids.length)} งาน</span>
              </button>
            );
          })}
        </div>
        {s.pending ? (
          <ScLoader label="กำลังโหลด" />
        ) : s.failed ? (
          <LoadError onRetry={s.retry} />
        ) : !s.allIds.length && !s.colls.length ? (
          <EmptyNote text="งานที่บันทึกไว้จะมาอยู่ตรงนี้นะ" action={{ label: "ดูผลงาน", to: SC_LINKS.home }} />
        ) : null}
      </>
    );
  }

  const pickedIds = [...picked];
  const commitName = () => {
    const name = draft.trim();
    if (!isAll && name && name !== cur.name) s.rename.mutate({ id: cur.id, name });
    else setDraft(cur.name);
  };
  const share = async () => {
    if (!cur.isPublic) return;
    try {
      await navigator.clipboard?.writeText(`${window.location.origin}/collections/${cur.id}`);
    } catch {
      /* clipboard blocked: the toast still confirms like the mock */
    }
    say("คัดลอกลิงก์คอลเลคชั่นแล้ว");
  };
  const changeCover = () => {
    setMenu(false);
    const ids = shown(cur.projectIds);
    if (ids.length > 1) s.reorder.mutate({ id: cur.id, ids: [...ids.slice(1), ids[0]] });
  };
  const remove = () => {
    setAskDel(false);
    s.remove.mutate(cur.id);
    setOpen(null);
    say(`ลบ ${cur.name} แล้ว`);
  };
  const askRemove = () => {
    setMenu(false);
    setAskDel(true);
  };
  const moveTo = (to: string | null) => {
    s.move.mutate(
      { from: cur.id, to, ids: pickedIds },
      {
        onSuccess: (created) => {
          if (created) {
            openGroup(created);
            say("สร้างคอลเลคชั่นใหม่แล้ว · ตั้งชื่อได้เลย");
          }
        },
      },
    );
    setPicked(new Set());
    setMoveMenu(false);
    if (!to) setSelecting(false);
  };
  const takeOut = () => {
    s.takeOut.mutate({ from: cur.id, ids: pickedIds });
    setPicked(new Set());
  };
  const flip = (id: string) =>
    setPicked((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <div className="mp-coll-hd">
        <button type="button" className="mp-cbtn" aria-label="กลับไปคอลเลคชั่นทั้งหมด" onClick={() => openGroup(null)}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        {isAll ? (
          <span className="mp-cname">{cur.name}</span>
        ) : (
          <>
            <label className="sc-sr" htmlFor="mp-coll-name">ชื่อคอลเลคชั่น</label>
            <input
              id="mp-coll-name"
              className="mp-cname"
              type="text"
              value={draft}
              maxLength={80}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
          </>
        )}
        <span className="mp-n">{count(tiles.length)} งาน</span>
        <span className="mp-grow" />
        {isAll ? null : (
          <>
            <button
              type="button"
              className="mp-pill"
              aria-pressed={cur.isPublic}
              title={cur.isPublic ? "คนอื่นเห็นในโปรไฟล์คุณ" : "เห็นแค่คุณ"}
              onClick={() => s.setPublic.mutate({ id: cur.id, isPublic: !cur.isPublic })}
            >
              {cur.isPublic ? <Globe /> : <Lock />}
              {cur.isPublic ? "สาธารณะ" : "ส่วนตัว"}
            </button>
            <button
              type="button"
              className="mp-cbtn"
              aria-label="แชร์คอลเลคชั่น"
              aria-disabled={!cur.isPublic}
              title={cur.isPublic ? "แชร์" : "เปิดเป็นสาธารณะก่อนแชร์"}
              data-off={cur.isPublic ? undefined : ""}
              onClick={() => void share()}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1" /></svg>
            </button>
            <div className="mp-rel">
              <button type="button" className="mp-cbtn" aria-label="ตัวเลือกเพิ่มเติม" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 12h.01M12 12h.01M18 12h.01" /></svg>
              </button>
              {menu ? (
                <div role="menu" className="mp-menu">
                  <button type="button" role="menuitem" className="mp-mi" onClick={changeCover}>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="9.5" r="1.6" /><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5" /></svg>
                    เปลี่ยนปก
                  </button>
                  <button type="button" role="menuitem" className="mp-mi mp-mi-red" onClick={askRemove}>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></svg>
                    ลบคอลเลคชั่น
                  </button>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
      {tiles.length ? (
        <div className="mp-selrow">
          <button type="button" className="mp-sel" aria-pressed={selecting} onClick={() => (selecting ? reset() : setSelecting(true))}>
            {selecting ? "เสร็จ" : "เลือก"}
          </button>
        </div>
      ) : null}
      <SavedPin tiles={tiles} selecting={selecting} picked={picked} onPick={flip} />
      {tiles.length || s.pending ? null : s.failed ? (
        <LoadError onRetry={s.retry} />
      ) : (
        <EmptyNote text={isAll ? "ยังไม่ได้บันทึกงานไหนเลย" : "ยังไม่มีงานในคอลเลคชั่นนี้นะ"} />
      )}
      {selecting && picked.size ? (
        <div role="toolbar" aria-label="จัดการงานที่เลือก" className="mp-bar">
          <span className="mp-bar-n">เลือก {picked.size}</span>
          <div className="mp-rel">
            <button type="button" className="mp-bb" aria-haspopup="menu" aria-expanded={moveMenu} onClick={() => setMoveMenu((m) => !m)}>
              ย้ายไป
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6-6 6 6" /></svg>
            </button>
            {moveMenu ? (
              <div role="menu" className="mp-menu mp-menu-up">
                <button type="button" role="menuitem" className="mp-mi mp-mi-new" onClick={() => moveTo(null)}>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  คอลเลคชั่นใหม่
                </button>
                {s.colls
                  .filter((c) => c.id !== cur.id)
                  .map((c) => (
                    <button key={c.id} type="button" role="menuitem" className="mp-mi" onClick={() => moveTo(c.id)}>
                      {c.name}
                    </button>
                  ))}
              </div>
            ) : null}
          </div>
          <button type="button" className="mp-bb" onClick={takeOut}>
            เอาออก
          </button>
          <button type="button" className="mp-bb mp-bb-x" aria-label="ยกเลิกการเลือก" onClick={reset}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      ) : null}
      {askDel ? (
        <div className="mp-veil pv-veil">
          <div aria-hidden="true" className="mp-veil-hit" onClick={() => setAskDel(false)} />
          <div className="mp-box pv-box" role="dialog" aria-modal="true" aria-labelledby="mp-del-h">
            <h2 id="mp-del-h">ลบ {cur.name}?</h2>
            <p>งานที่บันทึกไว้ยังอยู่ใน ทั้งหมดที่บันทึก</p>
            <div className="mp-box-row">
              <button type="button" className="mp-btn-line" autoFocus onClick={() => setAskDel(false)}>
                ยกเลิก
              </button>
              <button type="button" className="mp-btn-del" onClick={remove}>
                ลบ
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SavedPin({ tiles, selecting, picked, onPick }: { tiles: SavedTile[]; selecting: boolean; picked: ReadonlySet<string>; onPick: (id: string) => void }) {
  const location = useLocation();
  const linkState = useMemo(() => ({ backgroundLocation: location, scList: tiles.map((t) => t.id) }), [location, tiles]);
  return (
    <div className="pf-pin">
      {tiles.map((t, i) => {
        const on = picked.has(t.id);
        const style: CSSProperties = { aspectRatio: String(t.ratio ?? 1) };
        return (
          <div key={t.id} className="pf-tile" style={style} data-picked={on ? "" : undefined}>
            <img
              data-sc-work=""
              className="pf-art"
              src={proxiedImageUrl(t.cover, 640)}
              srcSet={proxiedImageSrcSet(t.cover, [384, 640, 828, 1080]) || undefined}
              sizes="(max-width: 600px) 50vw, 30vw"
              alt=""
              loading={i < 6 ? "eager" : "lazy"}
              decoding="async"
              style={t.ratio ? undefined : { objectFit: "contain" }}
            />
            <span className="pf-art pf-shade" aria-hidden="true" />
            <Link to={`/showcase/${t.id}`} state={linkState} aria-label={`เปิด ${t.title}`} className="pf-open" />
            <span className="pf-tt">
              <b>{t.title}</b>
              {t.artist ? <span>{t.artist}</span> : null}
            </span>
            {selecting ? (
              <button type="button" className="mp-ck" aria-pressed={on} aria-label={`เลือก ${t.title}`} onClick={() => onPick(t.id)}>
                <span>
                  <Check />
                </span>
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
