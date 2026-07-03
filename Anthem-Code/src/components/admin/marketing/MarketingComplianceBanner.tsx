import { useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { useMarketingContext } from "@/hooks/admin/MarketingContext";
import { COMPLIANCE_RULES_EN, COMPLIANCE_RULES_TH } from "@/lib/marketing/compliance";
import { marketingT } from "@/lib/marketing/i18n";

export function MarketingComplianceBanner() {
  const { uiLanguage } = useMarketingContext();
  const [open, setOpen] = useState(true);
  const rules = uiLanguage === "th" ? COMPLIANCE_RULES_TH : COMPLIANCE_RULES_EN;

  return (
    <div className="marketing-callout-warn rounded-lg">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-admin-fg"
      >
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-admin-accent" />
          {marketingT(uiLanguage, "complianceBanner")}
        </span>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="space-y-2 border-t border-admin-border/60 px-4 py-3 text-sm text-admin-muted">
          {rules.map((rule) => (
            <li key={rule} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-admin-accent" />
              {rule}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
