import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  cover: string;
  title: string;
  shortDescription: string;
  category: string;
  tags: string[];
  hiringOn: boolean;
  collabOn: boolean;
  ownerName: string;
  /** The cover picker, shown right under the card so changing the cover is one click away. */
  coverControl: ReactNode;
};

/** Left side of the details dialog: how the work looks as a card, updating live as the form is filled. */
export function ProjectDetailsPreview({
  cover,
  title,
  shortDescription,
  category,
  tags,
  hiringOn,
  collabOn,
  ownerName,
  coverControl,
}: Props) {
  const shownTags = tags.slice(0, 6);
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-muted-foreground">ตัวอย่างที่คนเห็น</p>
      <article className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="relative aspect-[4/3] w-full bg-muted">
          {cover ? (
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">ยังไม่มีภาพปก</div>
          )}
        </div>
        <div className="space-y-2 px-4 py-3">
          <h3 className={cn("font-display text-lg font-normal leading-snug", !title.trim() && "text-muted-foreground/70")}>
            {title.trim() || "ผลงานที่ยังไม่มีชื่อ"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {ownerName}
            {category ? ` · ${category}` : ""}
          </p>
          {shortDescription.trim() ? (
            <p className="line-clamp-3 text-sm leading-relaxed text-foreground/80">{shortDescription.trim()}</p>
          ) : (
            <p className="text-sm text-muted-foreground/60">รายละเอียดสั้น ๆ จะขึ้นตรงนี้</p>
          )}
          {shownTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {shownTags.map((tag) => (
                <span key={tag} className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          {hiringOn || collabOn ? (
            <div className="flex gap-1.5 pt-1">
              {hiringOn ? (
                <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[11px] text-background">สนใจจ้าง</span>
              ) : null}
              {collabOn ? (
                <span className="rounded-full border border-foreground/60 px-2.5 py-0.5 text-[11px] text-foreground">
                  สนใจคอลแลป
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>
      {coverControl}
    </div>
  );
}
