import { Eye } from "lucide-react";
import { PlusOneControl } from "@/components/brand/PlusOneControl";
import UserAvatar from "@/components/UserAvatar";
import { ProjectFeedPreviewToolbar } from "@/components/project/ProjectFeedPreviewToolbar";
import { cn } from "@/lib/utils";

const SKELETON_ASPECT = "aspect-[4/3]";

function FeedSkeletonCard() {
  return (
    <article className="space-y-2">
      <div className={cn("w-full rounded-sm bg-muted/70 animate-pulse", SKELETON_ASPECT)} />
      <div className="flex items-center gap-2">
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

  const highlighted = (
    <article className="ring-2 ring-primary/40 ring-offset-2 ring-offset-background rounded-sm">
      <div className={cn("relative w-full overflow-hidden rounded-sm bg-muted", SKELETON_ASPECT)}>
        {cover ? (
          <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-brand-soft" />
        )}
      </div>
      <div className="pt-2 px-0.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <UserAvatar src={ownerAvatar} name={ownerName} className="w-6 h-6 shrink-0" />
          <span className="text-sm text-foreground/90 line-clamp-1">{ownerName}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />0
          </span>
          <PlusOneControl active={false} count={0} showCount={false} ariaLabel="+1" />
        </div>
      </div>
      <p className="sr-only">{displayTitle}</p>
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
          {!fit && <FeedSkeletonCard />}
        </div>
        <div className={cn("space-y-3", fit && "min-h-0 overflow-hidden")}>
          {(fit ? [0] : [0, 1, 2]).map((i) => (
            <FeedSkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
