export type AdDestinationKind = "external" | "project";

type Props = {
  title: string;
  imageUrl: string;
};

/** Feed-card lookalike for the advertise form — does not log impressions. */
const AdCardPreview = ({ title, imageUrl }: Props) => {
  const heading = title.trim() || "ชื่อโฆษณา";

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">พรีวิวการ์ดในฟีด</p>
      <div className="select-none">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm bg-muted">
          {imageUrl ? (
            <img loading="lazy" decoding="async" src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-muted-foreground">
              อัปโหลดภาพหรือเลือกผลงานเพื่อดูพรีวิว
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2 px-0.5">
          <p className="min-w-0 flex-1 truncate text-base text-foreground">{heading}</p>
          <span className="shrink-0 rounded-full border border-foreground/15 bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground">
            Sponsored
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdCardPreview;
