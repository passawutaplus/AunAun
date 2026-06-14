import { ExternalLink } from "lucide-react";
import {
  MONITOR_SITES,
  STATUS_LABEL,
  STATUS_STYLE,
  mergeHealthIntoChecklist,
  type MonitorSite,
} from "@/lib/monitoring-checklist";
import type { HealthProbeResult } from "@/lib/infra-monitor-types";

function ChecklistCard({ site }: { site: MonitorSite }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-ink">{site.name}</h3>
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-muted hover:text-brand"
          >
            {site.url}
          </a>
        </div>
        <span className="text-[10px] text-muted">{site.items.length} รายการ</span>
      </div>
      <ul className="space-y-2">
        {site.items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              {item.href ? (
                <a
                  href={item.href}
                  target={item.href.startsWith("/") ? undefined : "_blank"}
                  rel={item.href.startsWith("/") ? undefined : "noopener noreferrer"}
                  className="group flex items-center gap-1 text-sm font-medium text-ink hover:text-brand"
                >
                  {item.label}
                  {!item.href.startsWith("/") ? (
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                  ) : null}
                </a>
              ) : (
                <p className="text-sm font-medium text-ink">{item.label}</p>
              )}
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.description}</p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[item.status]}`}
            >
              {STATUS_LABEL[item.status]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MonitoringChecklistSection({
  health,
}: {
  health: HealthProbeResult[] | undefined;
}) {
  const sites = mergeHealthIntoChecklist(MONITOR_SITES, health);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">เช็คลิสต์มอนิเตอร์ต่อเว็บ</h2>
        <p className="mt-0.5 text-xs text-muted">
          รายการที่ควรติดตาม — รายการที่มี health probe จะอัปเดตสถานะอัตโนมัติ
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {sites.map((site) => (
          <ChecklistCard key={site.id} site={site} />
        ))}
      </div>
    </section>
  );
}
