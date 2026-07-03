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

const ProjectContextCard = ({ context, className }: Props) => {
  const [open, setOpen] = useState(false);
  const rows: { label: string; value: string }[] = [];
  if (context.creator_role?.trim()) rows.push({ label: "บทบาทของฉัน", value: context.creator_role.trim() });
  if (context.brief?.trim()) rows.push({ label: "โจทย์ของงาน", value: context.brief.trim() });
  if (context.process_note?.trim()) rows.push({ label: "วิธีคิด / ขั้นตอนทำงาน", value: context.process_note.trim() });
  if (context.deliverables?.trim()) rows.push({ label: "สิ่งที่ส่งมอบ", value: context.deliverables.trim() });
  if (context.duration_label?.trim()) rows.push({ label: "ระยะเวลา", value: context.duration_label.trim() });
  if (context.outcome_note?.trim()) rows.push({ label: "ผลลัพธ์ / สิ่งที่ได้เรียนรู้", value: context.outcome_note.trim() });

  if (rows.length === 0) return null;

  const shortRows = rows.filter((r) => r.label === "สิ่งที่ส่งมอบ" || r.label === "ระยะเวลา");
  const longRows = rows.filter((r) => r.label !== "สิ่งที่ส่งมอบ" && r.label !== "ระยะเวลา");

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
              <p className="text-sm text-muted-foreground leading-relaxed">
                {open
                  ? "ย่อรายละเอียด"
                  : "อ่านรายละเอียดเพิ่มเติม — โจทย์ บทบาท วิธีคิด และผลลัพธ์ของงานนี้"}
              </p>
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
          <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0 space-y-5 border-t border-border/50">
            {shortRows.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-3 pt-5">
                {shortRows.map((r) => (
                  <FieldBlock key={r.label} label={r.label} value={r.value} />
                ))}
              </div>
            )}

            <div className={cn("space-y-3", shortRows.length > 0 ? "" : "pt-5")}>
              {longRows.map((r) => (
                <FieldBlock key={r.label} label={r.label} value={r.value} />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
};

export default ProjectContextCard;
