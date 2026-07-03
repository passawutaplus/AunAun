import { Eye } from "lucide-react";
import { PlusOneControl } from "@/components/brand/PlusOneControl";
import UserAvatar from "@/components/UserAvatar";
import { ProjectFeedPreviewToolbar } from "@/components/project/ProjectFeedPreviewToolbar";
import { naturalFeedCoverUrl } from "@/lib/feedProjectCover";
import { cn } from "@/lib/utils";

const SKELETON_HEIGHTS = ["h-36", "h-44", "h-32", "h-40", "h-36", "h-48"] as const;

function FeedSkeletonCard({ heightClass }: { heightClass: string }) {
  return (
    <article className="space-y-2">
      <div className={cn("w-full rounded-sm bg-muted/70 animate-pulse", heightClass)} />
      <div className="flex items-center gap-2 px-0.5">
        <div className="w-6 h-6 rounded-full bg-muted/60 animate-pulse shrink-0" />
        <div className="h-2.5 flex-1 rounded bg-muted/50 animate-pulse" />
      </div>
    </article>
  );
}

type Props = {
  title: string;
  cover: string;
  ownerName: string;
  ownerAvatar?: string;
  fit?: boolean;
};

export function ProjectFeedPreview({ title, cover, ownerName, ownerAvatar, fit = false }: Props) {
  const displayTitle = title.trim() || "ชื่อผลงาน";
  const coverSrc = naturalFeedCoverUrl(cover);
  const hasCover = !!coverSrc;

  const highlighted = (
    <article className="ring-2 ring-primary/40 ring-offset-2 ring-offset-background rounded-sm">
      <div className="relative w-full overflow-hidden rounded-sm bg-muted">
        {hasCover ? (
          <>
            <img
              src={coverSrc}
              alt=""
              className="w-full h-auto block transition-transform duration-500"
            />
            <div
              className={cn(
                "absolute inset-0 pointer-events-none",
                "bg-gradient-to-t from-black/55 via-black/20 to-transparent",
                "supports-[backdrop-filter]:backdrop-blur-md [-webkit-backdrop-filter:blur(12px)]",
                "[mask-image:linear-gradient(to_top,black_28%,transparent_100%)]",
                "[-webkit-mask-image:linear-gradient(to_top,black_28%,transparent_100%)]",
              )}
            />
            <div className="absolute bottom-2 left-3 right-3 pointer-events-none">
              <p className="text-white text-sm font-medium line-clamp-1 thai-leading-tight drop-shadow">
                {displayTitle}
              </p>
            </div>
          </>
        ) : (
          <div className="aspect-[4/3] bg-gradient-brand-soft" />
        )}
      </div>
      <div className="pt-2 px-0.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <UserAvatar src={ownerAvatar} name={ownerName} className="w-6 h-6 shrink-0" />
          <span className="text-sm text-foreground/90 line-clamp-1 thai-leading-tight">{ownerName}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
          <span className="flex items-center gap-1" title="ยอดเข้าชม" aria-label="ยอดเข้าชม">
            <Eye className="w-3.5 h-3.5" />
            0
          </span>
          <PlusOneControl active={false} count={0} showCount={false} ariaLabel="+1" />
        </div>
      </div>
      {!hasCover ? <p className="sr-only">{displayTitle}</p> : null}
    </article>
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-background overflow-hidden",
        fit && "h-full flex flex-col min-h-0",
      )}
    >
      <ProjectFeedPreviewToolbar />
      <div className={cn("p-3 grid grid-cols-2 gap-3", fit && "flex-1 min-h-0 overflow-hidden")}>
        <div className={cn("space-y-3", fit && "min-h-0 overflow-hidden")}>
          {highlighted}
          {!fit && <FeedSkeletonCard heightClass={SKELETON_HEIGHTS[1]} />}
        </div>
        <div className={cn("space-y-3", fit && "min-h-0 overflow-hidden")}>
          {(fit ? SKELETON_HEIGHTS.slice(2, 3) : SKELETON_HEIGHTS.slice(2)).map((heightClass, i) => (
            <FeedSkeletonCard key={i} heightClass={heightClass} />
          ))}
        </div>
      </div>
    </div>
  );
}
