import { Link } from "react-router-dom";
import { ArrowLeftRight, TrendingUp } from "lucide-react";
import { useEcosystemFunnel } from "@/hooks/useEcosystemFunnel";
import { conversionRate } from "@/lib/connection-flows";
import { KpiCard } from "@/components/KpiCard";

export function FlywheelStrip() {
  const { data, isLoading, isError } = useEcosystemFunnel(7);

  if (isError) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Flywheel metrics ยังไม่พร้อม — รัน migration{" "}
        <code className="text-[10px]">20260614120000_ops_hub_ecosystem_control_plane.sql</code>
      </div>
    );
  }

  const totals = data?.totals;
  const rate7d =
    totals && totals.clicks_7d > 0
      ? conversionRate(totals.clicks_7d, totals.converted_7d)
      : 0;

  return (
    <section className="rounded-xl border border-brand/20 bg-gradient-to-r from-brand-soft/40 to-an1hem/5 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-brand" />
          <h2 className="text-sm font-semibold text-ink">Flywheel — So1o ↔ an1hem</h2>
        </div>
        <Link to="/connections" className="text-xs font-medium text-brand hover:underline">
          ดู Connections →
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">กำลังโหลด...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Cross-clicks 24 ชม."
            hint="ผู้ใช้กด CTA ข้ามแอป"
            value={totals?.clicks_24h ?? 0}
            icon={ArrowLeftRight}
            href="/connections"
            external={false}
          />
          <KpiCard
            label="Handoffs 7 วัน"
            hint="convert สำเร็จ (meta.converted_at)"
            value={totals?.converted_7d ?? 0}
            icon={TrendingUp}
            href="/connections"
            external={false}
            accent={!!totals?.converted_7d}
          />
          <KpiCard
            label="Conversion 7 วัน"
            hint="converted / clicks"
            value={`${rate7d}%`}
            icon={TrendingUp}
            href="/connections"
            external={false}
            accent={rate7d >= 20}
          />
          <KpiCard
            label="ค้าง >48h"
            hint="กดแล้วยังไม่ convert"
            value={totals?.stuck_48h ?? 0}
            icon={ArrowLeftRight}
            href="/connections"
            external={false}
            accent={!!totals?.stuck_48h}
          />
        </div>
      )}
    </section>
  );
}
