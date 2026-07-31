import BriefcaseIcon from "../icons/BriefcaseIcon";
import {
  EXPERIENCE_EMPLOYMENT_LABELS,
  formatExperiencePeriod,
  type ExperienceEmploymentType,
  type ExperienceItem,
} from "@/lib/validators";

const ExperienceTimeline = ({ items }: { items: ExperienceItem[] }) => {
  if (!items.length) {
    return <p className="text-xs font-light text-muted-foreground/70">ยังไม่มีประวัติการทำงาน</p>;
  }
  return (
    <ol className="relative border-l-2 border-primary/20 pl-6 space-y-6">
      {items.map((it, i) => {
        const period = formatExperiencePeriod(it) || it.period;
        const typeLabel = it.employmentType
          ? EXPERIENCE_EMPLOYMENT_LABELS[it.employmentType as ExperienceEmploymentType]
          : null;
        return (
          <li key={`${it.title}-${i}`} className="relative">
            <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-primary border-4 border-background shadow-sm" />
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-foreground leading-snug">{it.title}</h4>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                  {it.company ? (
                    <span className="flex items-center gap-1">
                      <BriefcaseIcon className="w-3 h-3" />
                      {it.company}
                    </span>
                  ) : null}
                  {period ? <span>· {period}</span> : null}
                  {typeLabel ? <span>· {typeLabel}</span> : null}
                </div>
                {it.description ? (
                  <p className="text-sm text-foreground mt-2 leading-6 whitespace-pre-wrap">
                    {it.description}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default ExperienceTimeline;
