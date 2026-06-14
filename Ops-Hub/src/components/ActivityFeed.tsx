import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  eventLabel,
  usePlatformEvents,
  type ActivityFilter,
} from "@/hooks/usePlatformEvents";

const FILTER_OPTIONS: { id: ActivityFilter; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "ecosystem", label: "Ecosystem" },
  { id: "so1o", label: "So1o" },
  { id: "an1hem", label: "an1hem" },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} นาที`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชม.`;
  return `${Math.floor(hrs / 24)} วัน`;
}

type Props = {
  compact?: boolean;
  filter?: ActivityFilter;
  onFilterChange?: (f: ActivityFilter) => void;
};

export function ActivityFeed({ compact = false, filter = "all", onFilterChange }: Props) {
  const { data, isLoading, error } = usePlatformEvents(compact ? 20 : 50, filter);

  return (
    <div className="space-y-3">
      {!compact && onFilterChange ? (
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onFilterChange(opt.id)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                filter === opt.id
                  ? "bg-brand text-white"
                  : "border border-border bg-white text-muted hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-8 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">โหลดกิจกรรมไม่สำเร็จ — ลองรีเฟรชหน้านี้</p>
      ) : !data?.length ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/30 px-4 py-6 text-sm text-muted">
          <p>ยังไม่มีกิจกรรม{filter !== "all" ? " ในหมวดนี้" : ""}</p>
          <p className="mt-2 text-xs">
            ต้อง deploy migration <code className="text-[10px]">platform_events triggers</code> ใน Solo-Code
            — signup, publish, ecosystem convert, cashout
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((ev) => (
            <li
              key={ev.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-white px-3 py-2 text-sm"
            >
              <span
                className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                  ev.event_type.startsWith("ecosystem.") ? "bg-an1hem" : "bg-brand"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{eventLabel(ev.event_type)}</p>
                {ev.target_type ? (
                  <p className="truncate text-xs text-muted">
                    {ev.target_type}
                    {ev.target_id ? ` · ${ev.target_id.slice(0, 8)}` : ""}
                  </p>
                ) : null}
                {ev.actor_id ? (
                  <Link
                    to={`/users/${ev.actor_id}`}
                    className="text-[10px] text-brand hover:underline"
                  >
                    ดู User 360
                  </Link>
                ) : null}
              </div>
              <span className="shrink-0 text-[10px] text-muted">{timeAgo(ev.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
