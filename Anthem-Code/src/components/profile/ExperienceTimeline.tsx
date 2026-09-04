import {
  EXPERIENCE_EMPLOYMENT_LABELS,
  formatExperiencePeriod,
  type ExperienceEmploymentType,
  type ExperienceItem,
} from "@/lib/validators";
import { experienceBullets } from "@/lib/profileCv";

const ExperienceTimeline = ({ items }: { items: ExperienceItem[] }) => {
  if (!items.length) {
    return <p className="text-xs font-light text-muted-foreground/70">No experience yet</p>;
  }
  return (
    <ol className="space-y-6">
      {items.map((it, i) => {
        const period = formatExperiencePeriod(it) || it.period;
        const typeLabel = it.employmentType
          ? EXPERIENCE_EMPLOYMENT_LABELS[it.employmentType as ExperienceEmploymentType]
          : null;
        const bullets = experienceBullets(it);
        return (
          <li
            key={`${it.title}-${i}`}
            className="grid grid-cols-[5.25rem_minmax(0,1fr)] gap-3 sm:grid-cols-[6.75rem_minmax(0,1fr)]"
          >
            <p className="pt-0.5 text-[11px] sm:text-xs leading-snug text-muted-foreground tabular-nums">
              {period || "—"}
            </p>
            <div className="min-w-0 border-l border-primary/35 pl-4">
              <h4 className="font-semibold text-foreground leading-snug">{it.title}</h4>
              {it.company ? (
                <p className="text-xs text-muted-foreground italic mt-0.5">{it.company}</p>
              ) : null}
              {typeLabel ? (
                <p className="text-[11px] text-muted-foreground mt-0.5">{typeLabel}</p>
              ) : null}
              {bullets.length ? (
                <ul className="mt-2 space-y-1">
                  {bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-sm text-foreground leading-relaxed">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default ExperienceTimeline;
