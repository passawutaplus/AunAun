import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type ProjectContextData = {
  brief?: string | null;
  creator_role?: string | null;
  process_note?: string | null;
  deliverables?: string | null;
  duration_label?: string | null;
  outcome_note?: string | null;
};

type Props = {
  context: ProjectContextData;
  className?: string;
};

function FieldBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 px-4 py-3 space-y-1.5">
      <p className="text-xs font-semibold text-primary">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{value}</p>
    </div>
  );
}

function oneLine(raw: string, max = 88): string {
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
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

  const hasAny =
    !!creatorRole || !!brief || !!processNote || !!deliverables || !!durationLabel || !!outcomeNote;
  if (!hasAny) return null;

  const peekRole = creatorRole ? oneLine(creatorRole, 72) : "";
  /** Second peek line: brief first, else next filled field in form order. */
  const peekSecondary =
    (brief && { label: "โจทย์", value: oneLine(brief, 96) }) ||
    (processNote && { label: "วิธีคิด", value: oneLine(processNote, 96) }) ||
    (deliverables && { label: "สิ่งที่ส่งมอบ", value: oneLine(deliverables, 96) }) ||
    (durationLabel && { label: "ระยะเวลา", value: oneLine(durationLabel, 96) }) ||
    (outcomeNote && { label: "ผลลัพธ์", value: oneLine(outcomeNote, 96) }) ||
    null;
  const hasPeek = !!peekRole || !!peekSecondary;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <section className="overflow-hidden">
        <div className="px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0 space-y-2.5">
            <div className="space-y-1">
              <h2 className="text-base font-semibold leading-snug text-foreground sm:text-[17px]">
                เล่าเบื้องหลังผลงานนี้
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                โจทย์ · บทบาท · วิธีคิด · ผลลัพธ์ — ข้อมูลที่ทีมงานอยากรู้ก่อนคุย
              </p>
            </div>

            {!open && hasPeek ? (
              <div className="space-y-1.5 rounded-xl border border-border/40 bg-background/50 px-3.5 py-3">
                {peekRole ? (
                  <p className="text-sm leading-snug text-foreground">
                    <span className="font-medium text-primary">บทบาท</span>
                    <span className="text-muted-foreground"> · </span>
                    {peekRole}
                  </p>
                ) : null}
                {peekSecondary ? (
                  <p className="text-sm leading-snug text-foreground">
                    <span className="font-medium text-primary">{peekSecondary.label}</span>
                    <span className="text-muted-foreground"> · </span>
                    {peekSecondary.value}
                  </p>
                ) : null}
              </div>
            ) : null}

            {!open && !hasPeek ? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                มีเบื้องหลังงานนี้ให้ดูเพิ่ม — กดอ่านได้ด้านล่าง
              </p>
            ) : null}

            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 py-0.5 text-xs font-medium text-primary transition-opacity hover:opacity-80"
                aria-expanded={open}
              >
                {open ? "ย่อ" : "อ่านเพิ่มเติม"}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    open && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          <div className="space-y-3 border-t border-border/50 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            {creatorRole ? <FieldBlock label="บทบาทของฉัน" value={creatorRole} /> : null}
            {brief ? <FieldBlock label="โจทย์ของงาน" value={brief} /> : null}
            {processNote ? <FieldBlock label="วิธีคิด / ขั้นตอนทำงาน" value={processNote} /> : null}

            {(deliverables || durationLabel) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {deliverables ? <FieldBlock label="สิ่งที่ส่งมอบ" value={deliverables} /> : null}
                {durationLabel ? <FieldBlock label="ระยะเวลา" value={durationLabel} /> : null}
              </div>
            )}

            {outcomeNote ? (
              <FieldBlock label="ผลลัพธ์ / สิ่งที่ได้เรียนรู้" value={outcomeNote} />
            ) : null}
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
};

export default ProjectContextCard;
