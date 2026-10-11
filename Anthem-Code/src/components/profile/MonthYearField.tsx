import { useEffect, useState } from "react";
import { CV_MONTHS_SHORT, composePeriodPoint, parsePeriodPoint, type CvDateLang } from "@/lib/cvDates";

const CONTROL_CLASS =
  "mt-1 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-xs placeholder:font-light placeholder:text-muted-foreground/40 disabled:opacity-60 disabled:cursor-not-allowed";

type Props = {
  label: string;
  /** "YYYY-MM", "YYYY" or legacy free text. */
  value: string;
  onChange: (value: string) => void;
  lang: CvDateLang;
  monthPlaceholder: string;
  yearPlaceholder: string;
  disabled?: boolean;
  /** Shown instead of the inputs while disabled (e.g. "Present"). */
  disabledText?: string;
};

/** Month (optional) + 4-digit year. Old free-text periods stay editable as plain text. */
export default function MonthYearField({
  label,
  value,
  onChange,
  lang,
  monthPlaceholder,
  yearPlaceholder,
  disabled,
  disabledText,
}: Props) {
  const parsed = parsePeriodPoint(value);
  const [year, setYear] = useState(parsed?.year ?? "");
  const [month, setMonth] = useState(parsed?.month ?? "");

  // Follow outside changes (switching entry, reset) but not our own partial typing.
  useEffect(() => {
    if (!parsed) return;
    if (composePeriodPoint({ year, month }) !== value) {
      setYear(parsed.year);
      setMonth(parsed.month);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the external value
  }, [value]);

  if (disabled) {
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <input value={disabledText ?? ""} disabled readOnly className={`${CONTROL_CLASS} w-full px-3 py-2`} />
      </div>
    );
  }

  if (!parsed) {
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <input
          value={value}
          maxLength={40}
          onChange={(e) => onChange(e.target.value)}
          className={`${CONTROL_CLASS} w-full px-3 py-2`}
        />
      </div>
    );
  }

  const emit = (nextYear: string, nextMonth: string) => onChange(composePeriodPoint({ year: nextYear, month: nextMonth }));

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <select
          value={month}
          aria-label={`${label} — ${monthPlaceholder}`}
          onChange={(e) => {
            setMonth(e.target.value);
            emit(year, e.target.value);
          }}
          className={`${CONTROL_CLASS} w-[42%] px-2 py-2`}
        >
          <option value="">{monthPlaceholder}</option>
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
          placeholder={yearPlaceholder}
          aria-label={`${label} — ${yearPlaceholder}`}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, 4);
            setYear(next);
            emit(next, month);
          }}
          className={`${CONTROL_CLASS} min-w-0 flex-1 px-3 py-2`}
        />
      </div>
    </div>
  );
}
