import { useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useMarketingContext } from "@/hooks/admin/MarketingContext";
import { useMarketingBusinesses } from "@/hooks/admin/useMarketingBusinesses";
import { useMarketingInsights } from "@/hooks/admin/useMarketingInsights";
import { marketingT } from "@/lib/marketing/i18n";
import type { MarketingInsightType } from "@/lib/marketing/types";
import { MarketingCard } from "./MarketingShell";

const tabs: { id: MarketingInsightType; label: string }[] = [
  { id: "customer", label: "Customer" },
  { id: "competitor", label: "Competitor" },
  { id: "content", label: "Content" },
  { id: "ads", label: "Ads" },
  { id: "campaign", label: "Campaign" },
  { id: "outreach", label: "Outreach" },
];

export default function MarketingInsightPanel() {
  const { uiLanguage } = useMarketingContext();
  const { activeBusiness, activeBusinessId } = useMarketingBusinesses();
  const { insights, runInsight, isRunning } = useMarketingInsights(activeBusinessId);
  const [tab, setTab] = useState<MarketingInsightType>("customer");

  const latest = insights.find((i) => i.insight_type === tab) ?? insights[0];

  const run = async () => {
    try {
      await runInsight({
        insightType: tab,
        title: `${tab} insight`,
        context: {
          business: activeBusiness?.business_name ?? "Demo",
          category: activeBusiness?.category ?? "",
          keywords: activeBusiness?.main_keyword ?? "",
        },
      });
      toast.success("Insight saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Run failed");
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <MarketingCard className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-admin-fg">AI Marketing Insight</h2>
          <Sparkles className="h-5 w-5 text-emerald-600" />
        </div>
          <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-admin-border bg-admin-hover/50 p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-md px-3 py-2 text-xs font-semibold capitalize ${
                  tab === t.id ? "marketing-nav-link-active" : "marketing-nav-link"
                }`}
              >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={isRunning}
          onClick={() => void run()}
          className="marketing-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm disabled:opacity-60"
        >
          <Wand2 className="h-4 w-4" />
          {isRunning ? "Running…" : "Run task"}
        </button>
        <p className="mt-4 text-xs text-amber-800">{marketingT(uiLanguage, "aiDisclaimer")}</p>
      </MarketingCard>
      <MarketingCard className="p-5">
        {latest ? (
          <div className="space-y-3">
            <h3 className="font-semibold text-admin-fg">{latest.title}</h3>
            <p className="text-sm leading-6 text-admin-fg">{latest.summary}</p>
            <ul className="space-y-2 text-sm">
              {latest.key_findings.map((p) => (
                <li key={p} className="rounded-lg border border-admin-border p-3">
                  {p}
                </li>
              ))}
            </ul>
            {latest.recommendation && (
              <div className="marketing-callout rounded-lg p-4 text-sm">{latest.recommendation}</div>
            )}
          </div>
        ) : (
          <p className="text-sm text-admin-muted">No insights yet — run a task.</p>
        )}
      </MarketingCard>
    </div>
  );
}
