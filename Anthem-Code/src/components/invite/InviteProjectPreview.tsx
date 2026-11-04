import { ExternalLink, ImageIcon, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InviteMedia, InviteProject } from "@/lib/creatorInvite";
import type { InviteCopy } from "@/lib/creatorInviteCopy";

/** What one project page will look like: title, credit, description, the images in order. */
export default function InviteProjectPreview({
  project,
  index,
  name,
  media,
  t,
  badge,
  className,
}: {
  project: InviteProject;
  index: number;
  name: string;
  media: Map<string, InviteMedia>;
  t: InviteCopy;
  badge: string;
  className?: string;
}) {
  const images = project.media.map((id) => media.get(id)?.url).filter(Boolean) as string[];
  const credit = [name.trim() ? `${t.by} ${name.trim()}` : "", project.role].filter(Boolean).join(" · ");
  return (
    <section aria-label={`${t.projectPv} ${index + 1}`} className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-foreground">
          {t.projectPv} · {t.project(index + 1)}
        </h2>
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Lock className="h-3 w-3" aria-hidden /> {badge}
        </span>
      </div>
      <div className="px-4 py-5 sm:px-6">
        <h3 className="font-display text-xl font-semibold text-foreground sm:text-2xl">{project.title || t.projectTitle}</h3>
        {credit ? <p className="mt-1 text-xs text-muted-foreground">{credit}</p> : null}
        {project.description ? <p className="mt-3 whitespace-pre-line text-sm text-foreground/85">{project.description}</p> : null}
        {project.url ? (
          <p className="mt-2 inline-flex items-center gap-1 break-all text-xs text-muted-foreground">
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden /> {project.url}
          </p>
        ) : null}
        <div className="mt-4 space-y-3">
          {images.length ? (
            images.map((src, i) => <img key={`${src}-${i}`} src={src} alt="" className="w-full rounded-lg object-cover" />)
          ) : (
            <div className="flex aspect-[16/9] items-center justify-center rounded-lg bg-muted">
              <ImageIcon className="h-8 w-8 text-muted-foreground/50" aria-hidden />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
