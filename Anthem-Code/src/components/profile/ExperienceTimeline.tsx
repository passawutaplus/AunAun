import BriefcaseIcon from "../icons/BriefcaseIcon";
import type { ExperienceItem } from "@/lib/validators";

const ExperienceTimeline = ({ items }: { items: ExperienceItem[] }) => {
  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีประวัติการทำงาน</p>
    );
  }
  return (
    <ol className="relative border-l-2 border-primary/20 pl-6 space-y-6">
      {items.map((it, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-primary border-4 border-background shadow-sm" />
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground leading-snug">{it.title}</h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                {it.company && (
                  <span className="flex items-center gap-1"><BriefcaseIcon className="w-3 h-3" />{it.company}</span>
                )}
                {it.period && <span>· {it.period}</span>}
              </div>
              {it.description && (
                <p className="text-base text-foreground mt-2 leading-6 whitespace-pre-wrap">{it.description}</p>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
};

export default ExperienceTimeline;
