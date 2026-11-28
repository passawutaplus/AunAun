import { useEffect } from "react";
import { Link } from "react-router-dom";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { SC_LINKS } from "../routes";
import WorkBody, { type BodyCell, type BodyItem } from "../work/WorkBody";
import { cellsOf, isTextCell, isUploaded, slotKey, type Draft, type Media, type Mode } from "./model";

const CLOUD = (
  <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 18.5h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.1 9.6 4.5 4.5 0 0 0 7 18.5z" />
    <path d="M9.5 13.5l2 2 3.5-3.5" />
  </svg>
);

const useEscape = (on: () => void) =>
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") on();
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [on]);

const srcOf = (m: Media) => ({ src: m.preview ?? m.url, local: !!m.preview });

/** What others will see, from the editor state (mock pvMods / pvRows: finished uploads only). */
export function previewItems(mode: Mode, d: Draft, media: Record<string, Media>): BodyItem[] {
  if (mode === "Basic") {
    const out: BodyItem[] = [];
    for (const b of d.blocks) {
      if (b.type === "text") {
        if (b.text.trim()) out.push({ kind: "text", key: b.id, text: b.text, style: b.style });
        continue;
      }
      const m = media[b.id];
      if (!isUploaded(m)) continue;
      if (m.kind === "image") out.push({ kind: "image", key: b.id, ...srcOf(m), ratio: m.size ? m.size[0] / m.size[1] : null });
      else out.push({ kind: "video", key: b.id, src: m.preview ?? m.url, ...(m.poster ? { poster: m.poster } : {}) });
    }
    return out;
  }
  const out: BodyItem[] = [];
  for (const r of d.rows) {
    const cells: BodyCell[] = cellsOf(r.layout).map((c, i) => {
      const k = slotKey(r.id, i);
      if (isTextCell(c)) {
        const t = d.slotTexts[k];
        return t && t.text.trim() ? { text: t.text, style: t.style } : null;
      }
      const m = media[d.fills[k] ?? ""];
      return isUploaded(m) && m.kind === "image" ? { image: srcOf(m).src, local: srcOf(m).local, fit: !!d.fit[k] } : null;
    });
    if (cells.some(Boolean)) out.push({ kind: "row", key: r.id, layout: r.layout, cells });
  }
  return out;
}

type PreviewProps = {
  items: BodyItem[];
  title: string;
  desc: string;
  category: string | null;
  handle: string;
  avatarUrl: string | null;
  pubLabel: string;
  notReady: boolean;
  onClose: () => void;
  onPublish: () => void;
};

/** Full-screen "ตัวอย่าง · คนอื่นจะเห็นงานนี้แบบนี้" (mock Preview). */
export function UploadPreview(p: PreviewProps) {
  useEscape(p.onClose);
  const av = p.avatarUrl ? proxiedImageUrl(p.avatarUrl, 96) : "";
  return (
    <div className="up-pv" role="dialog" aria-modal="true" aria-label="ตัวอย่างที่คนอื่นเห็น">
      <div className="up-pvbarw">
        <div className="up-pvbar">
          <span className="up-pvtx">ตัวอย่าง · คนอื่นจะเห็นงานนี้แบบนี้</span>
          <button type="button" className="up-pvback" onClick={p.onClose}>
            กลับไปแก้
          </button>
          <button type="button" className="up-pvpub" aria-disabled={p.notReady} onClick={p.onPublish}>
            {p.pubLabel}
          </button>
        </div>
      </div>
      <div className="up-pvg">
        <article className="up-pva">
          {p.items.length ? <WorkBody items={p.items} /> : <div className="up-pvempty">ยังไม่มีภาพ — กลับไปใส่ผลงานก่อน</div>}
          <section className="up-pvi" aria-label="ข้อมูลผลงาน">
            <div className="up-pvi-main">
              <div className="up-pvi-head">
                <h1 className="up-pvh">{p.title.trim() || "Untitled"}</h1>
                <p className="up-pvdate">วันนี้ · 0 views</p>
              </div>
              <div className="up-pvby">
                <span aria-hidden="true" className="up-pvav" style={av ? { backgroundImage: `url("${av}")` } : undefined} />
                <span className="up-pvhandle">@{p.handle}</span>
                <span className="up-pvfollow">ติดตาม</span>
              </div>
              {p.desc.trim() ? <p className="up-pvdesc">{p.desc}</p> : null}
            </div>
            {/* YEAR is hidden for now (owner 2026-11-28, Beam question 49). */}
            <dl className="up-pvdl">
              <div>
                <dt>CATEGORY</dt>
                <dd>{p.category || "—"}</dd>
              </div>
            </dl>
          </section>
        </article>
        <nav className="up-pvr" aria-label="การกระทำกับผลงาน (ตัวอย่าง)">
          <span title="เก็บเข้าคอลเลคชั่น">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33" strokeLinejoin="round">
              <path d="M6 3h12v18l-6-4.5L6 21z" />
            </svg>
          </span>
          <span title="แชร์">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15V3.5M7.5 8L12 3.5 16.5 8M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5" />
            </svg>
          </span>
          <span title="คอมเมนต์">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33" strokeLinejoin="round">
              <path d="M4 5.5h16v11H9l-5 4z" />
            </svg>
          </span>
          <span title={`@${p.handle}`}>
            <span aria-hidden="true" className="up-pvav up-pvav-s" style={av ? { backgroundImage: `url("${av}")` } : undefined} />
          </span>
        </nav>
      </div>
    </div>
  );
}

/** × with something on the page (mock "ออกจากหน้า"). */
export function LeaveDialog({ isEditPub, busy, onGo, onStay }: { isEditPub: boolean; busy: boolean; onGo: () => void; onStay: () => void }) {
  useEscape(onStay);
  return (
    <div className="up-veil">
      <div className="up-box up-box-lv" role="dialog" aria-modal="true" aria-labelledby="up-lv-h">
        {isEditPub ? null : CLOUD}
        <h2 id="up-lv-h">{isEditPub ? "ออกจากหน้านี้?" : "บันทึกเป็นร่างแล้ว"}</h2>
        <p>{isEditPub ? "การแก้ไขที่ยังไม่บันทึกจะหายไป" : "แก้ต่อได้ที่ My Studio"}</p>
        <div className="up-box-row">
          <button type="button" className="up-btn-line" aria-busy={busy} onClick={onGo}>
            {isEditPub ? "ออกโดยไม่บันทึก" : "ออก"}
          </button>
          <button type="button" className="up-btn-ink" autoFocus onClick={onStay}>
            อยู่ต่อ
          </button>
        </div>
      </div>
    </div>
  );
}

type ConfirmProps = {
  thumb: string;
  title: string;
  agree: boolean;
  setAgree: (v: boolean) => void;
  busy: boolean;
  onCancel: () => void;
  onDraft: () => void;
  onPublish: () => void;
};

/** Every first Publish asks for the rights checkbox (mock "Publish?"). */
export function ConfirmDialog(p: ConfirmProps) {
  useEscape(p.onCancel);
  return (
    <div className="up-veil up-veil-cf">
      <div aria-hidden="true" className="up-veil-hit" onClick={p.onCancel} />
      <div className="up-box up-box-cf" role="dialog" aria-modal="true" aria-labelledby="up-cf-h">
        <button type="button" className="up-round40 up-box-x" aria-label="ยกเลิก" onClick={p.onCancel}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div className="up-cf-head">
          <span aria-hidden="true" className="up-cf-thumb" style={p.thumb ? { backgroundImage: `url("${p.thumb}")` } : undefined} />
          <div className="up-cf-tx">
            <h2 id="up-cf-h" lang="en">
              Publish?
            </h2>
            <span>{p.title.trim() || "Untitled"}</span>
          </div>
        </div>
        <label className="up-cf-agree">
          <input type="checkbox" checked={p.agree} onChange={(e) => p.setAgree(e.target.checked)} />
          <span>
            ข้าพเจ้าขอยืนยันว่าเป็นเจ้าของผลงานนี้ หรือได้รับอนุญาตให้เผยแพร่ผลงานนี้ โดยยอมรับตาม
            <Link to={SC_LINKS.terms} target="_blank" rel="noopener">
              ข้อกำหนดการใช้งาน
            </Link>
          </span>
        </label>
        <div className="up-cf-row">
          <button type="button" className="up-cf-cancel" onClick={p.onCancel}>
            ยกเลิก
          </button>
          <button type="button" lang="en" className="up-btn-line" onClick={p.onDraft}>
            Save draft
          </button>
          <button
            type="button"
            lang="en"
            className={p.agree ? "up-cf-pub up-cf-pub-on" : "up-cf-pub"}
            aria-disabled={!p.agree}
            aria-busy={p.busy}
            onClick={() => {
              if (p.agree && !p.busy) p.onPublish();
            }}
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}

type PublishedProps = { cover: string; isEditPub: boolean; title: string; workHref: string; onAgain: () => void };

/** After Publish / บันทึกการแก้ไข (mock "หลังกด Publish"). */
export function PublishedDialog(p: PublishedProps) {
  const name = p.title.trim() || "Untitled";
  return (
    <div className="up-veil">
      <div className="up-box up-box-pub" role="dialog" aria-modal="true" aria-labelledby="up-pub-h">
        <span aria-hidden="true" className="up-pub-img" style={p.cover ? { backgroundImage: `url("${p.cover}")` } : undefined} />
        <h2 id="up-pub-h">{p.isEditPub ? "บันทึกการแก้ไขแล้ว" : "ลงงานเรียบร้อยแล้ว"}</h2>
        <p>{p.isEditPub ? `${name} อัปเดตแล้ว` : `${name} ขึ้นใน Showcase และแถว New แล้ว`}</p>
        <div className="up-box-row">
          <Link to={p.workHref} className="up-btn-ink">
            ดูงาน
          </Link>
          {p.isEditPub ? (
            <Link to={SC_LINKS.myStudio} className="up-btn-line">
              กลับ My Studio
            </Link>
          ) : (
            <button type="button" className="up-btn-line" onClick={p.onAgain}>
              ลงงานต่อ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
