import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CV_REFERENCES_MAX, type ReferenceItem } from "@/lib/profileCv";
import { useAboutEditLocale } from "@/components/profile/AboutEditLocale";

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-xs placeholder:font-light placeholder:text-muted-foreground/40";

type Props = {
  value: ReferenceItem[];
  onChange: (next: ReferenceItem[]) => void;
};

/** Up to three people who can vouch for the owner. Rows with an empty name are dropped on save. */
export default function CvReferencesEditor({ value, onChange }: Props) {
  const { t } = useAboutEditLocale();

  const patch = (index: number, change: Partial<ReferenceItem>) =>
    onChange(value.map((item, i) => (i === index ? { ...item, ...change } : item)));

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t.referencesHint}</p>
      {value.map((item, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-border/70 p-3">
          <div className="flex items-start gap-2">
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
              <input
                value={item.name}
                maxLength={60}
                placeholder={t.referenceName}
                aria-label={t.referenceName}
                onChange={(e) => patch(i, { name: e.target.value })}
                className={INPUT_CLASS}
              />
              <input
                value={item.role ?? ""}
                maxLength={80}
                placeholder={t.referenceRole}
                aria-label={t.referenceRole}
                onChange={(e) => patch(i, { role: e.target.value })}
                className={INPUT_CLASS}
              />
              <input
                value={item.contact ?? ""}
                maxLength={80}
                placeholder={t.referenceContact}
                aria-label={t.referenceContact}
                onChange={(e) => patch(i, { contact: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full text-muted-foreground"
              aria-label={t.removeLabel}
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      {value.length < CV_REFERENCES_MAX ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => onChange([...value, { name: "", role: "", contact: "" }])}
        >
          <Plus className="mr-1 h-4 w-4" />
          {t.addReference}
        </Button>
      ) : null}
    </div>
  );
}
