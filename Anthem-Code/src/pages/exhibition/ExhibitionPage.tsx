import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CalendarCheck, CalendarX2, Check, ChevronDown, Clock, Compass, Flame, Hourglass, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import SeoHead from "@/components/SeoHead";
import SearchBar from "@/components/SearchBar";
import FilterChips from "@/components/FilterChips";
import { BrandLogo } from "@/components/brand/BrandLogo";
import ProfileButton from "@/components/ProfileButton";
import FeedModeToggle from "@/components/feed/FeedModeToggle";
import { EventListCard } from "@/components/exhibition/EventParts";
import { ExhibitionCalendar } from "@/components/exhibition/ExhibitionCalendar";
import { FeaturedEventBanner } from "@/components/exhibition/FeaturedEventBanner";
import EmptyState from "@/components/ui/EmptyState";
import QueryStatusPanel from "@/components/ui/QueryStatusPanel";
import { useEventStats, useMyEventInterests, usePublishedEvents } from "@/hooks/useExhibitionEvents";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";
import { useAuth } from "@/hooks/useAuth";
import FeedbackHeaderPill from "@/components/feedback/FeedbackHeaderPill";
import MobileFilterButton from "@/components/feed/MobileFilterButton";
import MobileSearchScreen from "@/components/feed/MobileSearchScreen";
import { OPEN_PHONE_SEARCH_EVENT } from "@/lib/phoneSearch";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { isBetaFeedbackEnabled } from "@/lib/aplus1Launch";
import {
  EVENT_CATEGORIES,
  categoryFromSlug,
  categoryLabel,
  categoryPath,
  eventTiming,
  type EventCategory,
} from "@/lib/exhibitionEvents";
import { COMMON, useT } from "@/lib/i18n";
import { LIST } from "@/lib/i18n/exhibition/list";
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

/** Meta descriptions for the category pages (Thai first: that's what people search here). */
const CATEGORY_SEO: Record<EventCategory, string> = {
  exhibition: "นิทรรศการศิลปะและดีไซน์ที่กำลังจัดในกรุงเทพฯ และทั่วไทย — วันเวลา สถานที่ ค่าเข้าชม และเส้นทาง รวมไว้ที่ SAMECOR",
  workshop: "เวิร์กช็อปศิลปะ ดีไซน์ และงานคราฟต์ที่เปิดรับสมัคร — รายละเอียด วันเวลา ค่าใช้จ่าย และวิธีลงทะเบียน บน SAMECOR",
  art_fair: "อาร์ตแฟร์และดีไซน์แฟร์ในไทย — วันจัดงาน สถานที่ บัตร และไฮไลต์ รวมไว้ที่ SAMECOR",
  talk_forum: "ทอล์กและฟอรัมด้านศิลปะ ดีไซน์ และความคิดสร้างสรรค์ — วิทยากร กำหนดการ และการลงทะเบียน บน SAMECOR",
  open_call: "Open Call ประกวดและเปิดรับผลงานศิลปะ ดีไซน์ ภาพถ่าย — คุณสมบัติ รางวัล ขั้นตอน และวันปิดรับ บน SAMECOR",
  other: "อีเวนต์สร้างสรรค์อื่น ๆ ในไทย — ตลาดนัดศิลปะ เทศกาล และงานเปิดตัว รวมไว้ที่ SAMECOR",
};

/** One dropdown (like Creators' Discovery menu): what's on now, three sorts of it, or ended events. */
type ListView = "now" | "ending" | "newest" | "popular" | "done";
const LIST_VIEWS: ListView[] = ["now", "ending", "newest", "popular", "done"];
const VIEW_LABEL = { now: "now", ending: "sortEnding", newest: "sortNewest", popular: "sortPopular", done: "done" } as const;
const VIEW_ICON: Record<ListView, LucideIcon> = { now: Compass, ending: Hourglass, newest: Clock, popular: Flame, done: CalendarCheck };

export default function ExhibitionPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data = [], isLoading, isError, refetch } = usePublishedEvents();
  // The category lives in the URL (/exhibition/category/open-call) so each one is its own indexable page.
  const { cat } = useParams<{ cat?: string }>();
  const category: EventCategory | "all" = categoryFromSlug(cat) ?? "all";
  const setCategory = (c: EventCategory | "all") =>
    navigate(`${c === "all" ? "/exhibition" : categoryPath(c)}${window.location.search}`, { replace: true });
  useEffect(() => {
    if (cat && !categoryFromSlug(cat)) navigate("/exhibition", { replace: true });
  }, [cat, navigate]);
  const [view, setView] = useState<ListView>("now");
  const when: "now" | "done" = view === "done" ? "done" : "now";
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [searchScreenOpen, setSearchScreenOpen] = useState(false);
  useEffect(() => {
    const q = searchParams.get("q");
    if (q != null) setSearch(q);
  }, [searchParams]);
  useEffect(() => {
    const open = () => setSearchScreenOpen(true);
    window.addEventListener(OPEN_PHONE_SEARCH_EVENT, open);
    return () => window.removeEventListener(OPEN_PHONE_SEARCH_EVENT, open);
  }, []);

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

  const rowIds = useMemo(() => rows.map((e) => e.id), [rows]);
  const { data: stats } = useEventStats(rowIds);

  const sortedRows = useMemo(() => {
    if (view === "now") return rows;
    const end = (e: (typeof rows)[number]) => e.ends_on ?? e.starts_on ?? "9999-12-31";
    return [...rows].sort((a, b) => {
      if (view === "ending") return end(a).localeCompare(end(b));
      if (view === "done") return end(b).localeCompare(end(a)); // most recently ended first
      if (view === "newest") {
        // Opened events first (latest opening on top); upcoming ones after, soonest first.
        const oa = eventTiming(a) === "now";
        const ob = eventTiming(b) === "now";
        if (oa !== ob) return oa ? -1 : 1;
        const sa = a.starts_on ?? "9999-12-31";
        const sb = b.starts_on ?? "9999-12-31";
        return oa ? sb.localeCompare(sa) : sa.localeCompare(sb);
      }
      const sa = stats?.[a.id];
      const sb = stats?.[b.id];
      return (sb?.interest_count ?? 0) - (sa?.interest_count ?? 0) || (sb?.view_count ?? 0) - (sa?.view_count ?? 0);
    });
  }, [rows, view, stats]);
  const { data: myInterests } = useMyEventInterests(rowIds);

  const scrolled = useFeedHomeNavStore((st) => st.scrolled);
  const { user } = useAuth();
  const showBetaFeedback = Boolean(user) && isBetaFeedbackEnabled();
  const mobileBarRef = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const { hidden: mobileBarHidden, scrolled: mobileBarScrolled } = useHideOnScroll(mobileBarRef);
  const reduceMotion = useReducedMotion();
  const t = useT(LIST);
  const tc = useT(COMMON);
  const categoryOptions = [
    { id: "all" as const, label: t("all") },
    ...EVENT_CATEGORIES.map((c) => ({ id: c.id, label: categoryLabel(c.id) })),
  ];

  const toggle = <FeedModeToggle value="showcase" exhibitionActive onChange={(m) => navigate(`/?mode=${m}`)} />;
  const searchBar = (compact?: boolean) => (
    <SearchBar
      value={search}
      onChange={setSearch}
      placeholder={t("searchPlaceholder")}
      expandable
      expandAnchor="end"
      compact={compact}
    />
  );
  const ViewIcon = VIEW_ICON[view];
  const viewMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 shrink-0 gap-1.5 rounded-full border-border/60 bg-background/80 px-3.5 backdrop-blur-md"
          aria-label={`${t("sortBy")}: ${t(VIEW_LABEL[view])}`}
        >
          <ViewIcon className="h-3.5 w-3.5" aria-hidden />
          <span className="text-sm font-medium">{t(VIEW_LABEL[view])}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 rounded-xl">
        {LIST_VIEWS.map((v) => {
          const I = VIEW_ICON[v];
          return (
            <DropdownMenuItem key={v} onClick={() => setView(v)} className="flex cursor-pointer items-center gap-2">
              <I className="h-4 w-4 opacity-70" aria-hidden />
              <span className="flex-1 text-sm">{t(VIEW_LABEL[v])}</span>
              {v === view ? <Check className="h-4 w-4 text-primary" aria-hidden /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const filters = (
    <div className="flex min-w-0 items-center gap-3 lg:justify-center lg:gap-6">
      {viewMenu}
      <div className="min-w-0 flex-1 lg:flex-none">
        <FilterChips
          align={isMobile ? "start" : "center"}
          options={categoryOptions}
          selected={category}
          onSelect={(id) => setCategory(id as EventCategory | "all")}
        />
      </div>
    </div>
  );

  return (
    <main id="main-content" className={cn("relative min-h-screen bg-app-ambient", MOBILE_PAGE_BOTTOM_CLASS)}>
      <SeoHead
        title={category === "all" ? "Exhibition & Events" : `${categoryLabel(category, "en")} — Exhibition & Events`}
        description={category === "all" ? t("seoDescription") : CATEGORY_SEO[category]}
        path={category === "all" ? "/exhibition" : categoryPath(category)}
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
                aria-label={`${BRAND_NAME} ${tc("home")}`}
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

      <div className="relative z-[1] mx-auto max-w-[1920px] px-3 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-0 sm:px-[calc(1rem+25px)] lg:pb-4 lg:px-[calc(1.5rem+25px)] lg:pt-4 2xl:px-[calc(2.5rem+25px)]">
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
            aria-label={`${BRAND_NAME} ${tc("home")}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandLogo showWordmark={false} size="md" />
          </Link>
          {showBetaFeedback ? <FeedbackHeaderPill className="ml-auto" /> : null}
          <MobileFilterButton
            count={(view !== "now" ? 1 : 0) + (category !== "all" ? 1 : 0)}
            onClick={() => setFilterOpen(true)}
            className={cn(!showBetaFeedback && "ml-auto")}
          />
          <div className="min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{toggle}</div>
          </div>
        </div>

        <MobileSearchScreen
          open={searchScreenOpen}
          onClose={() => setSearchScreenOpen(false)}
          initialScope="exhibition"
          initialValue={search}
          userId={user?.id}
          onSubmit={(scope, q) => {
            if (scope === "exhibition") setSearch(q);
            else navigate(`/?${new URLSearchParams({ ...(scope === "creators" ? { mode: "creators" } : {}), q }).toString()}`);
          }}
        />

        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetContent side="bottom" className="rounded-t-3xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <SheetTitle className="text-base">{t("filterTitle")}</SheetTitle>
            <div className="mt-4 space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t("timing")}</p>
                <div className="flex flex-wrap gap-2">
                  {LIST_VIEWS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={view === v}
                      onClick={() => setView(v)}
                      className={cn(
                        "min-h-9 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                        view === v
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-foreground hover:border-foreground/50",
                      )}
                    >
                      {t(VIEW_LABEL[v])}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t("eventType")}</p>
                <div className="flex flex-wrap gap-2">
                  {categoryOptions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={category === c.id}
                      onClick={() => setCategory(c.id)}
                      className={cn(
                        "min-h-9 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                        category === c.id
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-foreground hover:border-foreground/50",
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="button" className="w-full rounded-full" onClick={() => setFilterOpen(false)}>
                {t("showN", { n: rows.length })}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Phones: a plain title instead of the hero slideshow, like the other modes. */}
        <h1 className="pb-5 pt-4 text-[3.25rem] font-semibold leading-[0.9] tracking-tight text-foreground sm:text-7xl lg:hidden">
          Exhibition <span className="block text-muted-foreground">&amp; Events</span>
        </h1>

        <div className={cn("hidden min-w-0 items-center justify-center gap-3 pb-4 pt-3 lg:flex", scrolled && "invisible")}>
          <div className="shrink-0">{searchBar()}</div>
          <div className="flex min-w-0 max-w-[min(36rem,calc(100vw-2rem))] shrink items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {toggle}
          </div>
        </div>

        {/* Type tabs sit right under the mode pill, as on Showcase / Creators. */}
        <div className={cn("hidden pb-4 lg:block", scrolled && "lg:invisible")}>{filters}</div>

        {/* Desktop: a plain page title, like Showcase / Creators (no slideshow). */}
        <h2 className="hidden pb-8 pt-10 text-[5.25rem] font-semibold leading-[0.8] tracking-tight text-foreground lg:block xl:text-[6.5rem]">
          Exhibition <span className="text-muted-foreground">&amp; Events</span>
        </h2>

        {/* This week + full calendar; uses every published event, not just the filtered list. */}
        <ExhibitionCalendar events={data} className="mb-8" />

        {/* Team-pinned event (one at a time), under This Week. */}
        <FeaturedEventBanner className="mb-8" />


        <div>
      {isLoading || isError ? (
        <QueryStatusPanel
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          errorTitle={t("loadFailed")}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title={when === "done" ? t("emptyDone") : t("emptyNow")}
          description={t("emptyHint")}
          className="py-16"
        />
      ) : (
        <div data-event-list>
          {sortedRows.map((e) => (
            <EventListCard key={e.id} event={e} stats={stats?.[e.id]} interested={myInterests?.has(e.id)} />
          ))}
        </div>
      )}
        </div>
      </div>
    </main>
  );
}
