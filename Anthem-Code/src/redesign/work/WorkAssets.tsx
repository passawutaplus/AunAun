import { useState } from "react";
import { resolveProjectAssetForOpen } from "@/lib/downloadProjectAsset";
import { openSafeExternalUrl } from "@/lib/externalUrl";
import { assertProjectAssetSafeToOpen } from "@/lib/projectAssetScan";
import { filterPublicProjectAssets, type ProjectAsset } from "@/lib/projectAssets";

/** Shield ✓ "ปลอดภัย" (passed the scan), the clock while it is being checked, ! when it failed. */
function ScanBadge({ status }: { status: ProjectAsset["scan_status"] }) {
  if (status === "clean") {
    return (
      <span className="wk-scan" data-s="clean" title="ผ่านการตรวจความปลอดภัยแล้ว">
        <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        ปลอดภัย
      </span>
    );
  }
  return (
    <span className="wk-scan" data-s={status}>
      {status === "pending" ? "กำลังตรวจ" : "ไม่ผ่าน"}
    </span>
  );
}

const fileIcon = (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.7 17.2a1.7 1.7 0 0 1-2.4-2.4L15 7" />
  </svg>
);
const linkIcon = (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

/**
 * Files and links the owner attached (old ProjectAssetsSection): only ones that passed the safety scan open,
 * through the same checks and download function. Visitors see the safe ones; the owner also sees the ones
 * still being checked or that failed, with the reason.
 */
export default function WorkAssets({ projectId, assets, isOwn, say }: { projectId: string; assets: ProjectAsset[]; isOwn: boolean; say: (t: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const list = isOwn ? assets : filterPublicProjectAssets(assets);
  if (!list.length) return null;

  const open = async (a: ProjectAsset) => {
    const gate = assertProjectAssetSafeToOpen(a);
    if (!gate.ok) return say(gate.reason);
    setBusy(a.id);
    try {
      const r = await resolveProjectAssetForOpen(projectId, a);
      if (!r.ok) say(r.reason);
      else if (!openSafeExternalUrl(r.url)) say(a.kind === "link" ? "ลิงก์นี้เปิดไม่ได้นะ" : "ดาวน์โหลดไม่ได้ ลองใหม่อีกทีนะ");
    } catch {
      say(a.kind === "link" ? "ลิงก์นี้เปิดไม่ได้นะ" : "ดาวน์โหลดไม่ได้ ลองใหม่อีกทีนะ");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="wk-assets">
      <span className="wk-lbl">ไฟล์แนบ / ลิงก์</span>
      <ul>
        {list.map((a) => {
          const ok = a.scan_status === "clean";
          return (
            <li key={a.id}>
              <button type="button" className="wk-asset" disabled={!ok || busy === a.id} aria-busy={busy === a.id || undefined} onClick={() => void open(a)}>
                {a.kind === "file" ? fileIcon : linkIcon}
                <span className="wk-asset-t">
                  <span className="wk-asset-name">{a.label || a.file_name || a.url}</span>
                  {!ok && a.scan_status === "blocked" && a.scan_reason ? <span className="wk-asset-why">{a.scan_reason}</span> : null}
                </span>
                <ScanBadge status={a.scan_status} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
