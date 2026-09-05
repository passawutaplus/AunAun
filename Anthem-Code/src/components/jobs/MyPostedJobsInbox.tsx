import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import ApplicantCvDialog from "@/components/jobs/ApplicantCvDialog";
import JobApplicantReviewRow from "@/components/jobs/JobApplicantReviewRow";
import JobRejectDialog from "@/components/jobs/JobRejectDialog";
import {
  useDecideJobApplication,
  useMarkJobApplicationsViewed,
  useMyJobPosts,
  useMyPostedApplications,
  useToggleApplicationInterest,
  useUpdateJobStatus,
} from "@/hooks/useJobs";
import { hiringPostCta } from "@/lib/hiringOrg";
import {
  matchesApplicantInboxFilter,
  sortJobApplicants,
  type JobApplicantInboxFilter,
  type JobRejectReason,
} from "@/lib/jobApplicationReview";
import { useMyHiringOrgs } from "@/hooks/useHiringOrgs";
import { cn } from "@/lib/utils";

const FILTERS: { id: JobApplicantInboxFilter; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "pending", label: "รอพิจารณา" },
  { id: "interested", label: "สนใจ" },
  { id: "accepted", label: "ตอบรับแล้ว" },
  { id: "rejected", label: "ไม่ผ่าน" },
];

type Props = {
  onNeedPost?: () => void;
};

export default function MyPostedJobsInbox({ onNeedPost }: Props) {
  const navigate = useNavigate();
  const { data: orgs } = useMyHiringOrgs();
  const { data: jobs = [], isLoading: loadingJobs, isError, refetch } = useMyJobPosts();
  const jobIds = useMemo(() => jobs.map((j) => j.id), [jobs]);
  const { data: apps = [], isLoading: loadingApps } = useMyPostedApplications(jobIds);
  const decide = useDecideJobApplication();
  const pin = useToggleApplicationInterest();
  const markViewed = useMarkJobApplicationsViewed();
  const updateJob = useUpdateJobStatus();
  const cta = hiringPostCta(orgs);

  const [jobId, setJobId] = useState<string>("");
  const [filter, setFilter] = useState<JobApplicantInboxFilter>("all");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [cvUserId, setCvUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId && jobs[0]?.id) setJobId(jobs[0].id);
    if (jobId && jobs.length > 0 && !jobs.some((j) => j.id === jobId)) setJobId(jobs[0].id);
  }, [jobs, jobId]);

  useEffect(() => {
    if (!jobId) return;
    markViewed.mutate(jobId);
    // ทำเครื่องหมายอ่านครั้งเดียวตอนเลือกงาน
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const selected = jobs.find((j) => j.id === jobId) ?? jobs[0];
  const selectedApps = useMemo(() => {
    const rows = apps.filter((a) => a.job_id === selected?.id);
    return sortJobApplicants(rows.filter((a) => matchesApplicantInboxFilter(a.status, filter)));
  }, [apps, selected?.id, filter]);

  const rejectRow = apps.find((a) => a.id === rejectId) ?? null;
  const isLoading = loadingJobs || loadingApps;
  const busy = decide.isPending || pin.isPending;

  const countFor = (id: string, status?: "pending" | "shortlisted") =>
    apps.filter((a) => a.job_id === id && (status ? a.status === status : true)).length;

  const unread = (id: string) =>
    apps.some((a) => a.job_id === id && !a.viewed_at && (a.status === "pending" || a.status === "shortlisted"));

  if (isError) {
    return (
      <div className="space-y-3 rounded-2xl py-16 text-center glass-panel">
        <p className="font-medium">โหลดประกาศไม่สำเร็จ</p>
        <Button variant="outline" className="rounded-full" onClick={() => void refetch()}>
          ลองใหม่
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl animate-pulse bg-muted/50" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="ยังไม่มีประกาศของฉัน"
        description={
          cta.to === "/hiring/new"
            ? "ลงประกาศแล้ว ผู้สมัครจะโชว์ที่นี่ แยกตามงาน"
            : "ยืนยันองค์กรก่อน แล้วค่อยลงประกาศรับสมัคร"
        }
        action={
          cta.to ? (
            <Button asChild className="rounded-full">
              <Link to={cta.to}>{cta.label}</Link>
            </Button>
          ) : onNeedPost ? (
            <Button className="rounded-full" onClick={onNeedPost}>
              {cta.label}
            </Button>
          ) : null
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {jobs.map((job) => {
          const active = job.id === selected?.id;
          const pending = countFor(job.id, "pending");
          return (
            <button
              key={job.id}
              type="button"
              onClick={() => setJobId(job.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:text-foreground",
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                {unread(job.id) ? <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden /> : null}
                <span className="max-w-[10rem] truncate">{job.title}</span>
                {pending > 0 ? <span className="tabular-nums">รอ {pending}</span> : null}
                {job.status !== "open" ? <span>· ปิดรับ</span> : null}
              </span>
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="rounded-full h-8 text-xs" asChild>
            <Link to={`/hiring/${selected.id}`}>ดูประกาศ</Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full h-8 text-xs"
            disabled={updateJob.isPending}
            onClick={() =>
              updateJob.mutate({
                id: selected.id,
                status: selected.status === "open" ? "closed" : "open",
              })
            }
          >
            {selected.status === "open" ? "ปิดรับ" : "เปิดประกาศใหม่"}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const count = apps.filter(
            (a) => a.job_id === selected?.id && matchesApplicantInboxFilter(a.status, f.id),
          ).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-medium",
                filter === f.id
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border",
              )}
            >
              {f.label}
              {count > 0 ? <span className="ml-1 tabular-nums">({count})</span> : null}
            </button>
          );
        })}
      </div>

      {selectedApps.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีผู้สมัครในมุมนี้</p>
      ) : (
        <div className="space-y-2">
          {selectedApps.map((a) => (
            <JobApplicantReviewRow
              key={a.id}
              application={a}
              busy={busy}
              onViewCv={() => setCvUserId(a.applicant_id)}
              onToggleInterest={(interested) => pin.mutate({ id: a.id, interested })}
              onAccept={() => {
                void decide.mutateAsync({ id: a.id, decision: "accept" }).then((convId) => {
                  if (convId) navigate(`/chat/${convId}`);
                });
              }}
              onReject={() => setRejectId(a.id)}
            />
          ))}
        </div>
      )}

      <ApplicantCvDialog userId={cvUserId} open={!!cvUserId} onOpenChange={(next) => !next && setCvUserId(null)} />
      <JobRejectDialog
        open={!!rejectId}
        applicantName={rejectRow?.applicant?.display_name}
        busy={decide.isPending}
        onOpenChange={(next) => {
          if (!next) setRejectId(null);
        }}
        onConfirm={(reason, note) => {
          if (!rejectId) return;
          void decide
            .mutateAsync({
              id: rejectId,
              decision: "reject",
              reason: reason as Exclude<JobRejectReason, "expired">,
              note,
            })
            .then(() => setRejectId(null));
        }}
      />
    </div>
  );
}
