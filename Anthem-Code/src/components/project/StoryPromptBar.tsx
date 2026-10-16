import { BookOpenText, Check } from "lucide-react";
import type { ProjectContentBlock } from "@/lib/projectContentBlocks";
import { cn } from "@/lib/utils";

/** Headings are stored as rich text — compare on the visible words. */
const stripHtmlToText = (html: string) => html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");

/** Plain questions instead of "write a case study" — each adds an optional text block. */
export const STORY_PROMPTS = [
  { id: "about", label: "ที่มา", question: "โปรเจกต์นี้เกี่ยวกับอะไร" },
  { id: "challenge", label: "โจทย์", question: "โจทย์หรือปัญหาที่อยากแก้คืออะไร" },
  { id: "idea", label: "ไอเดีย", question: "ไอเดียของคุณคืออะไร" },
  { id: "process", label: "กระบวนการ", question: "ทำออกมายังไง" },
  { id: "outcome", label: "ผลลัพธ์", question: "ผลลัพธ์เป็นยังไง" },
] as const;

type Props = {
  blocks: ProjectContentBlock[];
  disabled?: boolean;
  onAdd: (question: string) => void;
};

/**
 * Helps people tell the story of a work without writing a thesis: tap a question, answer it below.
 * Everything is optional — publish first, add the story later.
 */
export default function StoryPromptBar({ blocks, disabled, onAdd }: Props) {
  const used = new Set(blocks.map((b) => stripHtmlToText(b.heading ?? "").trim()));
  return (
    <div className="space-y-2 rounded-2xl border border-dashed border-border/80 bg-muted/20 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <BookOpenText className="h-3.5 w-3.5 text-primary" aria-hidden />
        เล่าเรื่องผลงาน <span className="font-normal text-muted-foreground">— ไม่บังคับ กดคำถามแล้วตอบสั้น ๆ ได้เลย</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {STORY_PROMPTS.map((p) => {
          const done = used.has(p.question);
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled || done}
              title={p.question}
              onClick={() => onAdd(p.question)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
                done
                  ? "border-transparent bg-primary/10 text-primary"
                  : "border-border bg-background hover:border-primary/50 hover:text-primary",
              )}
            >
              {done ? <Check className="h-3 w-3" aria-hidden /> : null}
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
