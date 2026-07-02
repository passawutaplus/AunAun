import { useState } from "react";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useKuyRadarBusinesses } from "@/hooks/admin/useKuyRadarBusinesses";
import { useKuyRadarInsights } from "@/hooks/admin/useKuyRadarInsights";
import { KuyRadarCard } from "./KuyRadarShell";

export default function KuyOfferBuilder() {
  const { activeBusiness, activeBusinessId } = useKuyRadarBusinesses();
  const { runInsight, isRunning } = useKuyRadarInsights(activeBusinessId);
  const [offer, setOffer] = useState("สมัคร Aplus1 ฟรี + โปรไฟล์พร้อม publish 3 ผลงาน");

  const generate = async () => {
    try {
      const row = await runInsight({
        insightType: "campaign",
        title: "Offer Builder",
        context: { business: activeBusiness?.business_name ?? "", offer },
      });
      setOffer(row.recommendation ?? offer);
      toast.success("Offer insight saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <KuyRadarCard className="p-5">
      <h2 className="text-lg font-semibold text-admin-fg">Offer Builder</h2>
      <textarea
        className="mt-3 h-32 w-full rounded-lg border border-admin-border p-3 text-sm"
        value={offer}
        onChange={(e) => setOffer(e.target.value)}
      />
      <button
        type="button"
        disabled={isRunning}
        onClick={() => void generate()}
        className="kuy-btn-primary mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm"
      >
        <Wand2 className="h-4 w-4" />
        Generate with AI
      </button>
    </KuyRadarCard>
  );
}
