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

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <section className="rounded-2xl glass-panel overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-start justify-between gap-3 px-5 py-4 sm:px-6 text-left hover:bg-muted/20 transition-colors"
            aria-expanded={open}
            aria-label={open ? "ย่อเล่าเบื้องหลังผลงาน" : "อ่านรายละเอียดเล่าเบื้องหลังผลงานเพิ่มเติม"}
          >
            <div className="min-w-0 space-y-1">
              <h2 className="text-base font-semibold text-foreground">เล่าเบื้องหลังผลงาน</h2>
              {!open ? (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  รายละเอียดเพิ่มเติม — โจทย์ บทบาท วิธีคิด และผลลัพธ์ของงานนี้
                </p>
              ) : null}
            </div>
            <ChevronDown
              className={cn(
                "w-5 h-5 text-muted-foreground shrink-0 mt-0.5 transition-transform duration-200",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-3 border-t border-border/50 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
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
