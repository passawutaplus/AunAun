import { useEffect } from "react";
import { Link } from "react-router-dom";

const useEscape = (on: () => void) =>
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") on();
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [on]);

/** × with something typed or changed (mock "ออกจากหน้านี้?"). EventPost keeps no draft by itself. */
export function EpLeaveDialog({ isEditPub, onGo, onStay }: { isEditPub: boolean; onGo: () => void; onStay: () => void }) {
  useEscape(onStay);
  return (
    <div className="ep-veil pv-veil">
      <div aria-hidden="true" className="ep-veil-hit" onClick={onStay} />
      <div className="ep-box ep-box-lv pv-box" role="alertdialog" aria-modal="true" aria-labelledby="ep-lv-h">
        <h2 id="ep-lv-h">ออกจากหน้านี้?</h2>
        <p>{isEditPub ? "การแก้ไขที่ยังไม่บันทึกจะหายไป" : "ข้อมูลที่กรอกไว้จะหายไป"}</p>
        <div className="ep-box-row">
          <button type="button" className="ep-btn-line" onClick={onGo}>
            {isEditPub ? "ออกโดยไม่บันทึก" : "ออก"}
          </button>
          <button type="button" className="ep-btn-ink" autoFocus onClick={onStay}>
            อยู่ต่อ
          </button>
        </div>
      </div>
    </div>
  );
}

type PublishedProps = { cover: string; title: string; isEditPub: boolean; studioHref: string; onAgain: () => void };

/**
 * After Publish / บันทึกการแก้ไข (mock "ลงงานแล้ว"). A member's event goes to the team first, so the line under
 * the title says that instead of the mock's "ขึ้นใน Exhibition แล้ว" (question for Beam).
 */
export function EpPublishedDialog(p: PublishedProps) {
  return (
    <div className="ep-veil pv-veil">
      <div className="ep-box ep-box-pub pv-box" role="dialog" aria-modal="true" aria-labelledby="ep-pub-h">
        <span aria-hidden="true" className="ep-pub-img" style={p.cover ? { backgroundImage: `url("${p.cover}")` } : undefined} />
        <h2 id="ep-pub-h">{p.title.trim() || "Untitled"}</h2>
        <p>{p.isEditPub ? "บันทึกการแก้ไขแล้ว · รอทีมตรวจอีกครั้ง" : "ส่งให้ทีมตรวจแล้ว · ขึ้นใน Event เมื่อผ่านการตรวจ"}</p>
        <div className="ep-pub-row" data-one={p.isEditPub ? "" : undefined}>
          <Link to={p.studioHref} className="ep-btn-ink">
            กลับ My Studio
          </Link>
          {p.isEditPub ? null : (
            <button type="button" className="ep-btn-line" onClick={p.onAgain}>
              ลงอีกงาน
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
