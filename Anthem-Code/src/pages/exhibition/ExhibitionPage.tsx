import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarX2, Plus } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import SearchBar from "@/components/SearchBar";
import FilterChips from "@/components/FilterChips";
import { BrandLogo } from "@/components/brand/BrandLogo";
import FeedModeToggle from "@/components/feed/FeedModeToggle";
import { EventListCard } from "@/components/exhibition/EventParts";
import EmptyState from "@/components/ui/EmptyState";
import QueryStatusPanel from "@/components/ui/QueryStatusPanel";
import { Button } from "@/components/ui/button";
import { useEventStats, useMyEventLikes, usePublishedEvents } from "@/hooks/useExhibitionEvents";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { EVENT_CATEGORIES, eventTiming, type EventCategory, type EventTiming } from "@/lib/exhibitionEvents";
import { BRAND_NAME } from "@/lib/brandConfig";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { cn } from "@/lib/utils";


function matchesSearch(e: { title: string; location_name: string | null; organizer_name: string | null }, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [e.title, e.location_name, e.organizer_name].some((v) => v?.toLowerCase().includes(needle));
}

export default function ExhibitionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { data = [], isLoading, isError, refetch } = usePublishedEvents();
  const [category, setCategory] = useState<EventCategory | "all">("all");
  const [when, setWhen] = useState<EventTiming>("now");
  const [search, setSearch] = useState("");

  const rows = useMemo(
    () =>
      data.filter(
        (e) =>
          (category === "all" || e.category === category) &&
          eventTiming(e) === when &&
          matchesSearch(e, search),
      ),
    [data, category, when, search],
  );

  const rowIds = useMemo(() => rows.map((e) => e.id), [rows]);
  const { data: stats } = useEventStats(rowIds);
  const { data: myLikes } = useMyEventLikes(rowIds);

  const addHref = "/dashboard/exhibition/new";

  const addLink = user ? addHref : `/auth?redirect=${encodeURIComponent(addHref)}`;
  const toggle = <FeedModeToggle value="showcase" exhibitionActive onChange={(m) => navigate(`/?mode=${m}`)} />;

  return (
    <main id="main-content" className={cn("relative min-h-screen bg-app-ambient", MOBILE_PAGE_BOTTOM_CLASS)}>
      <SeoHead
        title="Exhibition & Events"
        description="นิทรรศการ เวิร์กช็อป และอีเวนต์สร้างสรรค์จากครีเอเตอร์บน SAMECOR — ทีมงานตรวจทุกงานก่อนเผยแพร่"
        path="/exhibition"
      />
      <div className="relative z-[1] mx-auto max-w-[1920px] px-3 pb-4 pt-4 sm:px-[calc(1rem+25px)] lg:px-[calc(1.5rem+25px)] 2xl:px-[calc(2.5rem+25px)]">
        {/* Same head as the Showcase / Creators catalog: search · mode pill · add, chips, big title. */}
        <div className="flex items-center gap-2 py-3 lg:hidden">
          <Link
            to="/"
            aria-label={`${BRAND_NAME} หน้าแรก`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandLogo showWordmark={false} size="md" />
          </Link>
          <div className="ml-auto min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{toggle}</div>
        </div>

        <div className="flex flex-col gap-y-1 pb-6 lg:pb-8 lg:pt-3">
          <h1 className="order-last mt-6 pb-2 text-5xl font-semibold leading-[0.8] tracking-tight text-foreground lg:mt-14 lg:pb-4 lg:text-[5.25rem] xl:text-[6.5rem]">
            Exhibition
          </h1>
          <div className="hidden min-w-0 items-center justify-center gap-3 lg:flex">
            <div className="shrink-0">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="ค้นหางาน สถานที่ ผู้จัด"
                expandable
                expandAnchor="end"
              />
            </div>
            <div className="flex min-w-0 max-w-[min(36rem,calc(100vw-2rem))] shrink items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {toggle}
            </div>
            <Link
              to={addLink}
              aria-label="ลงงานใหม่"
              className="group inline-flex h-9 shrink-0 items-center overflow-hidden rounded-full bg-foreground px-[0.6rem] text-sm font-medium text-background transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:px-4 focus-visible:px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
            >
              <Plus className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
              <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:ml-1.5 group-hover:max-w-[9rem] group-hover:opacity-100 group-focus-visible:ml-1.5 group-focus-visible:max-w-[9rem] group-focus-visible:opacity-100 motion-reduce:transition-none">
                ลงงานใหม่
              </span>
            </Link>
          </div>
          <div className="flex min-w-0 flex-col items-stretch gap-3 lg:mt-3 lg:flex-row lg:items-center lg:justify-center lg:gap-6">
            <div className="flex self-start rounded-full bg-muted/60 p-0.5 lg:self-auto" role="group" aria-label="ช่วงเวลา">
              {(
                [
                  ["now", "Now"],
                  ["soon", "Soon"],
                  ["done", "Done"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={when === id}
                  onClick={() => setWhen(id)}
                  className={cn(
                    "min-h-8 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                    when === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <FilterChips
              align={isMobile ? "start" : "center"}
              options={[{ id: "all", label: "All" }, ...EVENT_CATEGORIES]}
              selected={category}
              onSelect={(id) => setCategory(id as EventCategory | "all")}
            />
          </div>
        </div>

        <div>
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
          title={when === "done" ? "ยังไม่มีงานที่จบแล้วในหมวดนี้" : when === "soon" ? "ยังไม่มีงานที่กำลังจะมาในหมวดนี้" : "ยังไม่มีงานที่กำลังจัดในหมวดนี้"}
          description="ลงงานของคุณเป็นคนแรก — ทีมงานตรวจภายใน 1–3 วันทำการ"
          action={
            <Button asChild variant="outline" className="rounded-full">
              <Link to={addLink}>ลงงานใหม่</Link>
            </Button>
          }
          className="py-16"
        />
      ) : (
        <div>
          {rows.map((e) => (
            <EventListCard key={e.id} event={e} stats={stats?.[e.id]} liked={myLikes?.has(e.id)} />
          ))}
        </div>
      )}
        </div>
      </div>
    </main>
  );
}
