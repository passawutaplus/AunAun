import { Link } from "react-router-dom";
import { Bookmark, CalendarDays, Ticket } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMyEventList } from "@/hooks/useExhibitionEvents";
import { formatEventDates, isEventEnded, type ExhibitionEvent } from "@/lib/exhibitionEvents";
import { cn } from "@/lib/utils";

function EventMiniCard({ event }: { event: ExhibitionEvent }) {
  const ended = isEventEnded(event);
  return (
    <Link
      to={`/exhibition/${event.id}`}
      className="group block min-w-0 focus-visible:outline-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted group-focus-visible:ring-2 group-focus-visible:ring-foreground">
        {event.cover_url ? (
          <img
            src={event.cover_url}
            alt=""
            className={cn("h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]", ended && "grayscale")}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="flex h-full items-center justify-center" aria-hidden>
            <CalendarDays className="h-6 w-6 text-muted-foreground" />
          </span>
        )}
        {ended ? (
          <span className="absolute left-2 top-2 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            จบแล้ว
          </span>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-1 text-sm font-medium text-foreground group-hover:underline">{event.title}</p>
      <p className="line-clamp-1 text-xs text-muted-foreground">
        {event.starts_on ? formatEventDates(event.starts_on, event.ends_on) : "ไม่ระบุวัน"}
        {event.location_name ? ` · ${event.location_name}` : ""}
      </p>
    </Link>
  );
}

function Section({
  kind,
  title,
  icon: Icon,
  empty,
}: {
  kind: "registered" | "interested";
  title: string;
  icon: LucideIcon;
  empty: string;
}) {
  const { data = [], isLoading } = useMyEventList(kind);
  return (
    <section aria-labelledby={`pf-ex-${kind}`} className="space-y-3">
      <h3 id={`pf-ex-${kind}`} className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        {title}
        <span className="font-normal text-muted-foreground tabular-nums">{data.length}</span>
      </h3>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : data.length ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
          {data.map((e) => (
            <EventMiniCard key={e.id} event={e} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {empty}{" "}
          <Link to="/exhibition" className="font-medium text-foreground underline underline-offset-4">
            ดู Exhibition
          </Link>
        </p>
      )}
    </section>
  );
}

/** Portfolio → Exhibition: events you pressed register on, and events you marked สนใจ. Only you see this tab. */
export default function PortfolioExhibitionPanel() {
  return (
    <div className="space-y-10">
      <Section kind="registered" title="ลงทะเบียน" icon={Ticket} empty="งานที่คุณกดลงทะเบียนจะมาอยู่ตรงนี้" />
      <Section kind="interested" title="สนใจ" icon={Bookmark} empty="กดสนใจบนงานที่อยากไป แล้วเราจะเตือนก่อนงานเริ่ม" />
    </div>
  );
}
