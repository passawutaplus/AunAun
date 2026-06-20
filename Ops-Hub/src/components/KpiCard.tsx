import type { LucideIcon } from "lucide-react";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  critical,
  href,
  external = true,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: boolean;
  critical?: boolean;
  href?: string;
  external?: boolean;
}) {
  const className = `group rounded-xl border bg-white p-4 shadow-sm transition ${
    critical
      ? "border-red-300 bg-red-50/50 ring-1 ring-red-200"
      : accent
        ? "border-brand/30 bg-brand-soft/40"
        : "border-border"
  } ${href ? "cursor-pointer hover:border-brand/40 hover:shadow-md" : ""}`;

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink">{label}</p>
        <div className="flex shrink-0 items-center gap-1">
          {href ? (
            <ExternalLink className="h-3.5 w-3.5 text-muted opacity-0 transition group-hover:opacity-100" />
          ) : null}
          <Icon className={`h-4 w-4 ${critical ? "text-red-600" : accent ? "text-brand" : "text-muted"}`} />
        </div>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-muted">{hint}</p> : null}
    </>
  );

  if (!href) {
    return <div className={className}>{content}</div>;
  }

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        title={`เปิดดูรายละเอียด: ${label}`}
      >
        {content}
      </a>
    );
  }

  return (
    <Link to={href} className={className} title={`ไปที่: ${label}`}>
      {content}
    </Link>
  );
}
