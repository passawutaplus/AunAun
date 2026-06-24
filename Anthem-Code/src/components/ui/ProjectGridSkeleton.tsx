import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  count?: number;
  columns?: string;
}

/** Skeleton grid matching FeedPage project layout */
export default function ProjectGridSkeleton({
  count = 10,
  columns = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-5",
}: Props) {
  return (
    <div className={`grid ${columns} gap-2 sm:gap-3 lg:gap-4`} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden glass-panel">
          <Skeleton className="aspect-[4/5] w-full rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
