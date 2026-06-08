import { Loader2 } from "lucide-react";
import { eventLabel, usePlatformEvents } from "@/hooks/usePlatformEvents";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} นาที`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชม.`;
  return `${Math.floor(hrs / 24)} วัน`;
}

export function ActivityFeed({ compact = false }: { compact?: boolean }) {
  const { data, isLoading, error } = usePlatformEvents(compact ? 20 : 50);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-600">โหลดกิจกรรมไม่สำเร็จ — ลองรีเฟรชหน้านี้</p>
    );
  }

  if (!data?.length) {
    return <p className="text-sm text-muted">ยังไม่มีกิจกรรม</p>;
  }

  return (
    <ul className="space-y-2">
      {data.map((ev) => (
        <li
          key={ev.id}
          className="flex items-start gap-3 rounded-lg border border-border bg-white px-3 py-2 text-sm"
        >
          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{eventLabel(ev.event_type)}</p>
            {ev.target_type ? (
              <p className="truncate text-xs text-muted">
                {ev.target_type}
                {ev.target_id ? ` · ${ev.target_id.slice(0, 8)}` : ""}
              </p>
            ) : null}
          </div>
          <span className="shrink-0 text-[10px] text-muted">{timeAgo(ev.created_at)}</span>
        </li>
      ))}
    </ul>
  );
}
