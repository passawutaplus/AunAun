import { DatabaseZap } from "lucide-react";
import { adminDbGapForPath } from "@/lib/admin/adminDbGaps";

/** Shown above a page whose tables/functions are not in the database yet, so empty lists are not a mystery. */
export default function AdminDbGapNotice({ pathname }: { pathname: string }) {
  const gap = adminDbGapForPath(pathname);
  if (!gap) return null;
  return (
    <div role="status" className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      <div className="flex items-start gap-3">
        <DatabaseZap className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <div className="min-w-0">
          <p className="font-medium text-admin-fg">หน้านี้ยังใช้ได้ไม่ครบ — ฐานข้อมูลยังไม่มีบางส่วน</p>
          <p className="mt-0.5 text-[13px] text-admin-muted">{gap.effect}</p>
          <details className="mt-1.5 text-xs text-admin-muted">
            <summary className="cursor-pointer select-none hover:text-admin-fg">สิ่งที่ยังไม่มี ({gap.missing.length})</summary>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {gap.missing.map((m) => (
                <li key={m} className="rounded border border-admin-border bg-admin-bg px-1.5 py-0.5 font-mono text-[11px]">
                  {m}
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
