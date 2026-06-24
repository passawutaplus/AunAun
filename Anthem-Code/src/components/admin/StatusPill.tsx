interface Props {
  status: string;
  tone?: "default" | "accent" | "muted";
}
export default function StatusPill({ status, tone = "default" }: Props) {
  const cls =
    tone === "accent"
      ? "border-admin-accent text-admin-accent"
      : tone === "muted"
      ? "border-admin-border text-admin-muted"
      : "border-admin-fg text-admin-fg";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm border font-mono text-[10px] uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}
