import { useState } from "react";
import { Check, GraduationCap, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  EDUCATION_DEGREES,
  educationDetailLine,
  educationItemSchema,
  educationNeedsFaculty,
  educationNeedsField,
  formatEducationPeriod,
  type EducationDegree,
  type EducationItem,
} from "@/lib/profileCv";
import { cn } from "@/lib/utils";
import { useAboutEditLocale } from "@/components/profile/AboutEditLocale";

type Props = {
  value: EducationItem[];
  onChange: (v: EducationItem[]) => void;
};

const SELECT_CLASS =
  "mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

const emptyDraft = (): EducationItem => ({
  school: "",
  degree: null,
  faculty: "",
  field: "",
  period: "",
  periodStart: "",
  periodEnd: "",
  isCurrent: false,
});

function composeItem(draft: EducationItem): EducationItem {
  const degree = draft.degree ?? null;
  const period = formatEducationPeriod(draft);
  return {
    school: draft.school.trim(),
    degree,
    faculty: educationNeedsFaculty(degree) ? (draft.faculty ?? "").trim() : "",
    field: (draft.field ?? "").trim(),
    periodStart: (draft.periodStart ?? "").trim(),
    periodEnd: draft.isCurrent ? "" : (draft.periodEnd ?? "").trim(),
    period,
    isCurrent: !!draft.isCurrent,
  };
}

export default function EducationEditor({ value, onChange }: Props) {
  const { t } = useAboutEditLocale();
  const [draft, setDraft] = useState<EducationItem>(emptyDraft);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const patchDraft = (patch: Partial<EducationItem>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const clearDraft = () => {
    setDraft(emptyDraft());
    setEditingIndex(null);
  };

  const confirmDraft = () => {
    const next = composeItem(draft);
    const parsed = educationItemSchema.safeParse(next);
    if (!parsed.success) {
      toast.error(t.educationIncomplete);
      return;
    }
    if (editingIndex === null) {
      onChange([...value, parsed.data]);
      toast.success(t.educationAdded);
    } else {
      onChange(value.map((it, i) => (i === editingIndex ? parsed.data : it)));
      toast.success(t.educationUpdated);
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
    });
  };

  const remove = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
    if (editingIndex === i) clearDraft();
    else if (editingIndex !== null && editingIndex > i) setEditingIndex(editingIndex - 1);
  };

  const degree = draft.degree ?? null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">
            {editingIndex === null ? t.addEducation : t.editEducation}
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
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="edu-degree">
              {t.degree}
            </label>
            <select
              id="edu-degree"
              value={degree ?? ""}
              onChange={(e) => {
                const next = (e.target.value || null) as EducationDegree | null;
                patchDraft({
                  degree: next,
                  faculty: educationNeedsFaculty(next) ? draft.faculty : "",
                  field: educationNeedsField(next) ? draft.field : "",
                });
              }}
              className={SELECT_CLASS}
            >
              <option value="">{t.selectDegree}</option>
              {EDUCATION_DEGREES.map((id) => (
                <option key={id} value={id}>
                  {t.degreeLabels[id]}
                </option>
              ))}
            </select>
          </div>
          <Field
            label={t.institution}
            value={draft.school}
            onChange={(v) => patchDraft({ school: v })}
            placeholder={t.institutionPh}
          />
        </div>

        {educationNeedsFaculty(degree) ? (
          <Field
            label={t.faculty}
            value={draft.faculty ?? ""}
            onChange={(v) => patchDraft({ faculty: v })}
            placeholder={t.facultyPh}
          />
        ) : null}

        {educationNeedsField(degree) || !!(draft.field ?? "").trim() ? (
          <Field
            label={t.fieldOfStudy}
            value={draft.field ?? ""}
            onChange={(v) => patchDraft({ field: v })}
            placeholder={t.fieldPh}
          />
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field
            label={t.start}
            value={draft.periodStart ?? ""}
            onChange={(v) => patchDraft({ periodStart: v })}
            placeholder="e.g. 2562"
          />
          <Field
            label={t.end}
            value={draft.isCurrent ? t.present : (draft.periodEnd ?? "")}
            onChange={(v) => patchDraft({ periodEnd: v, isCurrent: false })}
            placeholder="e.g. 2566"
            disabled={!!draft.isCurrent}
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
          {t.currentlyStudying}
        </label>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            disabled={!draft.school.trim()}
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
            const period = formatEducationPeriod(it, t.present) || it.period;
            const detail = educationDetailLine(it, t.degreeLabels);
            const isEditing = editingIndex === i;
            return (
              <li
                key={`${it.school}-${i}`}
                className={cn(
                  "rounded-xl border px-4 py-3 flex items-start gap-3",
                  isEditing ? "border-primary/40 bg-primary/5" : "border-border bg-background/40",
                )}
              >
                <GraduationCap className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm font-medium text-foreground truncate">{it.school}</p>
                  <p className="text-xs text-muted-foreground">
                    {[detail, period].filter(Boolean).join(" · ")}
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
            );
          })}
        </ul>
      ) : (
        <p className="text-xs font-light text-muted-foreground/70 px-1">
          {t.educationEmpty}
        </p>
      )}
    </div>
  );
}

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
