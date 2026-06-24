import BriefcaseIcon from "../components/icons/BriefcaseIcon";
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useJobById, useApplyToJob, useUpdateJobStatus, useJobApplications } from "@/hooks/useJobs";
import { useAuth } from "@/hooks/useAuth";
import { requireAuth } from "@/lib/requireAuth";
import { useMyStudios } from "@/hooks/useStudios";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Calendar, Users, ArrowLeft, Loader2, CheckCircle2, UserSearch } from "lucide-react";
import { getPosterInfo, roleCategoryGradient } from "@/components/jobs/jobCardUtils";
import { cn } from "@/lib/utils";
import ReportTrigger from "@/components/report/ReportTrigger";

const fmt = (n: number | null) => (n ? `฿${n.toLocaleString()}` : "");

const JobDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: job, isLoading } = useJobById(id);
  const { data: myStudios = [] } = useMyStudios();
  const apply = useApplyToJob();
  const updateStatus = useUpdateJobStatus();
  const [applyOpen, setApplyOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");

  const isAdmin = !!job && myStudios.some((s) => s.id === job.studio_id);
  const { data: applications = [] } = useJobApplications(isAdmin ? id : undefined);

  if (isLoading) return <div className="min-h-screen grid place-items-center text-muted-foreground">กำลังโหลด...</div>;
  if (!job) return <div className="min-h-screen grid place-items-center text-muted-foreground">ไม่พบประกาศนี้</div>;

  const { name, avatar, verified } = getPosterInfo(job);
  const hasCover = !!job.cover_image_url?.trim();
  const isSeeking = job.post_type === "seeking";
  const profileLink = job.studio?.slug ? `/s/${job.studio.slug}` : job.poster?.username ? `/u/${job.poster.username}` : null;

  const submitApply = () => {
    apply.mutate(
      { job_id: job.id, cover_letter: coverLetter.trim(), portfolio_project_ids: [] },
      {
        onSuccess: () => {
          setApplyOpen(false);
          setCoverLetter("");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-app-ambient pb-24 lg:pb-12">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> กลับ
        </button>

        <div className="relative h-48 rounded-2xl overflow-hidden border border-border/40">
          {hasCover ? (
            <>
              <img
                src={job.cover_image_url!}
                alt=""
                className="w-full h-full object-cover dark:brightness-75 dark:saturate-90"
              />
              <div className="absolute inset-0 bg-black/25 dark:bg-black/45" />
            </>
          ) : (
            <div className={cn("w-full h-full bg-gradient-to-br", roleCategoryGradient(job.role_category))} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-black/10 dark:from-black/80 dark:via-black/50" />
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-2xl font-semibold tracking-tight thai-display text-white drop-shadow">{job.title}</h1>
            {job.role_category && <p className="text-sm text-white/85 mt-1">{job.role_category}</p>}
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
                <Badge className="mt-1 bg-primary/15 text-primary border-0 text-[10px] h-5 px-1.5">หางาน</Badge>
              )}
            </div>
            {job.status !== "open" && (
              <Badge variant="secondary" className="text-xs">{job.status === "closed" ? "ปิดรับ" : "รับสมัครแล้ว"}</Badge>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <Stat icon={<span className="text-base">฿</span>} label="ค่าจ้าง" value={
              job.budget_min || job.budget_max
                ? `${fmt(job.budget_min)}${job.budget_min && job.budget_max ? "-" : ""}${fmt(job.budget_max)}`
                : "ตามตกลง"
            } />
            <Stat icon={<MapPin className="w-4 h-4" />} label="รูปแบบ" value={job.location_type === "remote" ? "Remote" : job.location_type === "onsite" ? "Onsite" : "Hybrid"} />
            {job.deadline && <Stat icon={<Calendar className="w-4 h-4" />} label="ปิดรับ" value={new Date(job.deadline).toLocaleDateString("th-TH")} />}
            <Stat icon={<Users className="w-4 h-4" />} label="ผู้สมัคร" value={`${job.applicants_count}`} />
          </div>

          {job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
            </div>
          )}

          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="whitespace-pre-wrap leading-relaxed thai-body">{job.description || "ไม่มีรายละเอียดเพิ่มเติม"}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
            {isAdmin ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => updateStatus.mutate({ id: job.id, status: job.status === "open" ? "closed" : "open" })}
                  className="rounded-xl"
                >
                  {job.status === "open" ? "ปิดประกาศ" : "เปิดประกาศใหม่"}
                </Button>
                <Button
                  onClick={() => updateStatus.mutate({ id: job.id, status: "filled" })}
                  className="rounded-xl bg-gradient-brand text-white border-0"
                  disabled={job.status === "filled"}
                >
                  ทำเครื่องหมาย "รับสมัครแล้ว"
                </Button>
              </>
            ) : (
              <Button
                onClick={() => requireAuth(user, () => setApplyOpen(true))}
                disabled={job.status !== "open"}
                className="flex-1 rounded-xl bg-gradient-brand text-white border-0"
              >
                สมัครงานนี้
              </Button>
            )}
            {!isAdmin && (
              <ReportTrigger
                targetType="job"
                targetId={job.id}
                targetOwnerId={job.posted_by}
                variant="text"
              />
            )}
          </div>
        </div>

        {isAdmin && applications.length > 0 && (
          <div className="glass-panel rounded-2xl p-5">
            <h2 className="font-medium thai-display mb-3">ผู้สมัคร ({applications.length})</h2>
            <div className="space-y-3">
              {applications.map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-background/40">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={a.applicant?.avatar_url ?? undefined} />
                    <AvatarFallback>{a.applicant?.display_name?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <Link to={`/u/${a.applicant_id}`} className="text-sm font-medium hover:text-primary">
                      {a.applicant?.display_name}
                    </Link>
                    {a.cover_letter && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{a.cover_letter}</p>}
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{a.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogTitle className="thai-display">สมัครงาน: {job.title}</DialogTitle>
          <DialogDescription className="thai-body">เขียนแนะนำตัวสั้นๆ บอกเหตุผลที่เหมาะกับงานนี้</DialogDescription>
          <Textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            placeholder="สวัสดีครับ/ค่ะ ผม/ดิฉันสนใจงานนี้เพราะ..."
            rows={6}
            className="rounded-xl"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setApplyOpen(false)} className="rounded-xl">ยกเลิก</Button>
            <Button onClick={submitApply} disabled={apply.isPending || !coverLetter.trim()} className="rounded-xl bg-gradient-brand text-white border-0">
              {apply.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />} ส่งใบสมัคร
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
