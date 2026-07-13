import { ExternalLink, RefreshCw, Radio } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useMarketingContext } from "@/hooks/admin/MarketingContext";
import { useMarketingBusinesses } from "@/hooks/admin/useMarketingBusinesses";
import {
  useMarketingInternalSignals,
  type MarketingInternalSignal,
} from "@/hooks/admin/useMarketingInternalSignals";
import { marketingT } from "@/lib/marketing/i18n";
import { MarketingCard } from "./MarketingShell";

const kindLabel: Record<MarketingInternalSignal["kind"], { th: string; en: string }> = {
  creator_unpublished: { th: "Creator ยังไม่ publish", en: "Creator unpublished" },
  hirer_stale: { th: "คำขอจ้างค้าง", en: "Stale hiring" },
  job_no_applicants: { th: "งานเปิดไม่มีผู้สมัคร", en: "Open job, no applicants" },
  collab_pending: { th: "คอลแลปค้าง", en: "Pending collab" },
  ux_theme: { th: "UX pain", en: "UX theme" },
  profile_incomplete: { th: "โปรไฟล์ onboarding ไม่ครบ", en: "Incomplete profile onboarding" },
};

export default function MarketingSignalsPage() {
  const { uiLanguage } = useMarketingContext();
  const { activeBusinessId } = useMarketingBusinesses();
  const { signals, isLoading, syncToPipeline, isSyncing, lastSyncedCount } =
    useMarketingInternalSignals(activeBusinessId);

  const sync = async () => {
    if (!activeBusinessId) {
      toast.error(uiLanguage === "th" ? "เลือก business ก่อน" : "Select a business first");
      return;
    }
    try {
      const count = await syncToPipeline();
      toast.success(
        uiLanguage === "th" ? `Sync แล้ว ${count} รายการเข้า pipeline` : `Synced ${count} leads to pipeline`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    }
  };

  return (
    <div className="space-y-4">
      <MarketingCard className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="marketing-section-label text-xs font-semibold uppercase tracking-wide">
              <Radio className="mr-1 inline h-3.5 w-3.5" />
              {marketingT(uiLanguage, "signals")}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-admin-fg">
              {uiLanguage === "th" ? "สัญญาณจากผู้ใช้ในแพลตฟอร์ม" : "In-app platform signals"}
            </h2>
            <p className="mt-1 text-sm text-admin-muted">
              {uiLanguage === "th"
                ? "ข้อมูลจาก profiles, jobs, hiring, collab, UX research — กด Sync เพื่อ upsert เข้า Leads (แท็บ In-app)"
                : "Live platform data — Sync upserts tagged internal leads"}
            </p>
          </div>
          <button
            type="button"
            disabled={isSyncing || !activeBusinessId}
            onClick={() => void sync()}
            className="marketing-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {uiLanguage === "th" ? "Sync to pipeline" : "Sync to pipeline"}
          </button>
        </div>
        {typeof lastSyncedCount === "number" && (
          <p className="mt-2 text-xs text-admin-muted">
            {uiLanguage === "th" ? "รอบล่าสุด:" : "Last sync:"} +{lastSyncedCount}
          </p>
        )}
      </MarketingCard>

      <MarketingCard className="overflow-hidden">
        <div className="border-b border-admin-border px-5 py-3 text-sm text-admin-muted">
          {isLoading
            ? uiLanguage === "th"
              ? "กำลังโหลด..."
              : "Loading..."
            : `${signals.length} ${uiLanguage === "th" ? "สัญญาณ" : "signals"}`}
        </div>
        <div className="divide-y divide-admin-border">
          {signals.map((s) => {
            const label = kindLabel[s.kind][uiLanguage];
            return (
              <div key={s.id} className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="marketing-chip rounded-full px-2 py-0.5 text-[11px] font-medium">{label}</span>
                    <span className="text-xs text-admin-muted">score {s.score}</span>
                  </div>
                  <p className="mt-1 font-medium text-admin-fg">{s.title}</p>
                  <p className="text-sm text-admin-muted">{s.summary}</p>
                </div>
                <a
                  href={s.adminUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-sm text-admin-accent hover:underline"
                >
                  Admin
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            );
          })}
          {!isLoading && signals.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-admin-muted">
              {uiLanguage === "th" ? "ไม่พบสัญญาณในขณะนี้" : "No signals right now"}
            </p>
          )}
        </div>
      </MarketingCard>

      <p className="text-xs text-admin-muted">
        <Link to="/admin/marketing/leads" className="text-admin-accent hover:underline">
          {uiLanguage === "th" ? "ดู Leads pipeline" : "View leads pipeline"}
        </Link>
      </p>
    </div>
  );
}
