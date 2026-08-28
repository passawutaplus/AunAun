import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  localDayIso,
  monthCells,
  upcomingStudioCalendarEvents,
  type StudioCalendarEvent,
} from "@/lib/studioCalendar";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

type Props = {
  events: StudioCalendarEvent[];
};

function dayIso(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function upcomingLabel(iso: string, todayIso: string): string {
  if (iso === todayIso) return "วันนี้";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (iso === localDayIso(tomorrow)) return "พรุ่งนี้";
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export default function StudioCalendarCard({ events }: Props) {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const todayIso = localDayIso();
  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const monthLabel = cursor.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  const upcoming = useMemo(() => upcomingStudioCalendarEvents(events, todayIso), [events, todayIso]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, StudioCalendarEvent[]>();
    for (const event of events) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [events]);

  return (
    <section className="space-y-3 rounded-2xl glass-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
          ปฏิทิน
        </h2>
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          aria-label="เดือนก่อน"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-medium text-foreground">{monthLabel}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          aria-label="เดือนถัดไป"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((day) => (
          <p key={day} className="py-0.5 text-center text-[10px] font-medium text-muted-foreground">
            {day}
          </p>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <div key={`empty-${index}`} className="h-8" />;
          const iso = dayIso(year, month, day);
          const dayEvents = eventsByDay.get(iso) ?? [];
          const isToday = iso === todayIso;
          const hasEvent = dayEvents.length > 0;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => {
                if (dayEvents[0]) navigate(dayEvents[0].to);
              }}
              className={cn(
                "flex h-8 flex-col items-center justify-center gap-0.5 rounded-md text-xs transition-colors",
                isToday && "bg-primary/15 font-semibold text-primary",
                !isToday && hasEvent && "hover:bg-secondary/60",
                !isToday && !hasEvent && "text-foreground/80",
              )}
              aria-label={
                hasEvent ? `${day} มีกำหนดส่ง ${dayEvents.length} รายการ` : `${day}`
              }
            >
              <span className="leading-none">{day}</span>
              {hasEvent ? (
                <span
                  className={cn(
                    "h-1 w-1 rounded-full",
                    dayEvents[0]?.kind === "hire" ? "bg-primary" : "bg-sky-500",
                  )}
                />
              ) : (
                <span className="h-1 w-1" />
              )}
            </button>
          );
        })}
      </div>

      <div className="border-t border-border/60 pt-3">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          กำหนดส่ง / นัดหมาย
        </p>
        {upcoming.length === 0 ? (
          <p className="text-xs text-muted-foreground">ยังไม่มีกำหนดส่ง</p>
        ) : (
          <ul className="space-y-1">
            {upcoming.map((event) => (
              <li key={event.id}>
                <Link
                  to={event.to}
                  className="flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-xs hover:bg-secondary/50"
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      event.kind === "hire" ? "bg-primary" : "bg-sky-500",
                    )}
                  />
                  <span className="shrink-0 font-medium tabular-nums text-foreground">
                    {upcomingLabel(event.date, todayIso)}
                  </span>
                  <span className="text-muted-foreground">—</span>
                  <span className="min-w-0 truncate text-muted-foreground">{event.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
