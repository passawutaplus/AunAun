import { useEffect, useState } from "react";
import { CV_MONTHS_SHORT, type CvDateLang } from "@/lib/cvDates";
import { normalizeBirthDate } from "@/lib/profileCv";

const CONTROL_CLASS =
  "rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-xs placeholder:font-light placeholder:text-muted-foreground/40";

type Props = {
  /** "YYYY-MM-DD" or "". */
  value: string;
  onChange: (value: string) => void;
  lang: CvDateLang;
  labels: { day: string; month: string; year: string; invalid: string };
};

const pad = (n: string) => n.padStart(2, "0");

function split(value: string): { day: string; month: string; year: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? { year: m[1], month: m[2], day: m[3] } : { year: "", month: "", day: "" };
}

/**
 * Day / month / year in separate controls so the order never depends on the
 * browser locale (a native date input shows mm/dd/yyyy outside Thailand).
 * Emits an ISO date only when all three parts make a real, past date.
 */
export default function BirthDateField({ value, onChange, lang, labels }: Props) {
  const initial = split(value);
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  // Follow outside changes (reset after save) but not our own partial typing.
  useEffect(() => {
    if (!value) return;
    const next = split(value);
    setDay(next.day);
    setMonth(next.month);
    setYear(next.year);
  }, [value]);

  const emit = (d: string, m: string, y: string) => {
    if (!d || !m || y.length !== 4) {
      onChange("");
      return;
    }
    onChange(normalizeBirthDate(`${y}-${m}-${pad(d)}`));
  };

  const complete = !!day && !!month && year.length === 4;
  const invalid = complete && !normalizeBirthDate(`${year}-${month}-${pad(day)}`);

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_6rem] gap-2">
        <select
          value={day}
          aria-label={labels.day}
          onChange={(e) => {
            setDay(e.target.value);
            emit(e.target.value, month, year);
          }}
          className={`${CONTROL_CLASS} px-2 py-2`}
        >
          <option value="">{labels.day}</option>
          {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((d) => (
            <option key={d} value={d}>
              {Number(d)}
            </option>
          ))}
        </select>
        <select
          value={month}
          aria-label={labels.month}
          onChange={(e) => {
            setMonth(e.target.value);
            emit(day, e.target.value, year);
          }}
          className={`${CONTROL_CLASS} px-2 py-2`}
        >
          <option value="">{labels.month}</option>
          {CV_MONTHS_SHORT[lang].map((name, i) => (
            <option key={name} value={String(i + 1).padStart(2, "0")}>
              {name}
            </option>
          ))}
        </select>
        <input
          value={year}
          inputMode="numeric"
          maxLength={4}
          placeholder={labels.year}
          aria-label={labels.year}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, 4);
            setYear(next);
            emit(day, month, next);
          }}
          className={`${CONTROL_CLASS} min-w-0 px-3 py-2`}
        />
      </div>
      {invalid ? (
        <p role="alert" className="text-xs text-destructive">
          {labels.invalid}
        </p>
      ) : null}
    </div>
  );
}
