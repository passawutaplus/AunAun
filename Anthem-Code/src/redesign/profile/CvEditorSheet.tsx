import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import ProfileAboutEditor from "@/components/profile/ProfileAboutEditor";
import { useProfile } from "@/hooks/useProfile";
import { profilePublicUrl } from "@/lib/profileRoutes";
import { refreshMine } from "../studio/useStudio";
import type { CvProfileRow } from "./useAboutCv";
import "../styles/cv-editor.css";

/**
 * Full-screen CV editor (the old one — templates, fonts, CV photo, every section, live A4 preview,
 * the same limits), opened from My Studio › Profile and My Profile › About.
 * Portalled outside `.sc-app` on purpose: the editor is built on the old Tailwind kit, which the
 * new design's reset would undo; cv-editor.css gives it the new design's colours and type.
 */
export default function CvEditorSheet({ uid, onClose }: { uid: string; onClose: () => void }) {
  const qc = useQueryClient();
  const q = useProfile(uid);
  const row = (q.data as CvProfileRow | null | undefined) ?? null;

  useEffect(() => {
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = before;
    };
  }, []);

  // Profile, My Profile and My Studio read their own copies of the row.
  const close = () => {
    refreshMine(qc, uid);
    onClose();
  };

  return createPortal(
    <div className="sc-cved" role="dialog" aria-modal="true" aria-label="แก้ CV">
      <div className="sc-cved-in">
        {row ? (
          <ProfileAboutEditor
            userId={uid}
            profile={row}
            profileUrl={profilePublicUrl({ user_id: uid, username: row.username ?? null })}
            onSaved={close}
            onCancel={close}
            keepSoftwareInSkills
            sectionClassName="sc-cved-card"
          />
        ) : q.isPending ? (
          <p className="sc-cved-note" aria-busy="true">
            กำลังเปิด CV…
          </p>
        ) : (
          <div className="sc-cved-note" role="alert">
            <p>โหลด CV ไม่ขึ้น ลองใหม่อีกทีนะ</p>
            <div className="sc-cved-acts">
              <button type="button" className="sc-cved-btn sc-cved-btn-ink" onClick={() => void q.refetch()}>
                ลองใหม่
              </button>
              <button type="button" className="sc-cved-btn" onClick={onClose}>
                ปิด
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
