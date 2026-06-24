const CommunityGridSkeleton = () => (
  <div className="columns-2 gap-2 sm:gap-3">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="break-inside-avoid mb-2 sm:mb-3 animate-pulse">
        <div
          className={`rounded-xl bg-muted/70 ${i % 3 === 0 ? "aspect-[3/4]" : i % 3 === 1 ? "aspect-[4/5]" : "aspect-square"}`}
        />
        <div className="mt-2 h-3.5 bg-muted/60 rounded-md w-full" />
        <div className="mt-1.5 h-3 bg-muted/50 rounded-md w-2/3" />
        <div className="mt-2 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-muted/60" />
          <div className="h-2.5 bg-muted/50 rounded flex-1" />
        </div>
      </div>
    ))}
  </div>
);

export default CommunityGridSkeleton;
