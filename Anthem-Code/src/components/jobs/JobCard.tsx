import BriefcaseIcon from "../icons/BriefcaseIcon";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight, CheckCircle2, MapPin, UserSearch, Building2 } from "lucide-react";
import type { JobPost } from "@/hooks/useJobs";
import { cn } from "@/lib/utils";
import {
  empLabel,
  fmtBudget,
  getPosterInfo,
  locTypeLabel,
  roleCategoryGradient,
} from "./jobCardUtils";

interface Props {
  job: JobPost;
  compact?: boolean;
  onClick?: () => void;
}

/** Readable on both light scrim (cover) and theme-aware gradient fallbacks. */
const bodyText = "text-zinc-900 dark:text-zinc-50";
const bodyMuted = "text-zinc-600 dark:text-zinc-300";
const chipClass =
  "text-[10px] rounded-full px-2 py-0.5 border border-black/5 bg-white/80 text-zinc-700 " +
  "dark:border-white/10 dark:bg-black/40 dark:text-zinc-100 backdrop-blur-sm";

const JobCard = ({ job, compact, onClick }: Props) => {
  const isSeeking = job.post_type === "seeking";
  const { name, avatar, verified } = getPosterInfo(job);
  const hasCover = !!job.cover_image_url?.trim();
  const skillLimit = compact ? 2 : 3;

  const content = (
    <div
      className={cn(
        "group/card rounded-2xl overflow-hidden bg-card shadow-md hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col border border-border/40",
        compact && "shadow-sm hover:shadow-md",
      )}
    >
      {/* Body */}
      <div
        className={cn(
          "relative flex flex-col p-4",
          bodyText,
          compact ? "min-h-[140px]" : "min-h-[180px]",
        )}
      >
        {/* Background */}
        {hasCover ? (
          <>
            <img
              src={job.cover_image_url!}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-[2px] saturate-90 dark:saturate-75 dark:brightness-75"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-white/78 dark:bg-black/72" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent dark:from-black/50 dark:via-black/20" />
          </>
        ) : (
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-br",
              roleCategoryGradient(job.role_category),
            )}
          />
        )}

        <div className="relative z-10 flex flex-col flex-1 gap-2">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-semibold tracking-tight">{fmtBudget(job)}</span>
            {isSeeking && (
              <Badge className="bg-primary/15 text-primary border-0 text-[10px] h-5 px-1.5 shrink-0 dark:bg-primary/25">
                หางาน
              </Badge>
            )}
          </div>

          <div className="flex items-start justify-between gap-2 flex-1">
            <h3
              className={cn(
                "font-semibold tracking-tight thai-display leading-snug line-clamp-2",
                "group-hover/card:text-primary transition-colors",
                compact ? "text-sm" : "text-lg",
              )}
            >
              {job.title}
            </h3>
            <ArrowRight
              className={cn(
                "shrink-0 opacity-60 group-hover/card:text-primary group-hover/card:opacity-100 group-hover/card:translate-x-0.5 transition-all",
                compact ? "w-4 h-4 mt-0.5" : "w-5 h-5 mt-1",
              )}
            />
          </div>

          {!compact && job.description && (
            <p className={cn("text-xs line-clamp-2 thai-body", bodyMuted)}>{job.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 mt-auto">
            <span className={cn("inline-flex items-center gap-0.5", chipClass)}>
              <MapPin className="w-3 h-3 shrink-0" />
              {locTypeLabel[job.location_type]}
              {job.location ? ` · ${job.location}` : ""}
            </span>
            {job.skills.slice(0, skillLimit).map((s) => (
              <Badge key={s} variant="secondary" className={cn(chipClass, "h-5 font-normal py-0 px-1.5")}>
                {s}
              </Badge>
            ))}
            {job.skills.length > skillLimit && (
              <Badge variant="secondary" className={cn(chipClass, "h-5 font-normal py-0 px-1.5")}>
                +{job.skills.length - skillLimit}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
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
            <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 flex-wrap">
              {job.poster_role === "studio" && <Building2 className="w-3 h-3 shrink-0" />}
              {job.role_category} · {empLabel[job.employment_type]}
              {job.poster_role === "studio" && verified && (
                <span className="text-primary font-medium">· นิติบุคคล</span>
              )}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full font-medium",
            "bg-zinc-900 text-white dark:bg-primary dark:text-primary-foreground",
            compact ? "text-[10px] px-2.5 py-1" : "text-xs px-3.5 py-1.5",
          )}
        >
          ดู
        </span>
      </div>
    </div>
  );

  if (onClick) return <button onClick={onClick} className="text-left w-full">{content}</button>;
  return <Link to={`/jobs/${job.id}`} className="block h-full">{content}</Link>;
};

export default JobCard;
