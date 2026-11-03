import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { CalendarDays, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { googleCalendarLink } from "@/lib/googleCalendarLink";
import { formatEventDates, type ExhibitionEvent } from "@/lib/exhibitionEvents";
import { cn } from "@/lib/utils";

type Props = {
  events: ExhibitionEvent[];
  className?: string;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** YYYY-MM-DD in local time (event dates are plain dates). */
const isoDay = (d: Date) => format(d, "yyyy-MM-dd");

/** Events running on a day (start ≤ day ≤ end; a missing end means one day). */
function eventsOn(events: ExhibitionEvent[], day: Date): ExhibitionEvent[] {
  const iso = isoDay(day);
  return events.filter((e) => e.starts_on && e.starts_on <= iso && (e.ends_on ?? e.starts_on) >= iso);
}

/** Days with at least one event, for the dot markers — computed once per month view. */
function eventDays(events: ExhibitionEvent[], from: Date, to: Date): Date[] {
  const out: Date[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) if (eventsOn(events, d).length) out.push(d);
  return out;
}

function EventRow({ event }: { event: ExhibitionEvent }) {
  const gcal = googleCalendarLink({
    ...event,
    url: typeof window !== "undefined" ? `${window.location.origin}/exhibition/${event.id}` : null,
  });
  return (
    <li className="flex items-start gap-3 py-3">
      <Link to={`/exhibition/${event.id}`} className="shrink-0" tabIndex={-1} aria-hidden>
        <span className="block h-16 w-16 overflow-hidden rounded-lg bg-muted">
          {event.cover_url ? (
            <img src={event.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
            </span>
          )}
        </span>
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/exhibition/${event.id}`} className="line-clamp-2 text-sm font-semibold leading-snug text-foreground hover:underline">
          {event.title}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {event.starts_on ? formatEventDates(event.starts_on, event.ends_on) : ""}
          {event.location_name ? ` · ${event.location_name}` : ""}
        </p>
        {gcal ? (
          <a
            href={gcal}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-foreground hover:border-foreground/50"
            title="เพิ่มลง Google Calendar"
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden /> Google Calendar <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ) : null}
      </div>
    </li>
  );
}

/**
 * "This week" strip with a dot on days that have events, and a Full Calendar dialog
 * (month grid → events on the picked day → add to Google Calendar).
 */
export function ExhibitionCalendar({ events, className }: Props) {
  const today = useMemo(() => new Date(), []);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(today);
  const [selected, setSelected] = useState<Date | undefined>(today);

  const monthDots = useMemo(() => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    return eventDays(events, from, to);
  }, [events, month]);

  const dayList = selected ? eventsOn(events, selected) : [];
  const openOn = (d: Date) => {
    setSelected(d);
    setMonth(d);
    setOpen(true);
  };

  return (
    <section className={cn("rounded-2xl border border-border bg-card p-4 sm:p-5", className)} aria-labelledby="week-events-heading">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="week-events-heading" className="text-lg font-semibold text-foreground">
            This Week's Events
          </h2>
          <p className="text-xs text-muted-foreground">กดวันเพื่อดูงานในวันนั้น</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-full" onClick={() => openOn(today)}>
          <CalendarDays className="mr-1.5 h-4 w-4" aria-hidden /> Full Calendar
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="list" aria-label="สัปดาห์นี้">
        {week.map((d, i) => {
          const has = eventsOn(events, d).length > 0;
          const isToday = isSameDay(d, today);
          return (
            <button
              key={isoDay(d)}
              type="button"
              role="listitem"
              onClick={() => openOn(d)}
              aria-label={`${format(d, "d MMM")}${has ? " มีงาน" : ""}`}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground sm:py-3",
                isToday ? "border-brand bg-brand/10" : "border-border bg-background",
              )}
            >
              <span className="text-[11px] text-muted-foreground">{DAY_LABELS[i]}</span>
              <span className={cn("text-xl font-semibold leading-none sm:text-2xl", isToday && "text-brand")}>{format(d, "d")}</span>
              <span className={cn("h-1.5 w-1.5 rounded-full", has ? "bg-brand" : "bg-transparent")} aria-hidden />
            </button>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Event Calendar</DialogTitle>
            <DialogDescription>จุดสีส้ม = วันที่มีงาน กดวันเพื่อดูรายการ</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <Calendar
              mode="single"
              weekStartsOn={1}
              month={month}
              onMonthChange={setMonth}
              selected={selected}
              onSelect={(d) => setSelected(d ?? undefined)}
              modifiers={{ hasEvent: monthDots }}
              modifiersClassNames={{
                hasEvent:
                  "relative after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-brand",
              }}
              className="mx-auto shrink-0 rounded-xl border border-border p-3"
              classNames={{
                caption_label: "text-base font-semibold",
                head_cell: "w-11 text-xs font-normal text-muted-foreground",
                cell: "h-11 w-11 p-0 text-center text-sm relative",
                day: "h-11 w-11 rounded-lg p-0 text-sm font-medium aria-selected:opacity-100",
              }}
            />
            <div className="min-w-0 flex-1 md:max-h-[26rem] md:overflow-y-auto md:pr-1">
              <p className="text-base font-semibold text-foreground">
                {selected ? format(selected, "d MMM yyyy") : "เลือกวัน"}
                <span className="ml-2 text-xs font-normal text-muted-foreground">{dayList.length} งาน</span>
              </p>
              {dayList.length ? (
                <ul className="mt-2 divide-y divide-border">
                  {dayList.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </ul>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                  ไม่มีงานในวันนี้
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
