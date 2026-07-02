import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useKuyRadarBusinesses } from "@/hooks/admin/useKuyRadarBusinesses";
import { useKuyRadarLeads } from "@/hooks/admin/useKuyRadarLeads";
import { useKuyRadarInsights } from "@/hooks/admin/useKuyRadarInsights";
import { KuyRadarCard } from "./KuyRadarShell";

export default function KuyOutreachPanel() {
  const { activeBusiness, activeBusinessId } = useKuyRadarBusinesses();
  const { leads } = useKuyRadarLeads(activeBusinessId);
  const { runInsight, isRunning } = useKuyRadarInsights(activeBusinessId);
  const [message, setMessage] = useState(
    "สวัสดีครับ/ค่ะ — เห็นโพสต์ของคุณเกี่ยวกับ [topic] ขออนุญาตแชร์ข้อมูลสาธารณะที่เกี่ยวข้อง (ไม่ spam)",
  );

  const qualified = leads.filter((l) => l.status === "qualified" || (l.lead_score ?? 0) >= 80);

  const generate = async () => {
    try {
      const row = await runInsight({
        insightType: "outreach",
        title: "Outreach draft",
        context: { business: activeBusiness?.business_name ?? "", leads: String(qualified.length) },
      });
      setMessage(row.recommendation ?? message);
      toast.success("Outreach template updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="space-y-4">
      <KuyRadarCard className="kuy-callout-warn p-4">
        <div className="flex gap-2 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Anti-spam: ส่งเฉพาะ lead ที่มีสิทธิ์ติดต่อ โปร่งใส มี opt-out และไม่ส่งซ้ำแบบ bulk
        </div>
      </KuyRadarCard>
      <KuyRadarCard className="p-5">
        <h2 className="text-lg font-semibold text-admin-fg">Outreach ({qualified.length} qualified)</h2>
        <textarea
          className="mt-3 h-40 w-full rounded-lg border border-admin-border p-3 text-sm"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          type="button"
          disabled={isRunning}
          onClick={() => void generate()}
          className="kuy-btn-primary mt-3 rounded-lg px-4 py-2 text-sm"
        >
          Generate message
        </button>
      </KuyRadarCard>
    </div>
  );
}
