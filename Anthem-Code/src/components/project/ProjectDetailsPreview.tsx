import type { ReactNode } from "react";
import { Briefcase, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  shortDescription: string;
  category: string;
  tags: string[];
  hiringOn: boolean;
  collabOn: boolean;
  ownerName: string;
  /** The cover uploader; it fills the card's picture area so the card itself is where you set the cover. */
  coverControl: ReactNode;
  /** Small extras next to the heading (e.g. the cover ⓘ). */
  headingExtra?: ReactNode;
};

/** Left side of the details dialog: how the work looks as a card, updating live as the form is filled. */
export function ProjectDetailsPreview({
  title,
  shortDescription,
  category,
  tags,
  hiringOn,
  collabOn,
  ownerName,
  coverControl,
  headingExtra,
}: Props) {
  const shownTags = tags.slice(0, 6);
  return (
    <div className="space-y-4">
      <p id="project-details-cover" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        ตัวอย่างที่คนเห็น · ภาพปก <span className="text-primary">*</span>
        {headingExtra}
      </p>
      <article className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="p-2 pb-0">{coverControl}</div>
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
        </div>
        {hiringOn || collabOn ? (
          <div className="flex gap-2 border-t border-border px-4 py-3">
            {hiringOn ? (
              <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[hsl(var(--chat-hire))] px-3 py-1.5 text-xs font-medium text-white">
                <Briefcase className="h-3.5 w-3.5" aria-hidden />
                สนใจจ้าง
              </span>
            ) : null}
            {collabOn ? (
              <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-foreground/40 px-3 py-1.5 text-xs font-medium text-foreground">
                <Handshake className="h-3.5 w-3.5" aria-hidden />
                สนใจคอลแลป
              </span>
            ) : null}
          </div>
        ) : null}
      </article>
    </div>
  );
}
