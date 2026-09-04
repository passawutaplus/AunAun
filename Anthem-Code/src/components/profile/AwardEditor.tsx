import { useState } from "react";
import { Check, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { awardItemSchema, type AwardItem } from "@/lib/profileCv";
import { cn } from "@/lib/utils";
import { useAboutEditLocale } from "@/components/profile/AboutEditLocale";

type Props = {
  value: AwardItem[];
  onChange: (v: AwardItem[]) => void;
};

const emptyDraft = (): AwardItem => ({ event: "", award: "", year: "" });

export default function AwardEditor({ value, onChange }: Props) {
  const { t } = useAboutEditLocale();
  const [draft, setDraft] = useState<AwardItem>(emptyDraft);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const clearDraft = () => {
    setDraft(emptyDraft());
    setEditingIndex(null);
  };

  const confirmDraft = () => {
    const next = {
      event: draft.event.trim(),
      award: draft.award.trim(),
      year: draft.year.trim(),
    };
    const parsed = awardItemSchema.safeParse(next);
    if (!parsed.success) {
      toast.error(t.awardIncomplete);
      return;
    }
    if (editingIndex === null) {
      onChange([...value, parsed.data].slice(0, 8));
    } else {
      onChange(value.map((it, i) => (i === editingIndex ? parsed.data : it)));
    }
    clearDraft();
  };

  const startEdit = (i: number) => {
    setEditingIndex(i);
    setDraft({ ...emptyDraft(), ...value[i] });
  };

  const remove = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
    if (editingIndex === i) clearDraft();
    else if (editingIndex !== null && editingIndex > i) setEditingIndex(editingIndex - 1);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">
            {editingIndex === null ? t.addAward : t.editAward}
          </p>
          {editingIndex !== null ? (
            <button
              type="button"
              onClick={clearDraft}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> {t.cancelEdit}
            </button>
          ) : null}
        </div>
        <Field
          label={t.event}
          value={draft.event}
          onChange={(event) => setDraft((d) => ({ ...d, event }))}
          placeholder={t.eventPh}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label={t.award}
            value={draft.award}
            onChange={(award) => setDraft((d) => ({ ...d, award }))}
            placeholder={t.awardPh}
          />
          <Field
            label={t.year}
            value={draft.year}
            onChange={(year) => setDraft((d) => ({ ...d, year }))}
            placeholder="e.g. 2566"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            disabled={!draft.event.trim() || !draft.award.trim() || (value.length >= 8 && editingIndex === null)}
            onClick={confirmDraft}
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            {editingIndex === null ? t.add : t.update}
          </Button>
          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={clearDraft}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            {t.clear}
          </Button>
        </div>
      </div>
      {value.length > 0 ? (
        <ul className="space-y-2">
          {value.map((it, i) => (
            <li
              key={`${it.event}-${i}`}
              className={cn(
                "rounded-xl border px-4 py-3 flex items-start gap-3",
                editingIndex === i ? "border-primary/40 bg-primary/5" : "border-border bg-background/40",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{it.award}</p>
                <p className="text-xs text-muted-foreground">
                  {[it.event, it.year].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(i)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                  aria-label={t.edit}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  aria-label={t.remove}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs font-light text-muted-foreground/70 px-1">{t.awardsEmpty}</p>
      )}
    </div>
  );
}

const Field = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-xs placeholder:font-light placeholder:text-muted-foreground/40"
    />
  </div>
);
