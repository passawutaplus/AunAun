import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { useOpenJobs } from "@/hooks/useJobs";
import { useAuth } from "@/hooks/useAuth";
import { requireAuth } from "@/lib/requireAuth";
import JobCard from "@/components/jobs/JobCard";
import JobBoardFilters, { JobBoardHero, SALARY_PRESETS } from "@/components/jobs/JobBoardFilters";
import { JobBoardTopBar } from "@/components/jobs/JobBoardTopBar";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import { FilterEmptyState } from "@/components/ui/QueryStatusPanel";
import { cn } from "@/lib/utils";
import SeoHead from "@/components/SeoHead";
import { BRAND_NAME } from "@/lib/brandConfig";
import { FEED_PAGE_GUTTER_X } from "@/components/feed/FeedHero";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { getPosterInfo } from "@/components/jobs/jobCardUtils";
import { applyLenyShowcase } from "@/components/jobs/jobShowcase";
import { normalizeThaiProvince, THAI_PROVINCES } from "@/lib/thaiProvinces";
import type { JobPost } from "@/hooks/useJobs";

const classifyJobPlace = (location: string): "bangkok" | "upcountry" | "overseas" | "" => {
  const raw = location.trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (/กรุงเทพ|กทม|bangkok/.test(lower)) return "bangkok";
  if (/remote|ต่างประเทศ|overseas|international|abroad/.test(lower)) return "overseas";
  const parts = raw.split(/[·,/|]/).map((part) => part.trim());
  for (const part of parts) {
    const province = normalizeThaiProvince(part);
    if (province === "กรุงเทพมหานคร") return "bangkok";
    if (province) return "upcountry";
  }
  if (THAI_PROVINCES.some((p) => p !== "กรุงเทพมหานคร" && raw.includes(p))) return "upcountry";
  return "overseas";
};

const jobSalaryTouches = (job: JobPost, min: number, max: number) => {
  const lo = job.budget_min ?? job.budget_max;
  const hi = job.budget_max ?? job.budget_min;
  if (lo == null && hi == null) return true;
  const a = lo ?? hi ?? 0;
  const b = hi ?? lo ?? 0;
  return a <= max && b >= min;
};

const JobsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: rawHiringJobs = [], isLoading, isError, refetch } = useOpenJobs({ postType: "hiring", limit: 120 });
  const hiringJobs = useMemo(() => applyLenyShowcase(rawHiringJobs), [rawHiringJobs]);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [employment, setEmployment] = useState("");
  const [locationType, setLocationType] = useState("");
  const [placeRegion, setPlaceRegion] = useState("");
  const [salaryId, setSalaryId] = useState("");
  const salaryPreset = SALARY_PRESETS.find((preset) => preset.id === salaryId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return hiringJobs.filter((j) => {
      if (employment && j.employment_type !== employment) return false;
      if (locationType && j.location_type !== locationType) return false;
      if (placeRegion && classifyJobPlace(j.location ?? "") !== placeRegion) return false;
      if (salaryPreset && !jobSalaryTouches(j, salaryPreset.min, salaryPreset.max)) return false;
      if (!q) return true;
      const { name } = getPosterInfo(j);
      return (
        j.title.toLowerCase().includes(q)
        || name.toLowerCase().includes(q)
        || (j.hiring_org?.display_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [hiringJobs, search, employment, locationType, placeRegion, salaryPreset]);

  const hasFilters = !!(search.trim() || employment || locationType || placeRegion || salaryId);

  const goPost = () => {
    requireAuth(user, () => navigate("/hiring/new"));
  };

  return (
    <main id="main-content" className={cn("min-h-screen bg-app-ambient lg:pb-12", MOBILE_PAGE_BOTTOM_CLASS)}>
      <SeoHead
        title="They are HIRING"
        description={`ประกาศจ้างจากบริษัทที่ยืนยันนิติบุคคลแล้วบน ${BRAND_NAME}`}
        path="/hiring"
      />
      <JobBoardTopBar />
      <div className={cn("max-w-[1920px] mx-auto py-6 space-y-5", FEED_PAGE_GUTTER_X)}>
        <JobBoardHero onPost={goPost} />
        <div className="sticky top-14 z-10 py-2.5">
          <JobBoardFilters
            search={search}
            onSearch={setSearch}
            employment={employment}
            onEmployment={setEmployment}
            locationType={locationType}
            onLocationType={setLocationType}
            placeRegion={placeRegion}
            onPlaceRegion={setPlaceRegion}
            salaryId={salaryId}
            onSalaryId={setSalaryId}
          />
        </div>

        {isError ? (
          <EmptyState
            icon={Briefcase}
            title="โหลดประกาศไม่สำเร็จ"
            description="ลองใหม่อีกครั้ง"
            action={<Button className="rounded-xl" onClick={() => void refetch()}>ลองใหม่</Button>}
          />
        ) : isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="rounded-[1.6rem] aspect-[4/5] sm:aspect-[4/3] animate-pulse bg-muted/50 border border-border/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          hasFilters ? (
            <FilterEmptyState
              title="ไม่พบงานตามเงื่อนไข"
              description={search.trim() ? `ไม่มีผลสำหรับ "${search.trim()}"` : "ลองเปลี่ยนตัวกรอง หรือล้างแล้วดูทั้งหมด"}
              onClear={() => {
                setSearch("");
                setEmployment("");
                setLocationType("");
                setPlaceRegion("");
                setSalaryId("");
              }}
            />
          ) : (
            <EmptyState
              icon={Briefcase}
              title="ยังไม่มีประกาศจ้างงาน"
              description="บริษัทที่ยืนยันนิติบุคคลแล้วสามารถลงประกาศได้"
              action={
                <Button className="rounded-xl" onClick={goPost}>ลงประกาศ</Button>
              }
            />
          )
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        )}
      </div>
    </main>
  );
};

export default JobsPage;
