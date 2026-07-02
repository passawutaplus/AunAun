import type { ReactNode } from "react";
import { ChevronDown, Globe2, Radar } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useKuyRadarContext } from "@/hooks/admin/KuyRadarContext";
import { useKuyRadarBusinesses } from "@/hooks/admin/useKuyRadarBusinesses";
import { BRAND_NAME } from "@/lib/brandConfig";
import { KUY_RADAR_SCOPE_LABEL_EN, KUY_RADAR_SCOPE_LABEL_TH } from "@/lib/kuy-radar/aplus1";
import { kuyProductDescription, kuyT } from "@/lib/kuy-radar/i18n";
import { KuyComplianceBanner } from "./KuyComplianceBanner";

const tabs = [
  { to: "/admin/kuy-radar", end: true, key: "overview" as const },
  { to: "/admin/kuy-radar/setup", key: "setup" as const },
  { to: "/admin/kuy-radar/leads", key: "leads" as const },
  { to: "/admin/kuy-radar/competitors", key: "competitors" as const },
  { to: "/admin/kuy-radar/content", key: "content" as const },
  { to: "/admin/kuy-radar/insights", key: "insights" as const },
  { to: "/admin/kuy-radar/ads", key: "ads" as const },
  { to: "/admin/kuy-radar/offers", key: "offers" as const },
  { to: "/admin/kuy-radar/planner", key: "planner" as const },
  { to: "/admin/kuy-radar/outreach", key: "outreach" as const },
  { to: "/admin/kuy-radar/reports", key: "reports" as const },
  { to: "/admin/kuy-radar/settings", key: "settings" as const },
  { to: "/admin/kuy-radar/manual", key: "manual" as const },
];

export function KuyRadarCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`kuy-card rounded-lg ${className}`}>{children}</section>;
}

export default function KuyRadarShell() {
  const { uiLanguage, toggleUiLanguage } = useKuyRadarContext();
  const { businesses, activeBusinessId, setActiveBusinessId } = useKuyRadarBusinesses();
  const scopeLabel = uiLanguage === "th" ? KUY_RADAR_SCOPE_LABEL_TH : KUY_RADAR_SCOPE_LABEL_EN;

  return (
    <div className="kuy-radar space-y-6">
      <div className="kuy-hero flex flex-col gap-4 rounded-xl p-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className="kuy-chip-brand rounded-full px-3 py-1">{BRAND_NAME} Admin</span>
            <span className="kuy-chip-accent inline-flex items-center gap-1 rounded-full px-3 py-1">
              <Radar className="h-3.5 w-3.5" />
              {scopeLabel}
            </span>
            <span className="kuy-chip rounded-full px-3 py-1">{kuyT(uiLanguage, "productScope")}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-admin-fg md:text-3xl">
            {kuyT(uiLanguage, "commandCenter")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-admin-muted">{kuyT(uiLanguage, "subtitle")}</p>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-admin-muted/90">{kuyProductDescription(uiLanguage)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="kuy-control flex min-w-48 items-center gap-2 rounded-lg px-3 py-2 text-sm">
            <span className="text-admin-muted">{kuyT(uiLanguage, "selectBusiness")}</span>
            <select
              value={activeBusinessId ?? ""}
              onChange={(e) => setActiveBusinessId(e.target.value || null)}
              className="min-w-0 flex-1 bg-transparent font-medium text-admin-fg outline-none"
            >
              {businesses.length === 0 ? (
                <option value="">{kuyT(uiLanguage, "noBusiness")}</option>
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
            className="kuy-control inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold shadow-sm"
          >
            <Globe2 className="h-4 w-4 text-admin-accent" />
            {uiLanguage.toUpperCase()} / {uiLanguage === "th" ? "EN" : "TH"}
          </button>
        </div>
      </div>

      <KuyComplianceBanner />

      <nav className="kuy-nav flex flex-wrap gap-1 rounded-lg p-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `kuy-nav-link rounded-md px-3 py-2 text-xs font-semibold transition ${
                isActive ? "kuy-nav-link-active" : ""
              }`
            }
          >
            {kuyT(uiLanguage, tab.key)}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
