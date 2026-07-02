import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  count?: number;
  columns?: string;
}

const MASONRY_ASPECTS = ["aspect-[3/4]", "aspect-[4/5]", "aspect-square", "aspect-[5/4]", "aspect-[3/5]"] as const;

/** Skeleton grid matching FeedPage masonry project layout */
export default function ProjectGridSkeleton({
  count = 10,
  columns = "columns-2 sm:columns-3 md:columns-4 lg:columns-4 2xl:columns-5",
}: Props) {
  return (
    <div className={`${columns} gap-2 sm:gap-3 lg:gap-4`} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="break-inside-avoid mb-2 sm:mb-3">
          <Skeleton className={`w-full rounded-sm ${MASONRY_ASPECTS[i % MASONRY_ASPECTS.length]}`} />
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
