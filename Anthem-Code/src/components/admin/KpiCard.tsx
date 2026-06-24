import { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  delta?: string;
  icon?: LucideIcon;
  accent?: boolean;
}

export default function KpiCard({ label, value, delta, icon: Icon, accent }: Props) {
  return (
    <div className="border border-admin-border bg-admin-surface p-4 rounded-sm relative overflow-hidden group hover:border-admin-fg transition-colors">
      <div className="flex items-start justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-admin-muted">{label}</p>
        {Icon && <Icon className="w-3.5 h-3.5 text-admin-muted" />}
      </div>
      <p className={`mt-3 font-mono text-3xl tabular-nums ${accent ? "text-admin-accent" : "text-admin-fg"}`}>
        {value}
      </p>
      {delta && (
        <p className="mt-1 font-mono text-[11px] text-admin-accent">{delta}</p>
      )}
      <div className="absolute -right-2 -bottom-2 w-12 h-12 border border-admin-border rounded-full opacity-40 pointer-events-none" />
    </div>
  );
}
