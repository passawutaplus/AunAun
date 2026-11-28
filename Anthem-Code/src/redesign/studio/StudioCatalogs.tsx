import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { createCatalog, deleteCatalog, renameCatalog, setCatalogWork } from "@/server/mutations/studio";
import type { MyCatalog } from "@/server/queries/myProfile";
import type { StudioWork } from "@/server/queries/studio";
import { coverOf, StudioTile } from "./StudioWorks";

const NEW_NAME = "Catalog ใหม่";
const RENAME_MS = 600;

type Props = { uid: string; catalogs: MyCatalog[]; works: StudioWork[]; say: (t: string) => void };

/**
 * My Studio → Catalogs (mock): the list, a new catalog, and one catalog open — rename in place,
 * "จัดงาน" to tick works, delete. Public/Private and the order of catalogs stay in My Profile.
 */
export default function StudioCatalogs({ uid, catalogs, works, say }: Props) {
  const qc = useQueryClient();
  const key = ["sc-my-catalogs", uid];
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const nameIn = useRef<HTMLInputElement>(null);
  const renameTimer = useRef<number | undefined>(undefined);
  const cur = catalogs.find((c) => c.id === openId) ?? null;
  const byId = new Map(works.map((w) => [w.id, w]));

  const patchCache = (fn: (list: MyCatalog[]) => MyCatalog[]) => qc.setQueryData<MyCatalog[]>(key, (old) => (old ? fn(old) : old));
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: key });
    void qc.invalidateQueries({ queryKey: ["sc-profile-catalogs", uid] });
  };

  useEffect(() => () => window.clearTimeout(renameTimer.current), []);

  const open = (c: MyCatalog, edit = false) => {
    setOpenId(c.id);
    setName(c.title);
    setEditing(edit);
  };

  const add = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const id = await createCatalog(uid, NEW_NAME);
      const c: MyCatalog = { id, title: NEW_NAME, isPublic: false, projectIds: [] };
      patchCache((list) => [...list, c]);
      open(c, true);
      refresh();
      window.setTimeout(() => {
        nameIn.current?.focus();
        nameIn.current?.select();
      }, 60);
    } catch {
      say("สร้าง Catalog ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const onName = (v: string) => {
    setName(v);
    if (!cur) return;
    const id = cur.id;
    patchCache((list) => list.map((c) => (c.id === id ? { ...c, title: v } : c)));
    window.clearTimeout(renameTimer.current);
    // An empty name is not saved; the last non-empty one stays.
    if (!v.trim()) return;
    renameTimer.current = window.setTimeout(() => {
      renameCatalog(id, v.trim())
        .then(refresh)
        .catch(() => say("บันทึกชื่อไม่สำเร็จ"));
    }, RENAME_MS);
  };

  const remove = async () => {
    if (!cur) return;
    const id = cur.id;
    setOpenId(null);
    setEditing(false);
    patchCache((list) => list.filter((c) => c.id !== id));
    try {
      await deleteCatalog(id);
    } catch {
      say("ลบไม่สำเร็จ");
    }
    refresh();
  };

  const toggle = (w: StudioWork) => {
    if (!cur) return;
    const inside = cur.projectIds.includes(w.id);
    const id = cur.id;
    // A work may be in several catalogs (owner 2026-11-28); the refresh shows a move if the old one-catalog rule still holds.
    patchCache((list) => list.map((c) => (c.id === id ? { ...c, projectIds: inside ? c.projectIds.filter((x) => x !== w.id) : [...c.projectIds, w.id] } : c)));
    setCatalogWork(id, w.id, !inside)
      .then(refresh)
      .catch(() => {
        say("บันทึกไม่สำเร็จ");
        refresh();
      });
  };

  const finish = () => {
    setEditing(false);
    say(cur && cur.projectIds.length ? `บันทึก ${name.trim() || cur.title} แล้ว` : "ยังไม่มีงานใน Catalog นี้");
    refresh();
  };

  if (!cur) {
    return (
      <div className="ms-cats">
        {catalogs.map((c) => {
          const imgs = c.projectIds.map((id) => byId.get(id)).filter((w): w is StudioWork => !!w).map(coverOf).filter(Boolean).slice(0, 3);
          return (
            <button key={c.id} type="button" className="ms-coll" onClick={() => open(c)}>
              <span className="ms-mos" aria-hidden="true">
                {[0, 1, 2].map((i) => (imgs[i] ? <img key={i} src={proxiedImageUrl(imgs[i], i === 0 ? 640 : 320)} alt="" /> : <span key={i} />))}
              </span>
              <span className="ms-coll-name">
                {c.title || NEW_NAME}
                {c.isPublic ? null : (
                  <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="11" width="14" height="9.5" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                )}
              </span>
              <span className="ms-coll-n">{c.projectIds.length} งาน</span>
            </button>
          );
        })}
        <button type="button" className="ms-addt ms-addt-43" aria-busy={busy} onClick={() => void add()}>
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>Catalog ใหม่</span>
        </button>
      </div>
    );
  }

  const shown = editing ? works : works.filter((w) => cur.projectIds.includes(w.id));
  return (
    <>
      <div className="ms-cat-head">
        <button
          type="button"
          className="ms-cbtn"
          aria-label="กลับ"
          onClick={() => {
            setOpenId(null);
            setEditing(false);
          }}
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <label className="ms-sr" htmlFor="st-cat">
          ชื่อ Catalog
        </label>
        <input ref={nameIn} id="st-cat" className="ms-cname" type="text" value={name} maxLength={80} onChange={(e) => onName(e.target.value)} />
        <span className="ms-cat-n">{cur.projectIds.length} งาน</span>
        <span className="ms-grow" />
        {editing ? null : (
          <button type="button" className="ms-cpill" onClick={() => setEditing(true)}>
            จัดงาน
          </button>
        )}
        <button type="button" className="ms-cbtn ms-cbtn-del" aria-label="ลบ Catalog" title="ลบ" onClick={() => void remove()}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />
          </svg>
        </button>
      </div>
      <div className="pf-pin">
        {shown.map((w, i) => {
          const on = cur.projectIds.includes(w.id);
          return (
            <StudioTile key={w.id} w={w} i={i} className={editing ? (on ? "pf-tile ms-tile ms-pick-on" : "pf-tile ms-tile ms-pick-off") : "pf-tile ms-tile"}>
              {editing ? (
                <button type="button" className="ms-pick" aria-pressed={on} aria-label={`${on ? "เอาออกจากชุด" : "ใส่ในชุด"} ${w.title ?? ""}`} onClick={() => toggle(w)}>
                  <span className={on ? "ms-ck ms-ck-on" : "ms-ck"}>
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                </button>
              ) : (
                <Link to={`/showcase/${w.id}`} className="pf-open" aria-label={`เปิด ${w.title ?? ""}`} />
              )}
            </StudioTile>
          );
        })}
      </div>
      {!editing && !cur.projectIds.length ? <p className="ms-empty">ยังไม่มีงานใน Catalog นี้ · กด “จัดงาน” เพื่อเลือก</p> : null}
      {editing ? (
        <div className="ms-catbar" role="toolbar" aria-label="จัดงานใน Catalog">
          <span>เลือก {cur.projectIds.length} งาน</span>
          <button type="button" onClick={finish}>
            เสร็จ
          </button>
        </div>
      ) : null}
    </>
  );
}
