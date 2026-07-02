import { useKuyRadarBusinesses } from "@/hooks/admin/useKuyRadarBusinesses";
import { useKuyRadarContent } from "@/hooks/admin/useKuyRadarContent";
import { KuyRadarCard } from "./KuyRadarShell";

export default function KuyContentPlanner() {
  const { activeBusinessId } = useKuyRadarBusinesses();
  const { contentItems } = useKuyRadarContent(activeBusinessId);

  return (
    <KuyRadarCard className="p-5">
      <h2 className="text-lg font-semibold text-admin-fg">Content Planner</h2>
      <p className="mt-2 text-sm text-admin-muted">
        แปลง content ที่ติดตามเป็นแนวคิดโพสต์ — ใช้ adaptation จากตาราง Content Tracker
      </p>
      <div className="mt-4 space-y-3">
        {contentItems.length === 0 ? (
          <p className="text-sm text-admin-muted">ยังไม่มี content — เพิ่มใน Content Tracker</p>
        ) : (
          contentItems.map((c) => (
            <div key={c.id} className="rounded-lg border border-admin-border p-4 text-sm">
              <p className="font-semibold">{c.title ?? c.platform}</p>
              <p className="mt-1 text-admin-muted">{c.suggested_adaptation ?? "Draft: FAQ + proof post inspired by hook"}</p>
            </div>
          ))
        )}
      </div>
    </KuyRadarCard>
  );
}
