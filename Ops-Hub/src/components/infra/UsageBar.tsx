export function UsageBar({
  percent,
  label,
}: {
  percent: number | null | undefined;
  label: string;
}) {
  if (percent == null || Number.isNaN(percent)) {
    return <p className="text-xs text-muted">{label}: ไม่มีข้อมูล quota</p>;
  }
  const clamped = Math.min(100, Math.max(0, percent));
  const color =
    clamped >= 90 ? "bg-red-500" : clamped >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-mono tabular-nums text-ink">{clamped.toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
