import BriefcaseIcon from "../components/icons/BriefcaseIcon";
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  useJobById,
  useUpdateJobStatus,
  useJobApplications,
  useUpdateApplicationStatus,
  useMarkApplicationViewed,
  canManageJob,
  type ApplicationStatus,
} from "@/hooks/useJobs";
import { useMyStudioRoles } from "@/hooks/useStudios";
import { useAuth } from "@/hooks/useAuth";
import PageLoader from "@/components/ui/PageLoader";
import { requireAuth } from "@/lib/requireAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Users, CheckCircle2, UserSearch, FileText, ExternalLink } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import {
  applicationStatusLabel,
  empLabel,
  fmtLocationChip,
  getPosterInfo,
  jobStatusLabel,
  roleCategoryGradient,
  availabilityLabel,
} from "@/components/jobs/jobCardUtils";
import { cn } from "@/lib/utils";
import ReportTrigger from "@/components/report/ReportTrigger";
import JobApplyDialog from "@/components/jobs/JobApplyDialog";

const fmt = (n: number | null) => (n ? `฿${n.toLocaleString()}` : "");

const JobDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: job, isLoading } = useJobById(id);
  const { data: studioRoles = new Map<string, string>() } = useMyStudioRoles();
  const updateStatus = useUpdateApplicationStatus();
  const markViewed = useMarkApplicationViewed();
  const updateJobStatus = useUpdateJobStatus();
  const [applyOpen, setApplyOpen] = useState(false);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

  const isAdmin = canManageJob(job ?? undefined, user?.id, studioRoles);
  const { data: applications = [] } = useJobApplications(isAdmin ? id : undefined);

  useEffect(() => {
    if (searchParams.get("apply") === "1" && job?.status === "open") {
      requireAuth(user, () => setApplyOpen(true));
      const next = new URLSearchParams(searchParams);
      next.delete("apply");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, user, job?.status]);

  if (isLoading) return <PageLoader />;
  if (!job) return <div className="min-h-screen grid place-items-center text-muted-foreground">ไม่พบประกาศนี้</div>;

  const { name, avatar, verified } = getPosterInfo(job);
  const hasCover = !!job.cover_image_url?.trim();
  const isSeeking = job.post_type === "seeking";
  const profileLink = job.studio?.slug ? `/s/${job.studio.slug}` : job.poster?.username ? `/u/${job.poster.username}` : null;

  const expandApplicant = (appId: string) => {
    setExpandedAppId(appId);
    markViewed.mutate(appId);
  };

  const setAppStatus = (appId: string, status: ApplicationStatus, markContacted?: boolean) => {
    updateStatus.mutate({ id: appId, status, markContacted });
  };

  return (
    <div className="min-h-screen bg-app-ambient pb-24 lg:pb-12">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <BackButton />

        <div className="relative h-48 rounded-2xl overflow-hidden border border-border/40">
          {hasCover ? (
            <>
              <img src={job.cover_image_url!} alt="" className="w-full h-full object-cover dark:brightness-75 dark:saturate-90" />
              <div className="absolute inset-0 bg-black/25 dark:bg-black/45" />
            </>
          ) : (
            <div className={cn("w-full h-full bg-gradient-to-br", roleCategoryGradient(job.role_category))} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-black/10 dark:from-black/80 dark:via-black/50" />
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-2xl font-semibold tracking-tight thai-display text-white drop-shadow">{job.title}</h1>
            {job.role_category && <p className="text-sm text-white/85 mt-1">{job.role_category} · {empLabel[job.employment_type]}</p>}
          </div>
        </div>

        <div className="glass-panel-strong rounded-2xl p-5 lg:p-6 space-y-4">
          <div className="flex items-start gap-4">
            {profileLink ? (
              <Link to={profileLink}>
                <Avatar className="w-14 h-14 rounded-2xl">
                  <AvatarImage src={avatar} />
                  <AvatarFallback className="bg-gradient-brand text-white rounded-2xl">
                    {isSeeking ? <UserSearch className="w-5 h-5" /> : <BriefcaseIcon className="w-5 h-5" />}
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Avatar className="w-14 h-14 rounded-2xl">
                <AvatarImage src={avatar} />
                <AvatarFallback className="bg-gradient-brand text-white rounded-2xl">
                  {isSeeking ? <UserSearch className="w-5 h-5" /> : <BriefcaseIcon className="w-5 h-5" />}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              {profileLink ? (
                <Link to={profileLink} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
                  {name}
                  {verified && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  {name}
                  {verified && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                </p>
              )}
              {isSeeking && (
                <Badge className="mt-1 bg-primary/15 text-primary border-0 text-[10px] h-5 px-1.5">เปิดรับงาน</Badge>
              )}
            </div>
            <Badge variant="secondary" className="text-xs">{jobStatusLabel[job.status]}</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <Stat icon={<span className="text-base">฿</span>} label="ค่าจ้าง" value={
              job.budget_min || job.budget_max
                ? `${fmt(job.budget_min)}${job.budget_min && job.budget_max ? "-" : ""}${fmt(job.budget_max)}`
                : "ตามตกลง"
            } />
            <Stat icon={<MapPin className="w-4 h-4" />} label="รูปแบบ" value={fmtLocationChip(job.location_type, job.location)} />
            {job.deadline && <Stat icon={<Calendar className="w-4 h-4" />} label="ปิดรับ" value={new Date(job.deadline).toLocaleDateString("th-TH")} />}
            {!isSeeking && <Stat icon={<Users className="w-4 h-4" />} label="ผู้สมัคร" value={`${job.applicants_count}`} />}
          </div>

          {job.ready_to_start && isSeeking && (
            <p className="text-sm text-muted-foreground">
              พร้อมเริ่ม: {availabilityLabel[job.ready_to_start] ?? job.ready_to_start}
            </p>
          )}

          {job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
            </div>
          )}

          {job.deliverables && job.deliverables.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1.5">สิ่งที่ต้องส่งมอบ</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
                {job.deliverables.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </div>
          )}

          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed thai-body">{job.description || "ไม่มีรายละเอียดเพิ่มเติม"}</p>
          </div>

          {isSeeking && job.attached_cv_url && (
            <a
              href={job.attached_cv_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <FileText className="w-4 h-4" /> ดาวน์โหลด CV
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
            {isAdmin ? (
              <>
                <Button variant="outline" onClick={() => updateJobStatus.mutate({ id: job.id, status: job.status === "open" ? "closed" : "open" })} className="rounded-xl">
                  {job.status === "open" ? "ปิดประกาศ" : "เปิดประกาศใหม่"}
                </Button>
                <Button onClick={() => updateJobStatus.mutate({ id: job.id, status: "filled" })} className="rounded-xl bg-gradient-brand text-white border-0" disabled={job.status === "filled"}>
                  ทำเครื่องหมาย "รับแล้ว"
                </Button>
              </>
            ) : !isSeeking ? (
              <Button
                onClick={() => requireAuth(user, () => setApplyOpen(true))}
                disabled={job.status !== "open"}
                className="flex-1 rounded-xl bg-gradient-brand text-white border-0"
              >
                สมัครด้วย Portfolio
              </Button>
            ) : profileLink ? (
              <Button asChild className="flex-1 rounded-xl bg-gradient-brand text-white border-0">
                <Link to={profileLink}>ดูโปรไฟล์ / ติดต่อ</Link>
              </Button>
            ) : null}
            {!isAdmin && (
              <ReportTrigger targetType="job" targetId={job.id} targetOwnerId={job.posted_by} variant="text" />
            )}
          </div>
        </div>

        {isAdmin && applications.length > 0 && (
          <div className="glass-panel rounded-2xl p-5">
            <h2 className="font-medium thai-display mb-3">ผู้สมัคร ({applications.length})</h2>
            <div className="space-y-3">
              {applications.map((a) => (
                <div key={a.id} className="p-3 rounded-xl bg-background/40 space-y-2">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={a.applicant?.avatar_url ?? undefined} />
                      <AvatarFallback>{a.applicant?.display_name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <button type="button" onClick={() => expandApplicant(a.id)} className="text-sm font-medium hover:text-primary text-left">
                        {a.applicant?.display_name}
                      </button>
                      {a.viewed_at && <p className="text-[10px] text-muted-foreground">เปิดดูแล้ว</p>}
                      {expandedAppId === a.id && (
                        <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                          {a.cover_letter && <p className="text-base text-foreground whitespace-pre-wrap">{a.cover_letter}</p>}
                          {a.portfolio_project_ids.length > 0 && (
                            <p>Portfolio: {a.portfolio_project_ids.length} ชิ้น</p>
                          )}
                          {(a.proposed_rate_min || a.proposed_rate_max) && (
                            <p>เรทเสนอ: {fmt(a.proposed_rate_min ?? null)}{a.proposed_rate_max ? ` - ${fmt(a.proposed_rate_max)}` : ""}</p>
                          )}
                          {a.ready_date && <p>พร้อมเริ่ม: {new Date(a.ready_date).toLocaleDateString("th-TH")}</p>}
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {applicationStatusLabel[a.status] ?? a.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => setAppStatus(a.id, "shortlisted")}>Shortlist</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => setAppStatus(a.id, "contacted", true)}>Contacted</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => setAppStatus(a.id, "hired")}>Hired</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg text-destructive" onClick={() => setAppStatus(a.id, "rejected")}>Reject</Button>
                    {a.applicant?.username && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg" asChild>
                        <Link to={`/u/${a.applicant.username}`}>โปรไฟล์</Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isSeeking && (
        <JobApplyDialog job={job} open={applyOpen} onOpenChange={setApplyOpen} />
      )}
    </div>
  );
};

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-xl bg-background/40 px-3 py-2.5">
    <div className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">{icon} {label}</div>
    <div className="text-sm font-medium mt-0.5 truncate">{value}</div>
  </div>
);

export default JobDetailPage;
