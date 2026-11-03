import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, addMonths, format, startOfWeek } from "date-fns";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock, ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { googleCalendarLink } from "@/lib/googleCalendarLink";
import { categoryLabel, formatEventDates, type ExhibitionEvent } from "@/lib/exhibitionEvents";
import { cn } from "@/lib/utils";

type Props = {
  events: ExhibitionEvent[];
  className?: string;
};

/** Google Calendar glyph (four-colour frame, "31" tile) drawn inline so it needs no asset. */
function GoogleCalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path fill="#fff" d="M6 6h12v12H6z" />
      <path fill="#1a73e8" d="M18 24l4-4h-4z" />
      <path fill="#fbbc04" d="M18 6h4v14h-4z" />
      <path fill="#34a853" d="M6 18h12v4H6z" />
      <path fill="#4285f4" d="M2 20a2 2 0 0 0 2 2h2v-4H2z" />
      <path fill="#188038" d="M22 6V4a2 2 0 0 0-2-2h-2v4z" />
      <path fill="#1967d2" d="M2 6h4V2H4a2 2 0 0 0-2 2z" />
      <path fill="#4285f4" d="M6 2h12v4H6z" />
      <path fill="#4285f4" d="M2 6h4v12H2z" />
      <path
        fill="#1a73e8"
        d="M9.3 14.3c-.4-.3-.7-.7-.9-1.2l1-.4c.1.3.3.6.5.8.2.2.5.3.8.3.3 0 .6-.1.8-.3.2-.2.4-.4.4-.7 0-.3-.1-.6-.4-.8-.3-.2-.6-.3-1-.3h-.6v-1h.5c.3 0 .6-.1.8-.3.2-.2.3-.4.3-.7 0-.3-.1-.5-.3-.7-.2-.2-.4-.3-.7-.3-.3 0-.5.1-.7.3-.2.1-.3.4-.4.6l-1-.4c.1-.4.4-.7.7-1 .4-.3.8-.4 1.3-.4.4 0 .7.1 1 .2.3.2.5.4.7.6.2.3.3.6.3.9 0 .3-.1.6-.3.9-.2.2-.4.4-.6.5.3.1.6.3.8.6.2.3.3.6.3 1s-.1.7-.3 1c-.2.3-.5.5-.8.7-.3.2-.7.3-1.1.3-.5 0-1-.2-1.4-.4zM15.5 9.7l-1.1.8-.6-.8 2-1.5h.8v7.4h-1.1z"
      />
    </svg>
  );
}

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

const gcalFor = (event: ExhibitionEvent) =>
  googleCalendarLink({
    ...event,
    url: typeof window !== "undefined" ? `${window.location.origin}/exhibition/${event.id}` : null,
  });

function EventRow({ event }: { event: ExhibitionEvent }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Link to={`/exhibition/${event.id}`} className="shrink-0" tabIndex={-1} aria-hidden>
        <span className="block h-14 w-14 overflow-hidden rounded-lg bg-muted">
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
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{categoryLabel(event.category)}</p>
        <Link to={`/exhibition/${event.id}`} className="line-clamp-1 text-sm font-semibold text-foreground hover:underline">
          {event.title}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden />
            {event.time_note ?? (event.starts_on ? formatEventDates(event.starts_on, event.ends_on) : "")}
          </span>
          {event.location_name ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden /> {event.location_name}
            </span>
          ) : null}
        </p>
      </div>
      <Link
        to={`/exhibition/${event.id}`}
        aria-label={`เปิด ${event.title}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-foreground hover:text-background"
      >
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </li>
  );
}

/** Footer "Add to Google Calendar": one event → direct link; several → pick which one. */
function AddToGoogle({ events }: { events: ExhibitionEvent[] }) {
  const withLink = events.map((e) => ({ e, href: gcalFor(e) })).filter((x): x is { e: ExhibitionEvent; href: string } => !!x.href);
  const cls = "inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline disabled:opacity-50";
  if (withLink.length === 0) {
    return (
      <span className={cn(cls, "cursor-default text-muted-foreground no-underline")}>
        <GoogleCalendarIcon className="h-4 w-4 opacity-50" /> Add to Google Calendar
      </span>
    );
  }
  if (withLink.length === 1) {
    return (
      <a href={withLink[0].href} target="_blank" rel="noopener noreferrer" className={cls}>
        <GoogleCalendarIcon className="h-4 w-4" /> Add to Google Calendar <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cls}>
          <GoogleCalendarIcon className="h-4 w-4" /> Add to Google Calendar
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[16rem] rounded-xl p-1.5">
        {withLink.map(({ e, href }) => (
          <DropdownMenuItem key={e.id} asChild className="cursor-pointer rounded-lg">
            <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <span className="truncate">{e.title}</span>
              <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * "This week" heading (date range + event count) and a Full Calendar dialog
 * (month grid → the picked day's events → add to Google Calendar).
 */
export function ExhibitionCalendar({ events, className }: Props) {
  const today = useMemo(() => new Date(), []);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(today);
  const [selected, setSelected] = useState<Date>(today);

  const monthDots = useMemo(() => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    return eventDays(events, from, to);
  }, [events, month]);

  const weekCount = useMemo(
    () => new Set(week.flatMap((d) => eventsOn(events, d).map((e) => e.id))).size,
    [events, week],
  );
  const weekEnd = week[6];
  const weekLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${format(weekStart, "d")} – ${format(weekEnd, "d MMM yyyy")}`
      : `${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM yyyy")}`;

  const dayList = eventsOn(events, selected);
  const openOn = (d: Date) => {
    setSelected(d);
    setMonth(d);
    setOpen(true);
  };
  const goToday = () => {
    setSelected(today);
    setMonth(today);
  };
  const viewAll = () => {
    setOpen(false);
    window.setTimeout(() => document.querySelector("[data-event-list]")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  };

  return (
    <section className={cn("py-1", className)} aria-labelledby="week-events-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="week-events-heading" className="whitespace-nowrap text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
            This Week's Events
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {weekLabel} <span aria-hidden>·</span> {weekCount} {weekCount === 1 ? "Event" : "Events"}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-full pl-3.5 pr-2.5" onClick={() => openOn(today)}>
          <CalendarDays className="mr-1.5 h-4 w-4" aria-hidden /> Full Calendar
          <ChevronRight className="ml-1.5 h-4 w-4" aria-hidden />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl gap-0 rounded-2xl p-0">
          <DialogHeader className="px-6 pb-4 pt-6 text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight">Event Calendar</DialogTitle>
            <DialogDescription>Explore upcoming creative events</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 px-6 pb-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* Month grid with its own nav row: ‹ Month › … Today */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setMonth(addMonths(month, -1))} aria-label="เดือนก่อน" className="flex h-8 w-8 items-center justify-center rounded-full bg-muted hover:bg-muted/70">
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </button>
                  <span className="min-w-[9rem] text-center text-base font-semibold text-foreground">{format(month, "MMMM yyyy")}</span>
                  <button type="button" onClick={() => setMonth(addMonths(month, 1))} aria-label="เดือนถัดไป" className="flex h-8 w-8 items-center justify-center rounded-full bg-muted hover:bg-muted/70">
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
              <Calendar
                mode="single"
                required
                weekStartsOn={1}
                month={month}
                onMonthChange={setMonth}
                selected={selected}
                onSelect={(d) => d && setSelected(d)}
                modifiers={{ hasEvent: monthDots }}
                modifiersClassNames={{
                  hasEvent:
                    "relative after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-brand",
                }}
                className="p-0"
                classNames={{
                  caption: "hidden",
                  nav: "hidden",
                  table: "w-full border-collapse",
                  head_cell: "w-11 pb-1 text-xs font-medium text-muted-foreground",
                  cell: "h-11 w-11 p-0 text-center text-sm relative",
                  day: "h-11 w-11 rounded-lg p-0 text-sm font-medium transition-colors hover:bg-muted aria-selected:opacity-100",
                  day_selected: "bg-brand text-neutral-950 hover:bg-brand after:bg-neutral-950",
                  day_today: "ring-1 ring-brand/60",
                  day_outside: "text-muted-foreground/40",
                }}
              />
            </div>

            {/* The picked day */}
            <div className="min-w-0 md:max-h-[26rem] md:overflow-y-auto md:pr-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold text-foreground">{format(selected, "EEE, d MMM yyyy")}</p>
                  <p className="text-xs text-muted-foreground">{dayList.length} Events</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 rounded-full" onClick={goToday}>
                  Today
                </Button>
              </div>
              {dayList.length ? (
                <ul className="mt-2 divide-y divide-border">
                  {dayList.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </ul>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">ไม่มีงานในวันนี้</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
            <AddToGoogle events={dayList} />
            <Button type="button" className="rounded-full bg-foreground text-background hover:bg-foreground/90" onClick={viewAll}>
              View All Events <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
