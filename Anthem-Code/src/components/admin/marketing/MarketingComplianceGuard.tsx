import { useState } from "react";
import { AlertTriangle, Download, LockKeyhole, ShieldCheck } from "lucide-react";
import { useMarketingContext } from "@/hooks/admin/MarketingContext";
import { COMPLIANCE_RULES_EN, COMPLIANCE_RULES_TH } from "@/lib/marketing/compliance";
import { marketingT } from "@/lib/marketing/i18n";
import { MarketingCard } from "./MarketingShell";

type Props = {
  onExport: (format: "csv" | "xlsx" | "pdf") => void | Promise<void>;
  disabled?: boolean;
};

export function MarketingComplianceGuard({ onExport, disabled }: Props) {
  const { uiLanguage } = useMarketingContext();
  const [exportReady, setExportReady] = useState(false);
  const rules = uiLanguage === "th" ? COMPLIANCE_RULES_TH : COMPLIANCE_RULES_EN;

  return (
    <MarketingCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="marketing-section-label text-xs font-semibold uppercase tracking-wide">Compliance Guard</p>
          <h2 className="mt-1 text-lg font-semibold text-admin-fg">
            {uiLanguage === "th" ? "เช็กก่อน export" : "Check before export"}
          </h2>
        </div>
        <LockKeyhole className="h-5 w-5 text-admin-accent" />
      </div>
      <div className="mt-4 space-y-3 text-sm">
        {rules.map((rule) => (
          <div key={rule} className="flex gap-2 rounded-lg border border-admin-border bg-admin-hover/40 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-admin-accent" />
            <p className="leading-5 text-admin-fg">{rule}</p>
          </div>
        ))}
      </div>
      <label className="marketing-callout-warn mt-4 flex cursor-pointer items-start gap-3 rounded-lg p-3 text-sm">
        <input
          type="checkbox"
          checked={exportReady}
          onChange={(e) => setExportReady(e.target.checked)}
          className="mt-1 accent-[hsl(var(--admin-accent))]"
        />
        <span className="leading-5 text-admin-fg">{marketingT(uiLanguage, "exportConfirm")}</span>
      </label>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {(["csv", "xlsx", "pdf"] as const).map((format) => (
          <button
            key={format}
            type="button"
            disabled={!exportReady || disabled}
            onClick={() => void onExport(format)}
            className="marketing-btn-primary inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-45"
          >
            {exportReady ? <Download className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {format.toUpperCase()}
          </button>
        ))}
      </div>
    </MarketingCard>
  );
}
