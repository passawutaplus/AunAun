import { useMemo, useState } from "react";
import { Briefcase, Bookmark } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import JobCard from "@/components/jobs/JobCard";
import MyPostedJobsInbox from "@/components/jobs/MyPostedJobsInbox";
import { applyLenyShowcase } from "@/components/jobs/jobShowcase";
import { applicationBadgeClass, applicationStatusLabel } from "@/components/jobs/jobCardUtils";
import { useMyApplications, useMyJobPosts, useMyPostedApplications, useMySavedJobs } from "@/hooks/useJobs";
import { useMyHiringOrgs } from "@/hooks/useHiringOrgs";
import { hiringPostCta } from "@/lib/hiringOrg";
import { cn } from "@/lib/utils";

type HireSubTab = "applied" | "saved" | "posted";

export default function PortfolioHiringPanel() {
  const { data: orgs } = useMyHiringOrgs();
  const { data: applied = [], isLoading: loadingApplied, isError: appliedError, refetch: refetchApplied } = useMyApplications();
  const { data: savedRaw = [], isLoading: loadingSaved, isError: savedError, refetch: refetchSaved } = useMySavedJobs();
  const { data: myPosts = [] } = useMyJobPosts();
  const { data: postedApps = [] } = useMyPostedApplications(myPosts.map((j) => j.id));
  const [subTab, setSubTab] = useState<HireSubTab>("applied");
  const cta = hiringPostCta(orgs);
  const pendingApplicants = postedApps.filter((a) => a.status === "pending").length;

  const appliedRows = useMemo(
    () =>
      applied.flatMap((app) => {
        if (!app.job) return [];
        const job = applyLenyShowcase([app.job])[0];
        return job ? [{ app, job }] : [];
      }),
    [applied],
  );

  const saved = useMemo(() => applyLenyShowcase(savedRaw), [savedRaw]);
  const showPosted = (orgs?.length ?? 0) > 0 || myPosts.length > 0;

  const tabs: { id: HireSubTab; label: string; count: number }[] = [
    { id: "applied", label: "สมัครแล้ว", count: appliedRows.length },
    { id: "saved", label: "บุ๊กมาร์ก", count: saved.length },
    ...(showPosted
      ? [{ id: "posted" as const, label: "ประกาศของฉัน", count: pendingApplicants }]
      : []),
  ];

  const isLoading = subTab === "applied" ? loadingApplied : subTab === "saved" ? loadingSaved : false;
  const isError = subTab === "applied" ? appliedError : subTab === "saved" ? savedError : false;

  if (isError) {
    return (
      <div className="space-y-3 rounded-2xl py-16 text-center glass-panel">
        <p className="font-medium text-foreground">โหลดรายการงานไม่สำเร็จ</p>
        <p className="text-sm text-muted-foreground">ลองใหม่อีกครั้ง หรือตรวจการเชื่อมต่อ</p>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => void (subTab === "applied" ? refetchApplied() : refetchSaved())}
        >
          ลองใหม่
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold text-foreground">
            <Briefcase className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">Hiring</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            งานที่คุณสมัคร งานที่บุ๊กมาร์ก และประกาศที่บริษัทคุณลงไว้
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="w-fit shrink-0 rounded-full">
            <Link to="/hiring">ไปบอร์ด They are HIRING</Link>
          </Button>
          {cta.to ? (
            <Button asChild size="sm" className="w-fit shrink-0 rounded-full">
              <Link to={cta.to}>{cta.label}</Link>
            </Button>
          ) : (
            <Button size="sm" className="w-fit shrink-0 rounded-full" disabled>
              {cta.label}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="รายการงานของฉัน">
        {tabs.map((t) => {
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSubTab(t.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                active
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:text-foreground",
              )}
            >
              {t.label}
              {t.count > 0 ? <span className="ml-1 tabular-nums">({t.count})</span> : null}
            </button>
          );
        })}
      </div>

      {subTab === "posted" ? (
        <MyPostedJobsInbox />
      ) : isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-[1.6rem] aspect-[4/5] sm:aspect-[4/3] animate-pulse bg-muted/50 border border-border/40" />
          ))}
        </div>
      ) : subTab === "applied" ? (
        appliedRows.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="ยังไม่ได้สมัครงาน"
            description="เลือกประกาศจากบอร์ด แล้วกดสมัคร — สถานะจะโชว์ที่นี่"
            action={
              <Button asChild className="rounded-full">
                <Link to="/hiring">ดูประกาศจ้าง</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {appliedRows.map(({ app, job }) => (
              <JobCard
                key={app.id}
                job={job}
                showActions={false}
                overlayBadge={applicationStatusLabel[app.status] ?? app.status}
                overlayBadgeClassName={applicationBadgeClass(app.status)}
              />
            ))}
          </div>
        )
      ) : saved.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="ยังไม่มีงานที่บุ๊กมาร์ก"
          description="กดไอคอนบุ๊กมาร์กบนการ์ดงาน เพื่อเก็บไว้เปิดดูทีหลังที่นี่"
          action={
            <Button asChild className="rounded-full">
              <Link to="/hiring">ดูประกาศจ้าง</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {saved.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
