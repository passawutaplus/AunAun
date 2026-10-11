import { useState } from "react";
import { Check, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  experienceEmploymentTypes,
  experienceItemSchema,
  formatExperiencePeriod,
  type ExperienceEmploymentType,
  type ExperienceItem,
} from "@/lib/validators";
import { cn } from "@/lib/utils";
import { useAboutEditLocale } from "@/components/profile/AboutEditLocale";
import MonthYearField from "@/components/profile/MonthYearField";

interface Props {
  value: ExperienceItem[];
  onChange: (v: ExperienceItem[]) => void;
}

const emptyDraft = (): ExperienceItem => ({
  title: "",
  company: "",
  period: "",
  periodStart: "",
  periodEnd: "",
  isCurrent: false,
  employmentType: null,
  description: "",
  highlights: [],
});

function composeItem(draft: ExperienceItem): ExperienceItem {
  const period = formatExperiencePeriod(draft);
  return {
    ...draft,
    title: draft.title.trim(),
    company: (draft.company ?? "").trim(),
    periodStart: (draft.periodStart ?? "").trim(),
    periodEnd: draft.isCurrent ? "" : (draft.periodEnd ?? "").trim(),
    period,
    highlights: (draft.highlights ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 4),
    description:
      (draft.highlights ?? []).map((s) => s.trim()).filter(Boolean).join("\n") ||
      (draft.description ?? "").trim(),
    employmentType: draft.employmentType ?? null,
    isCurrent: !!draft.isCurrent,
  };
}

const ExperienceEditor = ({ value, onChange }: Props) => {
  const { t, lang } = useAboutEditLocale();
  const [draft, setDraft] = useState<ExperienceItem>(emptyDraft);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const patchDraft = (patch: Partial<ExperienceItem>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const clearDraft = () => {
    setDraft(emptyDraft());
    setEditingIndex(null);
  };

  const confirmDraft = () => {
    const next = composeItem(draft);
    const parsed = experienceItemSchema.safeParse(next);
    if (!parsed.success) {
      toast.error(t.experienceIncomplete);
      return;
    }
    if (editingIndex === null) {
      onChange([...value, parsed.data]);
      toast.success(t.experienceAdded);
    } else {
      onChange(value.map((it, i) => (i === editingIndex ? parsed.data : it)));
      toast.success(t.experienceUpdated);
    }
    clearDraft();
  };

  const startEdit = (i: number) => {
    const it = value[i];
    setEditingIndex(i);
    setDraft({
      ...emptyDraft(),
      ...it,
      periodStart: it.periodStart || "",
      periodEnd: it.isCurrent ? "" : it.periodEnd || "",
      isCurrent: !!it.isCurrent,
      employmentType: it.employmentType ?? null,
    });
  };

  const remove = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
    if (editingIndex === i) clearDraft();
    else if (editingIndex !== null && editingIndex > i) setEditingIndex(editingIndex - 1);
  };

  const canConfirm = draft.title.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">
            {editingIndex === null ? t.addExperience : t.editExperience}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label={t.jobTitle}
            value={draft.title}
            onChange={(v) => patchDraft({ title: v })}
            placeholder={t.desiredPositionPh}
          />
          <Field
            label={t.company}
            value={draft.company ?? ""}
            onChange={(v) => patchDraft({ company: v })}
            placeholder={t.companyPh}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t.employmentType}</p>
          <div className="flex flex-wrap gap-1.5">
            {experienceEmploymentTypes.map((id) => {
              const active = draft.employmentType === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    patchDraft({ employmentType: active ? null : id })
                  }
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs border transition-colors",
                    active
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-secondary text-muted-foreground border-border hover:text-foreground",
                  )}
                >
                  {t.employment[id]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <MonthYearField
            label={t.start}
            value={draft.periodStart ?? ""}
            onChange={(v) => patchDraft({ periodStart: v })}
            lang={lang}
            monthPlaceholder={t.monthPh}
            yearPlaceholder={t.yearPh}
          />
          <MonthYearField
            label={t.end}
            value={draft.periodEnd ?? ""}
            onChange={(v) => patchDraft({ periodEnd: v, isCurrent: false })}
            lang={lang}
            monthPlaceholder={t.monthPh}
            yearPlaceholder={t.yearPh}
            disabled={!!draft.isCurrent}
            disabledText={t.present}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
          <Checkbox
            checked={!!draft.isCurrent}
            onCheckedChange={(checked) =>
              patchDraft({
                isCurrent: checked === true,
                periodEnd: checked === true ? "" : draft.periodEnd,
              })
            }
          />
          {t.currentlyWorking}
        </label>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t.highlights}
          </p>
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              value={draft.highlights?.[i] ?? ""}
              onChange={(e) => {
                const next = [...(draft.highlights ?? [])];
                while (next.length <= i) next.push("");
                next[i] = e.target.value;
                patchDraft({ highlights: next });
              }}
              maxLength={200}
              placeholder={
                i === 0
                  ? t.highlightPh0
                  : t.highlightPhNext
              }
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-xs placeholder:font-light placeholder:text-muted-foreground/40"
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            disabled={!canConfirm}
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
          {value.map((it, i) => {
            const period = formatExperiencePeriod(it, t.present) || it.period;
            const typeLabel = it.employmentType
              ? t.employment[it.employmentType as ExperienceEmploymentType]
              : null;
            const isEditing = editingIndex === i;
            return (
              <li
                key={`${it.title}-${i}`}
                className={cn(
                  "rounded-xl border px-4 py-3 flex items-start gap-3",
                  isEditing ? "border-primary/40 bg-primary/5" : "border-border bg-background/40",
                )}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm font-medium text-foreground truncate">{it.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {[it.company, period, typeLabel].filter(Boolean).join(" · ")}
                    {it.isCurrent ? (
                      <span className="ml-1.5 inline-flex items-center rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-medium">
                        {t.present}
                      </span>
                    ) : null}
                  </p>
                  {(it.highlights?.length ? it.highlights : it.description ? [it.description] : []).length ? (
                    <p className="text-xs text-muted-foreground line-clamp-2 pt-0.5">
                      {(it.highlights?.length ? it.highlights : [it.description]).filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(i)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                    aria-label={t.edit}
                    title={t.edit}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label={t.remove}
                    title={t.remove}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs font-light text-muted-foreground/70 px-1">
          {t.experienceEmpty}
        </p>
      )}
    </div>
  );
};

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-xs placeholder:font-light placeholder:text-muted-foreground/40 disabled:opacity-60 disabled:cursor-not-allowed"
    />
  </div>
);

export default ExperienceEditor;
