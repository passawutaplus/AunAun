import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarX2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import SeoHead from "@/components/SeoHead";
import SearchBar from "@/components/SearchBar";
import FilterChips from "@/components/FilterChips";
import { BrandLogo } from "@/components/brand/BrandLogo";
import ProfileButton from "@/components/ProfileButton";
import FeedModeToggle from "@/components/feed/FeedModeToggle";
import { EventListCard } from "@/components/exhibition/EventParts";
import { ExhibitionHero } from "@/components/exhibition/ExhibitionHero";
import EmptyState from "@/components/ui/EmptyState";
import QueryStatusPanel from "@/components/ui/QueryStatusPanel";
import { useEventStats, useMyEventLikes, usePublishedEvents } from "@/hooks/useExhibitionEvents";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";
import { useAuth } from "@/hooks/useAuth";
import FeedbackHeaderPill from "@/components/feedback/FeedbackHeaderPill";
import { isBetaFeedbackEnabled } from "@/lib/aplus1Launch";
import { EVENT_CATEGORIES, eventTiming, type EventCategory } from "@/lib/exhibitionEvents";
import { BRAND_NAME } from "@/lib/brandConfig";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { smoothEase } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useFeedHomeNavStore } from "@/stores/feedHomeNavStore";

function matchesSearch(e: { title: string; location_name: string | null; organizer_name: string | null }, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [e.title, e.location_name, e.organizer_name].some((v) => v?.toLowerCase().includes(needle));
}

export default function ExhibitionPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data = [], isLoading, isError, refetch } = usePublishedEvents();
  const [category, setCategory] = useState<EventCategory | "all">("all");
  const [when, setWhen] = useState<"now" | "done">("now");
  const [search, setSearch] = useState("");

  const rows = useMemo(
    () =>
      data.filter(
        (e) =>
          (category === "all" || e.category === category) &&
          (eventTiming(e) === "done") === (when === "done") &&
          matchesSearch(e, search),
      ),
    [data, category, when, search],
  );

  const heroEvents = useMemo(
    () => [...data].filter((e) => eventTiming(e) !== "done").sort((x, y) => Number(y.is_pick) - Number(x.is_pick)),
    [data],
  );

  const rowIds = useMemo(() => rows.map((e) => e.id), [rows]);
  const { data: stats } = useEventStats(rowIds);
  const { data: myLikes } = useMyEventLikes(rowIds);

  const scrolled = useFeedHomeNavStore((st) => st.scrolled);
  const { user } = useAuth();
  const showBetaFeedback = Boolean(user) && isBetaFeedbackEnabled();
  const mobileBarRef = useRef<HTMLDivElement>(null);
  const { hidden: mobileBarHidden, scrolled: mobileBarScrolled } = useHideOnScroll(mobileBarRef);
  const reduceMotion = useReducedMotion();

  const toggle = <FeedModeToggle value="showcase" exhibitionActive onChange={(m) => navigate(`/?mode=${m}`)} />;
  const searchBar = (compact?: boolean) => (
    <SearchBar
      value={search}
      onChange={setSearch}
      placeholder="ค้นหางาน สถานที่ ผู้จัด"
      expandable
      expandAnchor="end"
      compact={compact}
    />
  );
  const filters = (
    <div className="flex min-w-0 items-center gap-3 lg:justify-center lg:gap-6">
      <div className="flex shrink-0 rounded-full bg-muted/60 p-0.5" role="group" aria-label="ช่วงเวลา">
        {(
          [
            ["now", "Now"],
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
      <div className="min-w-0 flex-1 lg:flex-none">
        <FilterChips
          align={isMobile ? "start" : "center"}
          options={[{ id: "all", label: "All" }, ...EVENT_CATEGORIES]}
          selected={category}
          onSelect={(id) => setCategory(id as EventCategory | "all")}
        />
      </div>
    </div>
  );

  return (
    <main id="main-content" className={cn("relative min-h-screen bg-app-ambient", MOBILE_PAGE_BOTTOM_CLASS)}>
      <SeoHead
        title="Exhibition & Events"
        description="นิทรรศการ เวิร์กช็อป และอีเวนต์สร้างสรรค์จากครีเอเตอร์บน SAMECOR — ทีมงานตรวจทุกงานก่อนเผยแพร่"
        path="/exhibition"
      />

      {/* Desktop: the same bar the Showcase / Creators feed slides in once its title scrolls away. */}
      <motion.div
        className="fixed inset-x-0 top-0 z-40 hidden lg:block"
        initial={false}
        animate={{ y: scrolled ? "0%" : "-100%" }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: smoothEase }}
        aria-hidden={!scrolled || undefined}
        inert={!scrolled ? "" : undefined}
        style={{ pointerEvents: scrolled ? "auto" : "none" }}
      >
        <div className="border-b border-border bg-background">
          <div className="mx-auto flex max-w-[1920px] flex-col px-[calc(1.5rem+25px)] 2xl:px-[calc(2.5rem+25px)]">
            <div className="relative flex h-14 items-center gap-3 border-b border-border/80">
              <Link
                to="/"
                className="relative z-10 shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`${BRAND_NAME} หน้าแรก`}
              >
                <BrandLogo beta size="sm" tone="theme" />
              </Link>
              <div className="pointer-events-none absolute inset-x-0 top-0 flex h-14 items-center justify-center">
                <div className="pointer-events-auto flex items-center gap-3">
                  {searchBar(true)}
                  <div className="flex min-w-0 max-w-[min(36rem,calc(100vw-28rem))] shrink items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {toggle}
                  </div>
                </div>
              </div>
              <div className="relative z-10 ml-auto">
                <ProfileButton accountOnly />
              </div>
            </div>
            <div className="flex min-h-11 w-full items-center justify-center py-2">{filters}</div>
          </div>
        </div>
      </motion.div>

      <div className="relative z-[1] mx-auto max-w-[1920px] px-3 pb-4 pt-0 sm:px-[calc(1rem+25px)] lg:px-[calc(1.5rem+25px)] lg:pt-4 2xl:px-[calc(2.5rem+25px)]">
        {/* Phones / tablets: the feed's bar — brand mark + mode pill with the type tabs under it;
            it slides away while scrolling down and comes back on the way up. */}
        <div
          ref={mobileBarRef}
          className={cn(
            "sticky top-0 z-40 -mx-3 px-3 py-3 transition-transform duration-300 ease-out motion-reduce:transition-none sm:-mx-[calc(1rem+25px)] sm:px-[calc(1rem+25px)] lg:hidden",
            mobileBarHidden && "-translate-y-full",
            mobileBarScrolled && "border-b border-border bg-background",
          )}
        >
          <div className="flex items-center gap-2">
          <Link
            to="/"
            aria-label={`${BRAND_NAME} หน้าแรก`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandLogo showWordmark={false} size="md" />
          </Link>
          {showBetaFeedback ? <FeedbackHeaderPill className="ml-auto" /> : null}
          <div
            className={cn(
              "min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              !showBetaFeedback && "ml-auto",
            )}
          >
            {toggle}
          </div>
          </div>
          <div className="mt-3">{filters}</div>
        </div>

        {/* Phones: a plain title instead of the hero slideshow, like the other modes. */}
        <h1 className="pb-5 pt-3 text-4xl font-semibold leading-[0.95] tracking-tight text-foreground lg:hidden">
          Exhibition <span className="text-muted-foreground">&amp; Events</span>
        </h1>

        <div className={cn("hidden min-w-0 items-center justify-center gap-3 pb-4 pt-3 lg:flex", scrolled && "invisible")}>
          <div className="shrink-0">{searchBar()}</div>
          <div className="flex min-w-0 max-w-[min(36rem,calc(100vw-2rem))] shrink items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {toggle}
          </div>
        </div>

        {/* Type tabs sit right under the mode pill, as on Showcase / Creators. */}
        <div className={cn("hidden pb-4 lg:block", scrolled && "lg:invisible")}>{filters}</div>

        <ExhibitionHero events={heroEvents} className="mb-6 hidden lg:grid" />

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
          title={when === "done" ? "ยังไม่มีงานที่จบแล้วในหมวดนี้" : "ยังไม่มีงานที่กำลังจัดหรือกำลังจะมาในหมวดนี้"}
          description="ลงงานของคุณได้จากปุ่ม + บนหน้าโปรไฟล์ — ทีมงานตรวจภายใน 1–3 วันทำการ"
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
