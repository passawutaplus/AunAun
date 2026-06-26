import BriefcaseIcon from "../components/icons/BriefcaseIcon";
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  useOpenJobs,
  useOpenForWorkCreators,
} from "@/hooks/useJobs";
import { useAuth } from "@/hooks/useAuth";
import { requireAuth } from "@/lib/requireAuth";
import JobCard from "@/components/jobs/JobCard";
import CreatorCard from "@/components/jobs/CreatorCard";
import MyWorkPanel from "@/components/jobs/MyWorkPanel";
import JobPostDialog from "@/components/jobs/JobPostDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, ArrowLeft, UserSearch, SlidersHorizontal, X, Briefcase } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";
import SeoHead from "@/components/SeoHead";
import { BRAND_NAME } from "@/lib/brandConfig";
import { markOnboardingVisit } from "@/lib/onboardingStorage";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { resolvePosterEntity, availabilityLabel } from "@/components/jobs/jobCardUtils";
import type { JobPost, OpenForWorkProfile } from "@/hooks/useJobs";

type JobsTabId = "openings" | "available" | "dashboard";

type MyWorkSub = "posted" | "applied" | "invited" | "saved";
type AvailRateFilter = "all" | "hourly" | "daily" | "fixed" | "monthly" | "negotiate";

const LOCATION_CHIPS = [
  { v: "all", label: "ทั้งหมด" },
  { v: "remote", label: "Remote" },
  { v: "onsite", label: "Onsite" },
  { v: "hybrid", label: "Hybrid" },
];

const EMPLOYMENT_CHIPS = [
  { v: "all", label: "ทุกประเภท" },
  { v: "project", label: "Project" },
  { v: "freelance", label: "Freelance" },
  { v: "fulltime", label: "Full-time" },
  { v: "parttime", label: "Part-time" },
  { v: "internship", label: "Internship" },
];

const POSTER_CHIPS = [
  { v: "all", label: "ทุกผู้โพสต์" },
  { v: "personal", label: "Personal" },
  { v: "studio", label: "Studio" },
  { v: "brand", label: "Brand" },
  { v: "project", label: "Project" },
];

const READY_CHIPS = [
  { v: "all", label: "ทั้งหมด" },
  ...Object.entries(availabilityLabel).map(([k, label]) => ({ v: k, label })),
];

const RATE_CHIPS: { v: AvailRateFilter; label: string }[] = [
  { v: "all", label: "ทั้งหมด" },
  { v: "hourly", label: "รายชั่วโมง" },
  { v: "daily", label: "รายวัน" },
  { v: "fixed", label: "เหมาโปรเจกต์" },
  { v: "monthly", label: "รายเดือน" },
  { v: "negotiate", label: "ตามตกลง" },
];

const inferProfileEmployment = (c: OpenForWorkProfile): JobPost["employment_type"] | null => {
  const b = (c.open_for_work_badge ?? "").toLowerCase();
  if (b.includes("full-time") || b.includes("fulltime")) return "fulltime";
  if (b.includes("freelance")) return "freelance";
  return null;
};

const profileMatchesRate = (c: OpenForWorkProfile, rate: AvailRateFilter) => {
  if (rate === "all") return true;
  if (rate === "hourly") return c.hourly_rate_min != null;
  if (rate === "daily") return c.daily_rate_min != null;
  if (rate === "fixed") return c.daily_rate_min != null || !!c.project_rate_note?.trim();
  if (rate === "monthly") return false;
  if (rate === "negotiate") return c.hourly_rate_min == null && c.daily_rate_min == null;
  return true;
};

const jobMatchesRate = (j: JobPost, rate: AvailRateFilter) => {
  if (rate === "all") return true;
  if (rate === "negotiate") return j.budget_min == null && j.budget_max == null;
  if (rate === "hourly") return j.budget_type === "hourly";
  if (rate === "monthly") return j.budget_type === "monthly";
  if (rate === "fixed") return j.budget_type === "fixed";
  if (rate === "daily") return j.budget_type === "fixed" && j.budget_min != null;
  return true;
};

const profileMatchesEmployment = (c: OpenForWorkProfile, emp: string) => {
  if (emp === "all") return true;
  const inferred = inferProfileEmployment(c);
  return inferred == null || inferred === emp;
};

const jobMatchesEmployment = (j: JobPost, emp: string) => emp === "all" || j.employment_type === emp;

const TABS: { id: JobsTabId; label: string; sub: string }[] = [
  { id: "openings", label: "โอกาสใหม่ๆ", sub: "หาคนมาช่วยงาน" },
  { id: "available", label: "พร้อมรับงาน", sub: "หางาน / portfolio" },
  { id: "dashboard", label: "แดชบอร์ด", sub: "ของฉัน" },
];

/** Map legacy ?tab= values to the 3-tab model. */
const resolveTabParam = (raw: string | null): JobsTabId | null => {
  if (!raw) return null;
  const map: Record<string, JobsTabId> = {
    openings: "openings",
    available: "available",
    dashboard: "dashboard",
    opportunities: "openings",
    creators: "available",
    studios: "openings",
    mywork: "dashboard",
  };
  return map[raw] ?? null;
};

const JobsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [tab, setTab] = useState<JobsTabId>("openings");
  const [myWorkSub, setMyWorkSub] = useState<MyWorkSub>("posted");
  const [availEmp, setAvailEmp] = useState("all");
  const [availRoleCat, setAvailRoleCat] = useState("all");
  const [availReady, setAvailReady] = useState("all");
  const [availRate, setAvailRate] = useState<AvailRateFilter>("all");
  const { data: hiringJobs = [], isLoading: loadingHiring } = useOpenJobs({ postType: "hiring", limit: 120 });
  const { data: seekingJobs = [], isLoading: loadingSeeking } = useOpenJobs({ postType: "seeking", limit: 120 });
  const { data: creators = [], isLoading: loadingCreators } = useOpenForWorkCreators({ limit: 60 });
  const [search, setSearch] = useState("");
  const [loc, setLoc] = useState("all");
  const [emp, setEmp] = useState("all");
  const [poster, setPoster] = useState("all");
  const [roleCat, setRoleCat] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"hiring" | "seeking">("hiring");

  useEffect(() => {
    if (user?.id) markOnboardingVisit(user.id, "jobs");
  }, [user?.id]);

  useEffect(() => {
    const resolved = resolveTabParam(searchParams.get("tab"));
    if (resolved) setTab(resolved);
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("post") !== "1") return;
    if (!user) {
      requireAuth(user, () => {});
      return;
    }
    const mode = searchParams.get("mode") === "seeking" ? "seeking" : "hiring";
    setDialogMode(mode);
    setDialogOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("post");
    next.delete("mode");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, user]);

  const roleCategories = useMemo(() => {
    const set = new Set<string>();
    hiringJobs.forEach((j) => j.role_category && set.add(j.role_category));
    return ["all", ...Array.from(set).sort()];
  }, [hiringJobs]);

  const availableRoleCategories = useMemo(() => {
    const set = new Set<string>();
    seekingJobs.forEach((j) => j.role_category && set.add(j.role_category));
    creators.forEach((c) => c.role && set.add(c.role));
    return ["all", ...Array.from(set).sort()];
  }, [seekingJobs, creators]);

  const activeFilterCount =
    (loc !== "all" ? 1 : 0) + (emp !== "all" ? 1 : 0) + (poster !== "all" ? 1 : 0) + (roleCat !== "all" ? 1 : 0);

  const activeAvailableFilterCount =
    (availEmp !== "all" ? 1 : 0)
    + (availRoleCat !== "all" ? 1 : 0)
    + (availReady !== "all" ? 1 : 0)
    + (availRate !== "all" ? 1 : 0);

  const filteredHiring = hiringJobs.filter((j) => {
    const matchLoc = loc === "all" || j.location_type === loc;
    const matchEmp = emp === "all" || j.employment_type === emp;
    const matchPoster = poster === "all" || resolvePosterEntity(j) === poster;
    const matchRole = roleCat === "all" || j.role_category === roleCat;
    const q = search.trim().toLowerCase();
    const matchSearch = !q
      || j.title.toLowerCase().includes(q)
      || j.skills.some((s) => s.toLowerCase().includes(q))
      || j.studio?.name.toLowerCase().includes(q)
      || j.poster?.display_name?.toLowerCase().includes(q);
    return matchLoc && matchEmp && matchPoster && matchRole && matchSearch;
  });

  const filteredAvailable = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromProfiles = creators.filter((c) => {
      if (!profileMatchesEmployment(c, availEmp)) return false;
      if (!profileMatchesRate(c, availRate)) return false;
      if (availRoleCat !== "all" && c.role !== availRoleCat) return false;
      if (availReady !== "all" && c.availability_status !== availReady) return false;
      if (!q) return true;
      return (
        c.display_name.toLowerCase().includes(q)
        || (c.role ?? "").toLowerCase().includes(q)
        || c.skills.some((s) => s.toLowerCase().includes(q))
      );
    });
    const profileIds = new Set(fromProfiles.map((c) => c.user_id));
    const listings = seekingJobs.filter((j) => {
      if (profileIds.has(j.posted_by)) return false;
      if (!jobMatchesEmployment(j, availEmp)) return false;
      if (!jobMatchesRate(j, availRate)) return false;
      if (availRoleCat !== "all" && j.role_category !== availRoleCat) return false;
      if (availReady !== "all" && j.ready_to_start !== availReady) return false;
      if (!q) return true;
      return (
        j.title.toLowerCase().includes(q)
        || j.skills.some((s) => s.toLowerCase().includes(q))
        || j.poster?.display_name?.toLowerCase().includes(q)
      );
    });
    return { profiles: fromProfiles, listings };
  }, [creators, seekingJobs, search, availEmp, availRoleCat, availReady, availRate]);

  const visibleProfiles = filteredAvailable.profiles;
  const visibleListings = filteredAvailable.listings;
  const availableEmpty = visibleProfiles.length === 0 && visibleListings.length === 0;

  const openPostDialog = () => {
    requireAuth(user, () => {
      setDialogMode(tab === "available" ? "seeking" : "hiring");
      setDialogOpen(true);
    });
  };

  const setTabAndUrl = (next: JobsTabId) => {
    setTab(next);
    setSearchParams({ tab: next }, { replace: true });
  };

  const isLoading =
    (tab === "openings" && loadingHiring) ||
    (tab === "available" && (loadingCreators || loadingSeeking));

  return (
    <div className={cn("min-h-screen bg-app-ambient lg:pb-12", MOBILE_PAGE_BOTTOM_CLASS)}>
      <SeoHead
        title="Jobs Board"
        description={`หาโอกาสงาน ประกาศพร้อมรับงาน และจัดการงานของคุณบน ${BRAND_NAME}`}
        path="/jobs"
      />
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => navigate("/")} className="w-9 h-9 rounded-full glass-chip grid place-items-center shrink-0" aria-label="กลับหน้าแรก">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <BriefcaseIcon className="w-6 h-6 sm:w-7 sm:h-7 text-primary shrink-0 hidden sm:block" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-medium tracking-tight truncate">Jobs Board</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground thai-body truncate hidden sm:block">
              โอกาสใหม่ · พร้อมรับงาน · แดชบอร์ด
            </p>
          </div>
          <Button onClick={openPostDialog} size="sm" className="rounded-xl bg-gradient-brand text-white border-0 shrink-0">
            <Plus className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">ลงประกาศ</span>
          </Button>
        </div>

        <div className="flex gap-1 p-1 glass-panel rounded-2xl overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTabAndUrl(t.id)}
              className={cn(
                "flex-1 min-w-[88px] px-3 py-2 rounded-xl text-center transition-colors",
                tab === t.id ? "bg-gradient-brand text-white" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="block text-xs font-medium thai-display">{t.label}</span>
              <span className={cn("block text-[10px]", tab === t.id ? "text-white/80" : "text-muted-foreground")}>{t.sub}</span>
            </button>
          ))}
        </div>

        {tab !== "dashboard" && (
          <div className="glass-panel rounded-2xl p-3 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    tab === "openings"
                      ? "ค้นหางาน, ทักษะ, ผู้ลงประกาศ"
                      : "ค้นหาครีเอเตอร์, ทักษะ, ตำแหน่ง"
                  }
                  className="pl-9 h-10 rounded-xl border-0 bg-background/60"
                />
              </div>
              {tab === "openings" ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={cn("h-10 w-10 rounded-xl glass-chip grid place-items-center relative shrink-0", activeFilterCount > 0 && "text-primary")} aria-label="ตัวกรอง">
                      <SlidersHorizontal className="w-4 h-4" />
                      {activeFilterCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium grid place-items-center">{activeFilterCount}</span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[300px] p-4 space-y-4 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">ตัวกรอง</p>
                      {activeFilterCount > 0 && (
                        <button onClick={() => { setLoc("all"); setEmp("all"); setPoster("all"); setRoleCat("all"); }} className="text-xs text-primary hover:underline flex items-center gap-1">
                          <X className="w-3 h-3" /> ล้าง
                        </button>
                      )}
                    </div>
                    {[
                      { key: "loc", title: "สถานที่", val: loc, set: setLoc, chips: LOCATION_CHIPS },
                      { key: "emp", title: "ประเภทงาน", val: emp, set: setEmp, chips: EMPLOYMENT_CHIPS },
                      { key: "poster", title: "โพสต์ในนาม", val: poster, set: setPoster, chips: POSTER_CHIPS },
                    ].map((row) => (
                      <div key={row.key} className="space-y-1.5">
                        <p className="text-[11px] text-muted-foreground">{row.title}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {row.chips.map((c) => (
                            <button key={c.v} onClick={() => row.set(c.v)} className={cn("px-2.5 py-1 rounded-full text-xs transition-colors", row.val === c.v ? "bg-gradient-brand text-white" : "bg-secondary text-muted-foreground hover:text-foreground")}>
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {roleCategories.length > 1 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-muted-foreground">หมวดหมู่งาน</p>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                          {roleCategories.map((c) => (
                            <button key={c} onClick={() => setRoleCat(c)} className={cn("px-2.5 py-1 rounded-full text-xs transition-colors", roleCat === c ? "bg-gradient-brand text-white" : "bg-secondary text-muted-foreground hover:text-foreground")}>
                              {c === "all" ? "ทั้งหมด" : c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={cn("h-10 w-10 rounded-xl glass-chip grid place-items-center relative shrink-0", activeAvailableFilterCount > 0 && "text-primary")} aria-label="ตัวกรอง">
                      <SlidersHorizontal className="w-4 h-4" />
                      {activeAvailableFilterCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium grid place-items-center">{activeAvailableFilterCount}</span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[300px] p-4 space-y-4 rounded-2xl max-h-[min(70vh,520px)] overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">ตัวกรอง</p>
                      {activeAvailableFilterCount > 0 && (
                        <button
                          onClick={() => {
                            setAvailEmp("all");
                            setAvailRoleCat("all");
                            setAvailReady("all");
                            setAvailRate("all");
                          }}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> ล้าง
                        </button>
                      )}
                    </div>
                    {[
                      { title: "ประเภทงาน", val: availEmp, set: setAvailEmp, chips: EMPLOYMENT_CHIPS },
                      { title: "เรทราคา", val: availRate, set: (v: string) => setAvailRate(v as AvailRateFilter), chips: RATE_CHIPS },
                      { title: "พร้อมเริ่มงาน", val: availReady, set: setAvailReady, chips: READY_CHIPS },
                    ].map((row) => (
                      <div key={row.title} className="space-y-1.5">
                        <p className="text-[11px] text-muted-foreground">{row.title}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {row.chips.map((c) => (
                            <button key={c.v} onClick={() => row.set(c.v)} className={cn("px-2.5 py-1 rounded-full text-xs transition-colors", row.val === c.v ? "bg-gradient-brand text-white" : "bg-secondary text-muted-foreground hover:text-foreground")}>
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {availableRoleCategories.length > 1 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-muted-foreground">หมวดหมู่</p>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                          {availableRoleCategories.map((c) => (
                            <button key={c} onClick={() => setAvailRoleCat(c)} className={cn("px-2.5 py-1 rounded-full text-xs transition-colors", availRoleCat === c ? "bg-gradient-brand text-white" : "bg-secondary text-muted-foreground hover:text-foreground")}>
                              {c === "all" ? "ทั้งหมด" : c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        )}

        {tab === "dashboard" ? (
          !user ? (
            <div className="text-center py-16 glass-panel rounded-2xl">
              <p className="text-muted-foreground thai-body">เข้าสู่ระบบเพื่อดูแดชบอร์ดงานของคุณ</p>
              <Button className="mt-4 rounded-xl" onClick={() => requireAuth(user, () => {})}>เข้าสู่ระบบ</Button>
            </div>
          ) : (
            <MyWorkPanel subTab={myWorkSub} onSubTabChange={setMyWorkSub} />
          )
        ) : isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="rounded-2xl h-64 animate-pulse bg-muted/50 border border-border/40" />)}
          </div>
        ) : tab === "openings" ? (
          filteredHiring.length === 0 ? (
            <EmptyBoard title="ยังไม่มีโอกาสใหม่" hint="กด ลงประกาศ แล้วเลือก หาคนมาช่วยงาน" actionLabel="ลงประกาศ" onAction={openPostDialog} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHiring.map((j) => <JobCard key={j.id} job={j} />)}
            </div>
          )
        ) : availableEmpty ? (
          <EmptyBoard title="ยังไม่มีใครประกาศพร้อมรับงาน" hint="กด ลงประกาศ แล้วเลือก ประกาศหางาน" actionLabel="ลงประกาศ" onAction={openPostDialog} />
        ) : (
          <div className="space-y-6">
            {visibleProfiles.length > 0 && (
              <section>
                {visibleListings.length > 0 && (
                  <h2 className="text-sm font-medium thai-display mb-3 flex items-center gap-2">
                    <UserSearch className="w-4 h-4 text-primary" /> โปรไฟล์พร้อมรับงาน
                  </h2>
                )}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleProfiles.map((c) => <CreatorCard key={c.user_id} creator={c} />)}
                </div>
              </section>
            )}
            {visibleListings.length > 0 && (
              <section>
                {visibleProfiles.length > 0 && (
                  <h2 className="text-sm font-medium thai-display mb-3">ประกาศหางาน</h2>
                )}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleListings.map((j) => <JobCard key={j.id} job={j} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
      <Footer />
      <JobPostDialog open={dialogOpen} onOpenChange={setDialogOpen} defaultMode={dialogMode} />
    </div>
  );
};

const EmptyBoard = ({
  title,
  hint,
  actionLabel,
  onAction,
}: {
  title: string;
  hint: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <div className="text-center py-16 glass-panel rounded-2xl">
    <Briefcase className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
    <p className="text-foreground font-medium thai-display">{title}</p>
    <p className="text-sm text-muted-foreground mt-1 thai-body">{hint}</p>
    {actionLabel && onAction && (
      <Button className="mt-4 rounded-xl bg-gradient-brand text-white border-0" onClick={onAction}>
        <Plus className="w-4 h-4 mr-1" /> {actionLabel}
      </Button>
    )}
  </div>
);

export default JobsPage;
