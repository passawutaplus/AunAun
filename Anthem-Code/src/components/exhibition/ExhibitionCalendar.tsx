import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { addDays, addMonths, format, startOfWeek } from "date-fns";
import { enUS, th, zhCN } from "date-fns/locale";
import {
  ArrowRight,
  ArrowUpDown,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEventStats } from "@/hooks/useExhibitionEvents";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { googleCalendarLink } from "@/lib/googleCalendarLink";
import {
  EVENT_CATEGORIES,
  categoryLabel,
  formatEventDates,
  type ExhibitionEvent,
} from "@/lib/exhibitionEvents";
import { cn } from "@/lib/utils";
import { formatDate, formatDateRange, tr, useLang, useT } from "@/lib/i18n";
import { LIST } from "@/lib/i18n/exhibition/list";

const DAY_PICKER_LOCALE = { th, en: enUS, zh: zhCN } as const;

type SortKey = "ending" | "newest" | "popular" | "category";
const SORT_KEYS: SortKey[] = ["ending", "newest", "popular", "category"];
const SORT_LABEL = { ending: "sortEnding", newest: "sortNewest", popular: "sortPopular", category: "sortCategory" } as const;
const SORT_STORE = "samecor:exhibition-calendar-sort";

/** Last day an event runs (no end date → its start; no dates at all → last). */
const lastDay = (e: ExhibitionEvent) => e.ends_on ?? e.starts_on ?? "9999-12-31";

type Props = {
  events: ExhibitionEvent[];
  className?: string;
};

/** Google Calendar glyph (four-colour frame, "31" tile) drawn inline so it needs no asset. */
function GoogleCalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
    >
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
  return events.filter(
    (e) =>
      e.starts_on && e.starts_on <= iso && (e.ends_on ?? e.starts_on) >= iso,
  );
}

/** Days with at least one event, for the dot markers — computed once per month view. */
function eventDays(events: ExhibitionEvent[], from: Date, to: Date): Date[] {
  const out: Date[] = [];
  for (let d = from; d <= to; d = addDays(d, 1))
    if (eventsOn(events, d).length) out.push(d);
  return out;
}

const gcalFor = (event: ExhibitionEvent) =>
  googleCalendarLink({
    ...event,
    url:
      typeof window !== "undefined"
        ? `${window.location.origin}/exhibition/${event.id}`
        : null,
  });

/** Colours for ticked events' date bars (brand red marks the selected day, so it's not used here). */
const TRACK_COLORS = ["#F5F5F4", "#60A5FA", "#4ADE80"]; // up to 3 ticked at once
const TRACK_KEY = "samecor:calendar-tracked";
const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

function EventRow({
  event,
  color,
  onToggle,
}: {
  event: ExhibitionEvent;
  /** Bar colour when ticked; undefined = not ticked. */
  color?: string;
  /** Null hides the tick box (range view off). */
  onToggle: (() => void) | null;
}) {
  const on = !!color;
  const t = useT(LIST);
  return (
    <li className="flex items-center gap-3 py-3">
      {onToggle ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={on}
          aria-label={t(on ? "hideRangeOf" : "showRangeOf", { title: event.title })}
          onClick={onToggle}
          disabled={!event.starts_on}
          className={cn(
            "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:opacity-30",
            on
              ? "border-transparent text-neutral-950"
              : "border-foreground/30 hover:border-foreground",
          )}
          style={on ? { backgroundColor: color } : undefined}
        >
          {on ? (
            <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
          ) : null}
        </button>
      ) : null}
      <Link
        to={`/exhibition/${event.id}`}
        className="shrink-0"
        tabIndex={-1}
        aria-hidden
      >
        <span className="block h-16 w-16 overflow-hidden rounded-[3px] bg-muted">
          {event.cover_url ? (
            <img
              src={event.cover_url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
            </span>
          )}
        </span>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {categoryLabel(event.category)}
        </p>
        <Link
          to={`/exhibition/${event.id}`}
          className="line-clamp-1 text-base font-semibold text-foreground hover:underline"
        >
          {event.title}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {/* Start – end only; opening hours live on the event page. */}
          {event.starts_on ? (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" aria-hidden />
              {formatEventDates(event.starts_on, event.ends_on)}
            </span>
          ) : null}
          {event.location_name ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden /> {event.location_name}
            </span>
          ) : null}
        </p>
      </div>
      <Link
        to={`/exhibition/${event.id}`}
        aria-label={t("openEvent", { title: event.title })}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-foreground hover:text-background"
      >
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </li>
  );
}

/** Footer "Add to Google Calendar": one event → direct link; several → pick which one. */
function AddToGoogle({ events }: { events: ExhibitionEvent[] }) {
  const withLink = events
    .map((e) => ({ e, href: gcalFor(e) }))
    .filter((x): x is { e: ExhibitionEvent; href: string } => !!x.href);
  const t = useT(LIST);
  const cls =
    "inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline disabled:opacity-50";
  if (withLink.length === 0) {
    return (
      <span
        className={cn(cls, "cursor-default text-muted-foreground no-underline")}
      >
        <GoogleCalendarIcon className="h-4 w-4 opacity-50" /> {t("addToGoogleCalendar")}
      </span>
    );
  }
  if (withLink.length === 1) {
    return (
      <a
        href={withLink[0].href}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
      >
        <GoogleCalendarIcon className="h-4 w-4" /> {t("addToGoogleCalendar")}{" "}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cls}>
          <GoogleCalendarIcon className="h-4 w-4" /> {t("addToGoogleCalendar")}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[16rem] rounded-xl p-1.5"
      >
        {withLink.map(({ e, href }) => (
          <DropdownMenuItem
            key={e.id}
            asChild
            className="cursor-pointer rounded-lg"
          >
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <span className="truncate">{e.title}</span>
              <ExternalLink
                className="ml-auto h-3 w-3 shrink-0 text-muted-foreground"
                aria-hidden
              />
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
  const t = useT(LIST);
  const lang = useLang();
  const today = useMemo(() => new Date(), []);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const week = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(today);
  const [selected, setSelected] = useState<Date>(today);
  // Ticked events: their date ranges show as coloured bars on the month grid (kept in this browser).
  const [tracked, setTracked] = useState<string[]>(() => {
    try {
      const v: unknown = JSON.parse(localStorage.getItem(TRACK_KEY) ?? "[]");
      return Array.isArray(v)
        ? v
            .filter((x): x is string => typeof x === "string")
            .slice(0, TRACK_COLORS.length)
        : [];
    } catch {
      return [];
    }
  });
  // "ดูช่วงวัน" mode: shows the tick boxes; turning it off clears the ticks.
  const [rangeMode, setRangeModeState] = useState(() => tracked.length > 0);
  const setRangeMode = (on: boolean) => {
    setRangeModeState(on);
    if (!on) {
      setTracked([]);
      try {
        localStorage.removeItem(TRACK_KEY);
      } catch {
        /* ignore */
      }
    }
  };
  const toggleTracked = (id: string) =>
    setTracked((cur) => {
      if (!cur.includes(id) && cur.length >= TRACK_COLORS.length) {
        toast.info(tr(LIST.maxTracked, { n: TRACK_COLORS.length }, lang));
        return cur;
      }
      const next = cur.includes(id)
        ? cur.filter((x) => x !== id)
        : [...cur, id];
      try {
        localStorage.setItem(TRACK_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  const colorOf = (id: string) => {
    const i = tracked.indexOf(id);
    return i >= 0 ? TRACK_COLORS[i] : undefined;
  };
  /** day → bars for the ticked events covering it. */
  const bars = useMemo(() => {
    const map = new Map<
      string,
      Array<{ color: string; start: boolean; end: boolean }>
    >();
    tracked.forEach((id, i) => {
      const e = events.find((x) => x.id === id);
      if (!e?.starts_on) return;
      const end =
        e.ends_on && e.ends_on >= e.starts_on ? e.ends_on : e.starts_on;
      const from = new Date(month.getFullYear(), month.getMonth() - 1, 20);
      const to = new Date(month.getFullYear(), month.getMonth() + 1, 12);
      for (let d = from; d <= to; d = addDays(d, 1)) {
        const k = dayKey(d);
        if (k < e.starts_on || k > end) continue;
        const list = map.get(k) ?? [];
        list.push({
          color: TRACK_COLORS[i],
          start: k === e.starts_on,
          end: k === end,
        });
        map.set(k, list);
      }
    });
    return map;
  }, [tracked, events, month]);

  const monthDots = useMemo(() => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    return eventDays(events, from, to);
  }, [events, month]);

  const weekCount = useMemo(
    () =>
      new Set(week.flatMap((d) => eventsOn(events, d).map((e) => e.id))).size,
    [events, week],
  );
  const weekEnd = week[6];
  // formatRange drops the repeated month / year ("3 – 9 Nov 2026").
  const weekLabel = formatDateRange(isoDay(weekStart), isoDay(weekEnd), lang);

  const [sort, setSortState] = useState<SortKey>(() => {
    try {
      const v = localStorage.getItem(SORT_STORE);
      return SORT_KEYS.includes(v as SortKey) ? (v as SortKey) : "ending";
    } catch {
      return "ending";
    }
  });
  const setSort = (v: SortKey) => {
    setSortState(v);
    try {
      localStorage.setItem(SORT_STORE, v);
    } catch {
      /* ignore */
    }
  };
  const dayEvents = eventsOn(events, selected);
  const { data: dayStats } = useEventStats(open && sort === "popular" ? dayEvents.map((e) => e.id) : []);
  const catOrder = (id: string) => {
    const i = EVENT_CATEGORIES.findIndex((c) => c.id === id);
    return i < 0 ? EVENT_CATEGORIES.length : i;
  };
  const dayList = [...dayEvents].sort((a, b) => {
    if (sort === "newest") return (b.starts_on ?? "").localeCompare(a.starts_on ?? "");
    if (sort === "popular") {
      const sa = dayStats?.[a.id];
      const sb = dayStats?.[b.id];
      return (sb?.interest_count ?? 0) - (sa?.interest_count ?? 0) || (sb?.view_count ?? 0) - (sa?.view_count ?? 0);
    }
    if (sort === "category") return catOrder(a.category) - catOrder(b.category) || lastDay(a).localeCompare(lastDay(b));
    return lastDay(a).localeCompare(lastDay(b));
  });
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
    window.setTimeout(
      () =>
        document
          .querySelector("[data-event-list]")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      150,
    );
  };

  return (
    <section
      className={cn("py-1", className)}
      aria-labelledby="week-events-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="week-events-heading"
            className="whitespace-nowrap text-lg font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            This Week's Events
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {weekLabel} <span aria-hidden>·</span>{" "}
            <span
              className="inline-flex items-center gap-0.5"
              aria-label={t("nEventsAria", { n: weekCount })}
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {weekCount}
            </span>
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 rounded-full px-2.5 sm:pl-3.5"
          onClick={() => openOn(today)}
          aria-label={t("fullCalendar")}
        >
          <CalendarDays className="h-4 w-4 sm:mr-1.5" aria-hidden />
          <span className="hidden sm:inline">{t("fullCalendar")}</span>
          <ChevronRight className="h-4 w-4 sm:ml-1.5" aria-hidden />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-1.5rem)] max-w-5xl gap-0 overflow-y-auto overscroll-contain rounded-2xl p-0 max-sm:w-[calc(100vw-1.5rem)]">
          <DialogHeader className="px-4 pb-3 pt-5 text-left sm:px-6 sm:pb-4 sm:pt-6">
            <DialogTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Event Calendar
            </DialogTitle>
            <DialogDescription>
              {t("exploreUpcoming")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 px-4 pb-5 sm:px-6 sm:pb-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* Month grid with its own nav row: ‹ Month › … Today */}
            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMonth(addMonths(month, -1))}
                    aria-label={t("prevMonth")}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-muted hover:bg-muted/70"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </button>
                  <span className="min-w-[10rem] text-center text-lg font-semibold text-foreground">
                    {formatDate(month, { month: "long", year: "numeric" }, lang)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMonth(addMonths(month, 1))}
                    aria-label={t("nextMonth")}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-muted hover:bg-muted/70"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
              <Calendar
                mode="single"
                locale={DAY_PICKER_LOCALE[lang]}
                required
                weekStartsOn={1}
                month={month}
                onMonthChange={setMonth}
                selected={selected}
                onSelect={(d) => d && setSelected(d)}
                modifiers={{ hasEvent: tracked.length ? [] : monthDots }}
                components={{
                  DayContent: ({ date }) => (
                    <>
                      <span className="relative z-[1]">{date.getDate()}</span>
                      {(bars.get(dayKey(date)) ?? []).map((b, i) => (
                        <span key={i} aria-hidden>
                          {/* Line runs from the start day's centre to the end day's centre; a dot marks each end. */}
                          {!(b.start && b.end) ? (
                            <span
                              className={cn(
                                "absolute h-[3px]",
                                b.start ? "left-1/2" : "-left-px",
                                b.end ? "right-1/2" : "-right-px",
                              )}
                              style={{
                                backgroundColor: b.color,
                                bottom: 5 + i * 6,
                              }}
                            />
                          ) : null}
                          {b.start || b.end ? (
                            <span
                              className="absolute left-1/2 h-[9px] w-[9px] -translate-x-1/2 rounded-full"
                              style={{
                                backgroundColor: b.color,
                                bottom: 2 + i * 6,
                              }}
                            />
                          ) : null}
                        </span>
                      ))}
                    </>
                  ),
                }}
                modifiersClassNames={{
                  hasEvent:
                    "relative after:absolute after:bottom-1 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-brand",
                }}
                className="p-0"
                classNames={{
                  caption: "hidden",
                  nav: "hidden",
                  // Fluid columns: seven equal cells that shrink with the dialog on narrow phones.
                  months: "w-full",
                  month: "w-full space-y-2",
                  table: "w-full table-fixed border-collapse",
                  head_row: "",
                  row: "",
                  head_cell: "pb-1 text-xs font-medium text-muted-foreground sm:text-sm",
                  cell: "h-10 p-0 text-center text-sm relative sm:h-12 sm:text-base",
                  day: "relative mx-auto flex h-10 w-full max-w-12 items-center justify-center rounded-lg p-0 text-sm font-medium transition-colors hover:bg-muted aria-selected:opacity-100 sm:h-12 sm:text-base",
                  day_selected:
                    "bg-brand text-neutral-950 hover:bg-brand after:bg-neutral-950",
                  day_today: "ring-1 ring-brand/60",
                  day_outside: "text-muted-foreground/40",
                }}
              />
            </div>

            {/* The picked day */}
            <div className="min-w-0 md:max-h-[30rem] md:overflow-y-auto md:pr-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="whitespace-nowrap text-lg font-semibold text-foreground sm:text-2xl">
                    {formatDate(
                      selected,
                      {
                        weekday: "short",
                        day: "numeric",
                        month: lang === "zh" ? "long" : "short",
                        year: "numeric",
                      },
                      lang,
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("nEvents", { n: dayList.length })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-full",
                      rangeMode &&
                        "border-brand bg-brand/10 text-brand hover:text-brand",
                    )}
                    aria-pressed={rangeMode}
                    aria-label={
                      rangeMode ? t("rangeOff") : t("rangeOnAria")
                    }
                    title={
                      rangeMode
                        ? t("rangeOff")
                        : t("rangeOnTitle", { n: TRACK_COLORS.length })
                    }
                    onClick={() => setRangeMode(!rangeMode)}
                  >
                    <CalendarRange className="h-4 w-4" aria-hidden />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        aria-label={`${t("sortBy")}: ${t(SORT_LABEL[sort])}`}
                        title={`${t("sortBy")}: ${t(SORT_LABEL[sort])}`}
                      >
                        <ArrowUpDown className="h-4 w-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[60] min-w-[11rem]">
                      <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{t("sortBy")}</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                        {SORT_KEYS.map((k) => (
                          <DropdownMenuRadioItem key={k} value={k}>
                            {t(SORT_LABEL[k])}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full"
                    onClick={goToday}
                  >
                    {t("today")}
                  </Button>
                </div>
              </div>
              {dayList.length ? (
                <ul className="mt-2 divide-y divide-border">
                  {dayList.map((e, i) => (
                    <Fragment key={e.id}>
                      {/* By category: a small heading where each group starts. */}
                      {sort === "category" && (i === 0 || dayList[i - 1].category !== e.category) ? (
                        <li className="pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground first:pt-1" aria-hidden>
                          {categoryLabel(e.category, lang)}
                        </li>
                      ) : null}
                      <EventRow
                        event={e}
                        color={colorOf(e.id)}
                        onToggle={rangeMode ? () => toggleTracked(e.id) : null}
                      />
                    </Fragment>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
                  {t("noEventsThisDay")}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
            <AddToGoogle events={dayList} />
            <Button
              type="button"
              className="rounded-full bg-foreground text-background hover:bg-foreground/90"
              onClick={viewAll}
            >
              {t("viewAllEvents")}{" "}
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
