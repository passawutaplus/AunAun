import { Checkbox } from "@/components/ui/checkbox";
import type { CvProjectInput } from "@/lib/aboutCvModel";
import { CV_FEATURED_PROJECTS_MAX } from "@/lib/profileCv";
import { useAboutEditLocale } from "@/components/profile/AboutEditLocale";

type Props = {
  projects: CvProjectInput[];
  value: string[];
  onChange: (next: string[]) => void;
};

/** Pick up to three published projects for the CV's "Selected work" block. */
export default function CvFeaturedProjectsEditor({ projects, value, onChange }: Props) {
  const { t } = useAboutEditLocale();
  const full = value.length >= CV_FEATURED_PROJECTS_MAX;

  if (projects.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.noPublishedProjects}</p>;
  }

  const toggle = (id: string, on: boolean) =>
    onChange(on ? [...value, id].slice(0, CV_FEATURED_PROJECTS_MAX) : value.filter((x) => x !== id));

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t.projectsHint}</p>
      <ul className="divide-y divide-border/70 rounded-xl border border-border/70">
        {projects.map((p) => {
          const checked = value.includes(p.id);
          const order = value.indexOf(p.id) + 1;
          return (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm">
                <Checkbox
                  checked={checked}
                  disabled={!checked && full}
                  onCheckedChange={(v) => toggle(p.id, v === true)}
                />
                <span className="min-w-0 flex-1 truncate text-foreground">{p.title}</span>
                {checked ? (
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">#{order}</span>
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
