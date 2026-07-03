import OpportunityTypeChips from "@/components/opportunity/OpportunityTypeChips";

export type ProjectContextData = {
  brief?: string | null;
  creator_role?: string | null;
  process_note?: string | null;
  deliverables?: string | null;
  duration_label?: string | null;
  outcome_note?: string | null;
  opportunity_types?: string[] | null;
  opportunity_note?: string | null;
};

type Props = {
  context: ProjectContextData;
  className?: string;
};

function FieldBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{value}</p>
    </div>
  );
}

const ProjectContextCard = ({ context, className }: Props) => {
  const rows: { label: string; value: string }[] = [];
  if (context.brief?.trim()) rows.push({ label: "โจทย์ของงาน", value: context.brief.trim() });
  if (context.creator_role?.trim()) rows.push({ label: "บทบาทของฉัน", value: context.creator_role.trim() });
  if (context.process_note?.trim()) rows.push({ label: "วิธีคิด / Process", value: context.process_note.trim() });
  if (context.deliverables?.trim()) rows.push({ label: "สิ่งที่ส่งมอบ", value: context.deliverables.trim() });
  if (context.duration_label?.trim()) rows.push({ label: "ระยะเวลา", value: context.duration_label.trim() });
  if (context.outcome_note?.trim()) rows.push({ label: "ผลลัพธ์ / สิ่งที่ได้เรียนรู้", value: context.outcome_note.trim() });
  if (context.opportunity_note?.trim()) {
    rows.push({ label: "โอกาสที่เกี่ยวข้อง", value: context.opportunity_note.trim() });
  }

  const hasTypes = (context.opportunity_types ?? []).length > 0;
  if (rows.length === 0 && !hasTypes) return null;

  return (
    <section className={className ?? "rounded-2xl glass-panel p-5 space-y-4"}>
      <div>
        <h2 className="text-base font-semibold text-foreground">บริบทผลงาน</h2>
        <p className="text-xs text-muted-foreground mt-0.5">โจทย์ บทบาท และผลลัพธ์ — ช่วยให้คนดูเข้าใจว่าคุณทำอะไร</p>
      </div>
      {hasTypes && (
        <OpportunityTypeChips types={context.opportunity_types} size="md" />
      )}
      <div className="space-y-4">
        {rows.map((r) => (
          <FieldBlock key={r.label} label={r.label} value={r.value} />
        ))}
      </div>
    </section>
  );
};

export default ProjectContextCard;
