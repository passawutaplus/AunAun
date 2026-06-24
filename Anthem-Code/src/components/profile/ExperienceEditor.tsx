import { Plus, Trash2 } from "lucide-react";
import type { ExperienceItem } from "@/lib/validators";

interface Props {
  value: ExperienceItem[];
  onChange: (v: ExperienceItem[]) => void;
}

const blank: ExperienceItem = { title: "", company: "", period: "", description: "" };

const ExperienceEditor = ({ value, onChange }: Props) => {
  const update = (i: number, patch: Partial<ExperienceItem>) =>
    onChange(value.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => onChange([...value, { ...blank }]);

  return (
    <div className="space-y-4">
      {value.map((it, i) => (
        <div key={i} className="rounded-xl border border-border bg-background/40 p-4 space-y-3 relative">
          <button
            type="button"
            onClick={() => remove(i)}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            aria-label="ลบ"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="ตำแหน่ง" value={it.title} onChange={(v) => update(i, { title: v })} placeholder="UI/UX Designer" />
            <Input label="บริษัท / ลูกค้า" value={it.company ?? ""} onChange={(v) => update(i, { company: v })} placeholder="Acme Co." />
            <Input label="ช่วงเวลา" value={it.period ?? ""} onChange={(v) => update(i, { period: v })} placeholder="2566 - ปัจจุบัน" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">รายละเอียดสั้นๆ</label>
            <textarea
              value={it.description ?? ""}
              onChange={(e) => update(i, { description: e.target.value })}
              rows={2}
              maxLength={400}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 py-3 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <Plus className="w-4 h-4" /> เพิ่มประสบการณ์
      </button>
    </div>
  );
};

const Input = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
    />
  </div>
);

export default ExperienceEditor;
