import { Plus, Trash2 } from "lucide-react";
import type { ProfileFaqItem } from "@/lib/validators";

interface Props {
  value: ProfileFaqItem[];
  onChange: (v: ProfileFaqItem[]) => void;
}

const blank: ProfileFaqItem = { question: "", answer: "" };

const ProfileFaqEditor = ({ value, onChange }: Props) => {
  const update = (i: number, patch: Partial<ProfileFaqItem>) =>
    onChange(value.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => onChange([...value, { ...blank }]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        ตอบคำถามที่ลูกค้ามักถาม — แสดงบนโปรไฟล์สาธารณะแทน forum กลาง
      </p>
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
          <div>
            <label className="text-xs font-medium text-muted-foreground">คำถาม</label>
            <input
              value={it.question}
              onChange={(e) => update(i, { question: e.target.value })}
              placeholder="รับงานอะไรบ้าง?"
              maxLength={120}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">คำตอบ</label>
            <textarea
              value={it.answer}
              onChange={(e) => update(i, { answer: e.target.value })}
              rows={3}
              maxLength={500}
              placeholder="รับงาน branding, motion, web UI..."
              className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>
      ))}
      {value.length < 10 && (
        <button
          type="button"
          onClick={add}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 py-3 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus className="w-4 h-4" /> เพิ่มคำถาม-ตอบ
        </button>
      )}
    </div>
  );
};

export default ProfileFaqEditor;
