import { Skeleton } from "@/components/ui/skeleton";
import { useFeedGridDensity } from "@/hooks/useFeedGridDensity";
import { FEED_PROJECT_GRID_GAP } from "@/lib/feedMasonry";

interface Props {
  count?: number;
  gap?: string;
}

/** Skeleton grid matching FeedPage 4:3 project layout */
export default function ProjectGridSkeleton({
  count = 10,
  gap = FEED_PROJECT_GRID_GAP,
}: Props) {
  const { gridClass } = useFeedGridDensity();

  return (
    <div className={`${gridClass} ${gap}`} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Skeleton className="w-full rounded-sm aspect-[4/3]" />
          <div className="pt-2 px-0.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Skeleton className="w-6 h-6 rounded-full shrink-0" />
              <Skeleton className="h-3.5 flex-1 max-w-[8rem]" />
            </div>
            <Skeleton className="h-3 w-10 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
