import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Bookmark } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { JobPost } from "@/hooks/useJobs";
import { useSavedJobIds, useToggleSaveJob } from "@/hooks/useJobs";
import { useAuth } from "@/hooks/useAuth";
import { requireAuth } from "@/lib/requireAuth";
import { cn } from "@/lib/utils";
import { empLabel, getPosterInfo, jobRoleTitle, roleCategoryGradient } from "./jobCardUtils";
import { showcaseCoverUrl } from "./jobShowcase";

interface Props {
  job: JobPost;
  compact?: boolean;
  onClick?: () => void;
  showActions?: boolean;
  overlayBadge?: string;
  overlayBadgeClassName?: string;
}

const postedOn = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const JobCard = ({ job, compact, onClick, showActions = true, overlayBadge, overlayBadgeClassName }: Props) => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { user } = useAuth();
  const { data: savedIds } = useSavedJobIds();
  const toggleSave = useToggleSaveJob();
  const { name, avatar } = getPosterInfo(job);
  const roleTitle = jobRoleTitle(job.title);
  const coverUrl = showcaseCoverUrl(job.id) ?? job.cover_image_url;
  const hasCover = !!coverUrl?.trim();
  const isSaved = savedIds?.has(job.id) ?? false;

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    requireAuth(user, () => toggleSave.mutate({ jobId: job.id, saved: isSaved }));
  };

  const handleApply = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    requireAuth(user, () => navigate(`/hiring/${job.id}?apply=1`));
  };

  const content = (
    <motion.article
      initial="rest"
      whileHover={reduced ? undefined : "hover"}
      className={cn(
        "group/card overflow-hidden rounded-[1.6rem] bg-card shadow-md hover:shadow-lg transition-shadow h-full flex flex-col border border-border/40",
        compact && "shadow-sm",
      )}
    >
      <div className={cn("relative overflow-hidden", compact ? "aspect-[4/3]" : "aspect-[4/5] sm:aspect-[4/3]")}>
        {hasCover ? (
          <img
            src={coverUrl!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", roleCategoryGradient(job.role_category))}>
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <p className="text-white/90 text-xs font-medium tracking-widest">ประกาศจ้าง</p>
              <h3 className="text-white text-xl font-semibold thai-display leading-tight drop-shadow">{roleTitle}</h3>
            </div>
          </div>
        )}
        {overlayBadge ? (
          <span
            className={cn(
              "absolute top-3 left-3 z-10 rounded-full px-2.5 py-1 text-[11px] font-medium shadow-sm",
              overlayBadgeClassName ?? "bg-black/65 text-white",
            )}
          >
            {overlayBadge}
          </span>
        ) : null}
        {hasCover ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4 pt-10">
            <h3 className="text-white text-lg font-semibold thai-display leading-tight drop-shadow line-clamp-1">{roleTitle}</h3>
            <p className="text-white/80 text-xs mt-1">
              {empLabel[job.employment_type]} · {job.location_type === "remote" ? "WFH 100%" : job.location_type === "hybrid" ? "Hybrid" : "Onsite"}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 px-3 py-3 border-t border-border/50">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={avatar} alt="" />
          <AvatarFallback className="bg-gradient-brand text-white text-xs">{name.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate text-foreground">{name}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            ลงเมื่อ {postedOn(job.created_at)}
          </p>
        </div>
        {showActions && job.status === "open" && job.post_type !== "seeking" ? (
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={handleApply}
              aria-label="Apply Now"
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-foreground text-background text-[11px] sm:text-xs font-medium h-8 py-1.5 pl-2.5 sm:pl-3 pr-1.5 sm:pr-2 whitespace-nowrap transition-colors duration-100 ease-out hover:bg-primary hover:text-primary-foreground group-hover/card:bg-primary group-hover/card:text-primary-foreground"
            >
              Apply Now
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/15">
                <motion.span
                  className="inline-flex"
                  variants={{
                    rest: { x: 0, y: 0 },
                    hover: { x: 4, y: -4 },
                  }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ArrowUpRight className="h-3 w-3" strokeWidth={2.4} />
                </motion.span>
              </span>
            </button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleSave} aria-label="บันทึกงาน">
              <Bookmark className={cn("w-4 h-4", isSaved && "fill-primary text-primary")} />
            </Button>
          </div>
        ) : (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0" onClick={handleSave} aria-label="บันทึกงาน">
            <Bookmark className={cn("w-4 h-4", isSaved && "fill-primary text-primary")} />
          </Button>
        )}
      </div>
    </motion.article>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="text-left w-full">
        {content}
      </button>
    );
  }
  return (
    <Link to={`/hiring/${job.id}`} className="block h-full">
      {content}
    </Link>
  );
};

export default JobCard;
