import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarX2, Plus } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import FeedModeToggle from "@/components/feed/FeedModeToggle";
import { EventListCard } from "@/components/exhibition/EventParts";
import EmptyState from "@/components/ui/EmptyState";
import QueryStatusPanel from "@/components/ui/QueryStatusPanel";
import { Button } from "@/components/ui/button";
import { usePublishedEvents } from "@/hooks/useExhibitionEvents";
import { useAuth } from "@/hooks/useAuth";
import { EVENT_CATEGORIES, isEventEnded, type EventCategory } from "@/lib/exhibitionEvents";
import { cn } from "@/lib/utils";

type When = "upcoming" | "ended";

export default function ExhibitionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data = [], isLoading, isError, refetch } = usePublishedEvents();
  const [category, setCategory] = useState<EventCategory | "all">("all");
  const [when, setWhen] = useState<When>("upcoming");

  const rows = useMemo(
    () =>
      data.filter(
        (e) => (category === "all" || e.category === category) && (when === "ended") === isEventEnded(e),
      ),
    [data, category, when],
  );

  const addHref = "/dashboard/exhibition/new";

  return (
    <div className="container mx-auto max-w-6xl px-4 pb-24 pt-6">
      <SeoHead
        title="Exhibition & Events"
        description="นิทรรศการ เวิร์กช็อป และอีเวนต์สร้างสรรค์จากครีเอเตอร์บน SAMECOR — ทีมงานตรวจทุกงานก่อนเผยแพร่"
        path="/exhibition"
      />

      <div className="mb-6 flex justify-center">
        <FeedModeToggle value="showcase" exhibitionActive onChange={(m) => navigate(`/?mode=${m}`)} />
      </div>

      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="mb-4 block h-0.5 w-10 bg-brand" aria-hidden />
          <h1 className="font-display text-4xl font-semibold leading-none tracking-tight text-foreground sm:text-5xl">
            Exhibition &amp; Events
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            นิทรรศการ เวิร์กช็อป และโอกาสสร้างสรรค์รอบตัวคุณ — ทุกงานผ่านการตรวจจากทีม SAMECOR
          </p>
        </div>
        <Button asChild className="self-start rounded-full sm:self-auto">
          <Link to={user ? addHref : `/auth?redirect=${encodeURIComponent(addHref)}`}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            Add Event
          </Link>
        </Button>
      </header>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="หมวดหมู่">
          {[{ id: "all" as const, label: "All Events" }, ...EVENT_CATEGORIES].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "min-h-9 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2",
                category === c.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-foreground hover:border-foreground/50",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex rounded-full border border-border p-0.5" role="group" aria-label="ช่วงเวลา">
          {(
            [
              ["upcoming", "กำลังจัด & เร็ว ๆ นี้"],
              ["ended", "จบแล้ว"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={when === id}
              onClick={() => setWhen(id)}
              className={cn(
                "min-h-8 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                when === id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading || isError ? (
        <QueryStatusPanel
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          errorTitle="โหลด Exhibition ไม่สำเร็จ"
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title={when === "ended" ? "ยังไม่มีงานที่จบแล้วในหมวดนี้" : "ยังไม่มีงานในหมวดนี้"}
          description="ลงงานของคุณเป็นคนแรก — ทีมงานตรวจภายใน 1–3 วันทำการ"
          action={
            <Button asChild variant="outline" className="rounded-full">
              <Link to={user ? addHref : `/auth?redirect=${encodeURIComponent(addHref)}`}>Add Event</Link>
            </Button>
          }
          className="py-16"
        />
      ) : (
        <div>
          {rows.map((e) => (
            <EventListCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}
