import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CV_LANGUAGE_LEVELS,
  CV_LANGUAGE_OPTIONS,
  CV_LANGUAGE_OTHER,
  normalizeCvLanguage,
  type CvLanguageItem,
  type CvLanguageLevel,
} from "@/lib/profileCv";
import { useAboutEditLocale } from "@/components/profile/AboutEditLocale";
import { languageDisplayName } from "@/lib/aboutEditCopy";

type Props = {
  value: CvLanguageItem[];
  onChange: (v: CvLanguageItem[]) => void;
};

const SELECT_CLASS =
  "w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function LanguageEditor({ value, onChange }: Props) {
  const { t } = useAboutEditLocale();
  const [name, setName] = useState("");
  const [customName, setCustomName] = useState("");
  const [level, setLevel] = useState<CvLanguageLevel | "">("");

  const taken = useMemo(() => new Set(value.map((item) => item.name.toLowerCase())), [value]);

  const available = useMemo(
    () => CV_LANGUAGE_OPTIONS.filter((item) => !taken.has(item.toLowerCase())),
    [taken],
  );

  const resolvedName =
    name === CV_LANGUAGE_OTHER ? (normalizeCvLanguage(customName) ?? "") : name;

  const canAdd =
    !!resolvedName &&
    !!level &&
    value.length < 8 &&
    !taken.has(resolvedName.toLowerCase());

  const add = () => {
    if (!canAdd || !level) return;
    onChange([...value, { name: resolvedName, level }]);
    setName("");
    setCustomName("");
    setLevel("");
  };

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  const setItemLevel = (index: number, nextLevel: CvLanguageLevel | "") =>
    onChange(value.map((item, i) => (i === index ? { ...item, level: nextLevel } : item)));

  return (
    <div className="space-y-3">
      {value.length < 8 ? (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="cv-lang-name">
                {t.language}
              </label>
              <select
                id="cv-lang-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (e.target.value !== CV_LANGUAGE_OTHER) setCustomName("");
                }}
                className={SELECT_CLASS}
              >
                <option value="">{t.selectLanguage}</option>
                {available.map((item) => (
                  <option key={item} value={item}>
                    {languageDisplayName(item, t)}
                  </option>
                ))}
                <option value={CV_LANGUAGE_OTHER}>{t.other}</option>
              </select>
            </div>
            {name === CV_LANGUAGE_OTHER ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="cv-lang-custom">
                  {t.other}
                </label>
                <input
                  id="cv-lang-custom"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={t.otherLanguagePh}
                  maxLength={40}
                  className={SELECT_CLASS}
                />
              </div>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="cv-lang-level">
              {t.level}
            </label>
            <select
              id="cv-lang-level"
              value={level}
              onChange={(e) => setLevel((e.target.value || "") as CvLanguageLevel | "")}
              className={SELECT_CLASS}
            >
              <option value="">{t.selectLevel}</option>
              {CV_LANGUAGE_LEVELS.map((id) => (
                <option key={id} value={id}>
                  {t.languageLevels[id]}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            size="icon"
            className="rounded-full shrink-0"
            disabled={!canAdd}
            onClick={add}
            aria-label={t.addLanguage}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      ) : null}

      {value.length > 0 ? (
        <ul className="space-y-1.5">
          {value.map((item, i) => (
            <li
              key={`${item.name}-${i}`}
              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/40 px-3 py-2"
            >
              <p className="text-sm text-foreground min-w-0 truncate">{languageDisplayName(item.name, t)}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                <select
                  value={item.level}
                  onChange={(e) => setItemLevel(i, (e.target.value || "") as CvLanguageLevel | "")}
                  className="max-w-[9.5rem] rounded-lg border border-border bg-secondary px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  aria-label={`${languageDisplayName(item.name, t)} ${t.level}`}
                >
                  <option value="">{t.selectLevel}</option>
                  {CV_LANGUAGE_LEVELS.map((id) => (
                    <option key={id} value={id}>
                      {t.languageLevels[id]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  aria-label={`${t.remove} ${languageDisplayName(item.name, t)}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs font-light text-muted-foreground/70">{t.languagesEmpty}</p>
      )}
    </div>
  );
}
