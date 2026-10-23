import { useState } from "react";
import { BookOpen, ChevronDown, Clock, Lightbulb, Package, Sparkles, Target, UserRound, type LucideIcon } from "lucide-react";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { parseProjectContextImages } from "@/components/project/ProjectContextEditorFields";

export type ProjectContextData = {
  brief?: string | null;
  creator_role?: string | null;
  process_note?: string | null;
  deliverables?: string | null;
  duration_label?: string | null;
  outcome_note?: string | null;
  context_images?: unknown;
};

type Props = {
  context: ProjectContextData;
  className?: string;
};

type FieldItem = { label: string; value: string; images?: string[]; icon?: LucideIcon };

function FieldRow({ label, value, images, icon: Icon, showDivider }: FieldItem & { showDivider: boolean }) {
  return (
    <div className={cn("space-y-1 py-3.5", showDivider && "border-b border-border/55")}>
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
        {label}
      </p>
      {value ? <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{value}</p> : null}
      {images?.length ? (
        <div className={cn("grid gap-2 pt-2", images.length > 1 && "grid-cols-2")}>
          {images.map((url) => (
            <img
              key={url}
              src={url}
              alt={label}
              loading="lazy"
              className="w-full rounded-lg border border-border/50 object-cover"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Same field order as ProjectContextEditorFields (publish form). */
const ProjectContextCard = ({ context, className }: Props) => {
  const [open, setOpen] = useState(false);

  const creatorRole = context.creator_role?.trim() ?? "";
  const brief = context.brief?.trim() ?? "";
  const processNote = context.process_note?.trim() ?? "";
  const deliverables = context.deliverables?.trim() ?? "";
  const durationLabel = context.duration_label?.trim() ?? "";
  const outcomeNote = context.outcome_note?.trim() ?? "";
  const images = parseProjectContextImages(context.context_images);

  const fields = [
    creatorRole ? { label: "บทบาทของฉัน", value: creatorRole, icon: UserRound } : null,
    brief || images.brief ? { label: "โจทย์ของงาน", value: brief, images: images.brief, icon: Target } : null,
    processNote || images.process
      ? { label: "วิธีคิด / ขั้นตอนทำงาน", value: processNote, images: images.process, icon: Lightbulb }
      : null,
    deliverables ? { label: "สิ่งที่ส่งมอบ", value: deliverables, icon: Package } : null,
    durationLabel ? { label: "ระยะเวลา", value: durationLabel, icon: Clock } : null,
    outcomeNote || images.outcome
      ? { label: "ผลลัพธ์ / สิ่งที่ได้เรียนรู้", value: outcomeNote, images: images.outcome, icon: Sparkles }
      : null,
  ].filter((item) => item != null) as FieldItem[];

  if (!fields.length) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <section className="overflow-hidden">
        <h2>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 border-y border-foreground/20 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-expanded={open}
            >
              <span className="flex min-w-0 items-center gap-2 text-lg font-semibold leading-snug text-foreground">
                <BookOpen className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                เล่าเบื้องหลังผลงานนี้
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
                {open ? "ย่อ" : "อ่านเพิ่มเติม"}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-300 ease-out motion-reduce:transition-none",
                    open && "rotate-180",
                  )}
                  aria-hidden
                />
              </span>
            </button>
          </CollapsibleTrigger>
        </h2>

        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div
            className={cn(
              "min-h-0 overflow-hidden transition-opacity duration-300 ease-out motion-reduce:transition-none",
              open ? "opacity-100" : "opacity-0",
            )}
            aria-hidden={!open}
          >
            {fields.map((field, index) => (
              <FieldRow
                key={field.label}
                label={field.label}
                value={field.value}
                images={field.images}
                icon={field.icon}
                showDivider={index < fields.length - 1}
              />
            ))}
          </div>
        </div>
      </section>
    </Collapsible>
  );
};

export default ProjectContextCard;
