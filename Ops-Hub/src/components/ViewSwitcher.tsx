import type { HubView } from "@/hooks/useHubMetrics";

const VIEWS: { id: HubView; label: string }[] = [
  { id: "all", label: "รวม" },
  { id: "so1o", label: "So1o" },
  { id: "an1hem", label: "an1hem" },
];

export function ViewSwitcher({
  value,
  onChange,
  compact = false,
}: {
  value: HubView;
  onChange: (v: HubView) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`${compact ? "flex w-full flex-col gap-1" : "inline-flex"} rounded-xl border border-border bg-white p-1 shadow-sm`}
    >
      {VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onChange(v.id)}
          className={`rounded-lg ${compact ? "w-full px-2 py-1 text-xs" : "px-4 py-1.5 text-sm"} font-medium transition ${
            value === v.id
              ? v.id === "an1hem"
                ? "bg-an1hem text-white"
                : v.id === "so1o"
                  ? "bg-brand text-white"
                  : "bg-ink text-white"
              : "text-muted hover:text-ink"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
