import BriefcaseIcon from "../icons/BriefcaseIcon";
import { NavLink } from "react-router-dom";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brandConfig";
import { useAdminRealtime } from "@/hooks/admin/useAdminRealtime";
import { useAdminAlertCounts } from "@/hooks/admin/useAdminAlerts";
import { adminSidebarSections, type AdminBadgeKey, type AdminNavItem } from "@/lib/admin/adminNavigation";
import { OPS_HUB_URL } from "@/lib/productLinks";

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto min-w-[1.25rem] h-5 px-1 rounded-full bg-admin-accent text-admin-bg text-[10px] font-mono flex items-center justify-center">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function AdminSidebar() {
  useAdminRealtime();
  const { data: alerts } = useAdminAlertCounts();
  const sections = adminSidebarSections();

  const badgeCount = (key?: AdminBadgeKey) => {
    if (!key || !alerts) return 0;
    if (key === "reports") return alerts.openReports;
    if (key === "cashouts") return alerts.pendingCashouts;
    if (key === "kyc") return alerts.pendingKyc;
    if (key === "aml") return alerts.openAml;
    return 0;
  };

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-admin-border bg-admin-surface min-h-screen sticky top-0">
      <div className="px-5 py-6 border-b border-admin-border">
        <BrandLogo size="sm" showWordmark={false} className="mb-2" />
        <p className="font-medium text-sm text-admin-fg">{BRAND_NAME} Admin</p>
        <p className="mt-0.5 text-[11px] leading-snug text-admin-muted">{BRAND_TAGLINE}</p>
      </div>
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {sections.map((sec, i) => (
          <div key={sec.id} className={i > 0 ? "mt-4" : ""}>
            <p className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-admin-muted/70">
              {sec.title}
            </p>
            <div className="space-y-0.5">
              {sec.items.map((it: AdminNavItem) => (
                <NavLink
                  key={`${sec.id}-${it.to}-${it.label}`}
                  to={it.to}
                  end={it.end}
                  title={it.hint}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-colors ${
                      isActive
                        ? "bg-admin-fg text-admin-bg"
                        : "text-admin-muted hover:bg-admin-hover hover:text-admin-fg"
                    }`
                  }
                >
                  <it.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{it.label}</span>
                  <NavBadge count={badgeCount(it.badgeKey)} />
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-admin-border space-y-2">
        <a
          href={OPS_HUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs font-mono uppercase tracking-wider text-admin-accent hover:underline"
        >
          Ops Hub ↗
        </a>
        <NavLink to="/" className="block text-xs font-mono uppercase tracking-wider text-admin-muted hover:text-admin-accent">
          ← กลับสู่เว็บไซต์
        </NavLink>
      </div>
    </aside>
  );
}
