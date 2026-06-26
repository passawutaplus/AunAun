import BriefcaseIcon from "../icons/BriefcaseIcon";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Bookmark, CheckCircle2, MapPin, UserSearch, Building2, Users, Clock,
} from "lucide-react";
import type { JobPost } from "@/hooks/useJobs";
import { useSavedJobIds, useToggleSaveJob } from "@/hooks/useJobs";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyProjects } from "@/hooks/useProjects";
import { requireAuth } from "@/lib/requireAuth";
import { scoreJobMatch } from "@/lib/jobMatchScore";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import {
  empLabel,
  fmtBudget,
  fmtDeadlineChip,
  fmtLocationChip,
  getPosterInfo,
  jobStatusLabel,
  roleCategoryGradient,
} from "./jobCardUtils";

interface Props {
  job: JobPost;
  compact?: boolean;
  onClick?: () => void;
  showActions?: boolean;
}

const chipClass =
  "text-[10px] rounded-full px-2 py-0.5 border border-black/5 bg-white/80 text-zinc-700 " +
  "dark:border-white/10 dark:bg-black/40 dark:text-zinc-100 backdrop-blur-sm";

const bodyText = "text-zinc-900 dark:text-zinc-50";
const bodyMuted = "text-zinc-600 dark:text-zinc-300";

const JobCard = ({ job, compact, onClick, showActions = true }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: myProjects = [] } = useMyProjects(user?.id);
  const { data: savedIds } = useSavedJobIds();
  const toggleSave = useToggleSaveJob();

  const isSeeking = job.post_type === "seeking";
  const { name, avatar, verified } = getPosterInfo(job);
  const hasCover = !!job.cover_image_url?.trim();
  const skillLimit = compact ? 2 : 3;
  const isSaved = savedIds?.has(job.id) ?? false;
  const deadlineChip = fmtDeadlineChip(job.deadline);
  const isUrgent = deadlineChip?.includes("วัน") && !deadlineChip.includes("ปิดรับแล้ว");

  const matchScore = useMemo(() => {
    if (!profile || !user || job.posted_by === user.id) return null;
    const projectCategories = myProjects.map((p) => p.category).filter(Boolean) as string[];
    const projectTools = myProjects.flatMap((p) => p.tools ?? []);
    const { score } = scoreJobMatch(job, {
      skills: profile.skills ?? [],
      role: profile.role,
      location: profile.location,
      preferred_categories: (profile as { preferred_categories?: string[] }).preferred_categories ?? [],
      preferred_employment_types: (profile as { preferred_employment_types?: string[] }).preferred_employment_types ?? [],
      project_categories: projectCategories,
      project_tools: projectTools,
    });
    return score >= 40 ? score : null;
  }, [profile, user, job, myProjects]);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    requireAuth(user, () => toggleSave.mutate({ jobId: job.id, saved: isSaved }));
  };

  const handleApply = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    requireAuth(user, () => navigate(`/jobs/${job.id}?apply=1`));
  };

  const content = (
    <div
      className={cn(
        "group/card rounded-2xl overflow-hidden bg-card shadow-md hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col border border-border/40",
        compact && "shadow-sm hover:shadow-md",
      )}
    >
      <div className={cn("relative flex flex-col p-4", bodyText, compact ? "min-h-[140px]" : "min-h-[180px]")}>
        {hasCover ? (
          <>
            <img src={job.cover_image_url!} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-[2px] saturate-90 dark:saturate-75 dark:brightness-75" loading="lazy" />
            <div className="absolute inset-0 bg-white/78 dark:bg-black/72" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent dark:from-black/50 dark:via-black/20" />
          </>
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", roleCategoryGradient(job.role_category))} />
        )}

        <div className="relative z-10 flex flex-col flex-1 gap-2">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-semibold tracking-tight">{fmtBudget(job)}</span>
            <div className="flex items-center gap-1 shrink-0">
              {matchScore != null && (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-0 text-[10px] h-5">
                  Match {matchScore}%
                </Badge>
              )}
              {isSeeking ? (
                <Badge className="bg-violet-500/15 text-violet-700 border-0 text-[10px] h-5 dark:text-violet-300">หางาน</Badge>
              ) : job.status !== "open" ? (
                <Badge variant="secondary" className="text-[10px] h-5">{jobStatusLabel[job.status]}</Badge>
              ) : isUrgent ? (
                <Badge className="bg-amber-500/15 text-amber-700 border-0 text-[10px] h-5">ด่วน</Badge>
              ) : (
                <Badge className="bg-emerald-500/10 text-emerald-700 border-0 text-[10px] h-5 dark:text-emerald-300">เปิดรับ</Badge>
              )}
            </div>
          </div>

          <p className={cn("text-[10px]", bodyMuted)}>
            {empLabel[job.employment_type] ?? job.employment_type} · {fmtLocationChip(job.location_type, job.location)}
          </p>

          <div className="flex items-start justify-between gap-2 flex-1">
            <h3 className={cn("font-semibold tracking-tight thai-display leading-snug line-clamp-2 group-hover/card:text-primary transition-colors", compact ? "text-sm" : "text-lg")}>
              {job.title}
            </h3>
            <ArrowRight className={cn("shrink-0 opacity-60 group-hover/card:text-primary group-hover/card:opacity-100 group-hover/card:translate-x-0.5 transition-all", compact ? "w-4 h-4 mt-0.5" : "w-5 h-5 mt-1")} />
          </div>

          {!compact && job.description && (
            <p className={cn("text-xs line-clamp-2 thai-body", bodyMuted)}>{job.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 mt-auto">
            {job.skills.slice(0, skillLimit).map((s) => (
              <Badge key={s} variant="secondary" className={cn(chipClass, "h-5 font-normal py-0 px-1.5")}>{s}</Badge>
            ))}
            {job.skills.length > skillLimit && (
              <Badge variant="secondary" className={cn(chipClass, "h-5 font-normal py-0 px-1.5")}>+{job.skills.length - skillLimit}</Badge>
            )}
          </div>

          {!compact && (
            <div className={cn("flex flex-wrap items-center gap-2 text-[10px]", bodyMuted)}>
              {!isSeeking && (
                <span className="inline-flex items-center gap-0.5">
                  <Users className="w-3 h-3" /> {job.applicants_count} คนสมัคร
                </span>
              )}
              {deadlineChip && (
                <span className="inline-flex items-center gap-0.5">
                  <Clock className="w-3 h-3" /> {deadlineChip}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-muted/40 dark:bg-muted/20 border-t border-border/50">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Avatar className={cn("rounded-lg shrink-0", compact ? "w-7 h-7" : "w-8 h-8")}>
            <AvatarImage src={avatar} />
            <AvatarFallback className="bg-gradient-brand text-white rounded-lg">
              {isSeeking ? <UserSearch className="w-3 h-3" /> : <BriefcaseIcon className="w-3 h-3" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className={cn("font-medium truncate flex items-center gap-1 text-foreground", compact ? "text-[11px]" : "text-xs")}>
              {name}
              {verified && <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />}
            </p>
            <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
              {job.poster_role === "studio" && <Building2 className="w-3 h-3 shrink-0" />}
              {job.role_category}
            </p>
          </div>
        </div>

        {showActions && !compact ? (
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleSave} aria-label="บันทึก">
              <Bookmark className={cn("w-4 h-4", isSaved && "fill-primary text-primary")} />
            </Button>
            {!isSeeking && job.status === "open" && (
              <Button type="button" size="sm" className="rounded-full text-xs h-8 px-3 bg-gradient-brand text-white border-0" onClick={handleApply}>
                สมัคร
              </Button>
            )}
            {isSeeking && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-zinc-900 text-white dark:bg-primary dark:text-primary-foreground">ดู</span>
            )}
          </div>
        ) : (
          <span className={cn("shrink-0 rounded-full font-medium bg-zinc-900 text-white dark:bg-primary dark:text-primary-foreground", compact ? "text-[10px] px-2.5 py-1" : "text-xs px-3.5 py-1.5")}>
            ดู
          </span>
        )}
      </div>
    </div>
  );

  if (onClick) return <button type="button" onClick={onClick} className="text-left w-full">{content}</button>;
  return <Link to={`/jobs/${job.id}`} className="block h-full">{content}</Link>;
};

export default JobCard;
