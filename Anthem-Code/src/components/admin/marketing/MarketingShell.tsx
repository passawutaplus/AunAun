import type { ReactNode } from "react";
import { ChevronDown, Globe2, Megaphone } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useMarketingContext } from "@/hooks/admin/MarketingContext";
import { useMarketingBusinesses } from "@/hooks/admin/useMarketingBusinesses";
import { BRAND_NAME } from "@/lib/brandConfig";
import { MARKETING_SCOPE_LABEL_EN, MARKETING_SCOPE_LABEL_TH } from "@/lib/marketing/aplus1";
import { marketingProductDescription, marketingT } from "@/lib/marketing/i18n";
import { MarketingComplianceBanner } from "./MarketingComplianceBanner";

const tabs = [
  { to: "/admin/marketing", end: true, key: "overview" as const },
  { to: "/admin/marketing/setup", key: "setup" as const },
  { to: "/admin/marketing/signals", key: "signals" as const },
  { to: "/admin/marketing/leads", key: "leads" as const },
  { to: "/admin/marketing/competitors", key: "competitors" as const },
  { to: "/admin/marketing/content", key: "content" as const },
  { to: "/admin/marketing/insights", key: "insights" as const },
  { to: "/admin/marketing/ads", key: "ads" as const },
  { to: "/admin/marketing/offers", key: "offers" as const },
  { to: "/admin/marketing/planner", key: "planner" as const },
  { to: "/admin/marketing/outreach", key: "outreach" as const },
  { to: "/admin/marketing/reports", key: "reports" as const },
  { to: "/admin/marketing/settings", key: "settings" as const },
  { to: "/admin/marketing/manual", key: "manual" as const },
];

export function MarketingCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`marketing-card rounded-lg ${className}`}>{children}</section>;
}

export default function MarketingShell() {
  const { uiLanguage, toggleUiLanguage } = useMarketingContext();
  const { businesses, activeBusinessId, setActiveBusinessId } = useMarketingBusinesses();
  const scopeLabel = uiLanguage === "th" ? MARKETING_SCOPE_LABEL_TH : MARKETING_SCOPE_LABEL_EN;

  return (
    <div className="marketing-module space-y-6">
      <div className="marketing-hero flex flex-col gap-4 rounded-xl p-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className="marketing-chip-brand rounded-full px-3 py-1">{BRAND_NAME} Admin</span>
            <span className="marketing-chip-accent inline-flex items-center gap-1 rounded-full px-3 py-1">
              <Megaphone className="h-3.5 w-3.5" />
              {scopeLabel}
            </span>
            <span className="marketing-chip rounded-full px-3 py-1">{marketingT(uiLanguage, "productScope")}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-admin-fg md:text-3xl">
            {marketingT(uiLanguage, "commandCenter")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-admin-muted">{marketingT(uiLanguage, "subtitle")}</p>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-admin-muted/90">{marketingProductDescription(uiLanguage)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="marketing-control flex min-w-48 items-center gap-2 rounded-lg px-3 py-2 text-sm">
            <span className="text-admin-muted">{marketingT(uiLanguage, "selectBusiness")}</span>
            <select
              value={activeBusinessId ?? ""}
              onChange={(e) => setActiveBusinessId(e.target.value || null)}
              className="min-w-0 flex-1 bg-transparent font-medium text-admin-fg outline-none"
            >
              {businesses.length === 0 ? (
                <option value="">{marketingT(uiLanguage, "noBusiness")}</option>
              ) : (
                businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.business_name}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="h-4 w-4 text-admin-muted" />
          </label>
          <button
            type="button"
            onClick={toggleUiLanguage}
            className="marketing-control inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold shadow-sm"
          >
            <Globe2 className="h-4 w-4 text-admin-accent" />
            {uiLanguage.toUpperCase()} / {uiLanguage === "th" ? "EN" : "TH"}
          </button>
        </div>
      </div>

      <MarketingComplianceBanner />

      <nav className="marketing-nav flex flex-wrap gap-1 rounded-lg p-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `marketing-nav-link rounded-md px-3 py-2 text-xs font-semibold transition ${
                isActive ? "marketing-nav-link-active" : ""
              }`
            }
          >
            {marketingT(uiLanguage, tab.key)}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
