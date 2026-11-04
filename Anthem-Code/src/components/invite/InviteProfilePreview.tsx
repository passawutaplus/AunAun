import { forwardRef, useState } from "react";
import { ChevronDown, ImageIcon, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InviteMedia, InviteSubmission } from "@/lib/creatorInvite";
import type { InviteCopy } from "@/lib/creatorInviteCopy";

interface Props {
  data: InviteSubmission;
  media: Map<string, InviteMedia>;
  t: InviteCopy;
  badge: string;
  /** Collapsible section with a header (form); the review page shows it open without the toggle. */
  collapsible?: boolean;
  className?: string;
}

/** What visitors will see — identity + project cards — rendered from the form data. Never indexed. */
const InviteProfilePreview = forwardRef<HTMLElement, Props>(function InviteProfilePreview(
  { data, media, t, badge, collapsible = true, className },
  ref,
) {
  const [open, setOpen] = useState(true);
  const urlOf = (id: string | null | undefined) => (id ? media.get(id)?.url ?? null : null);
  const cover = urlOf(data.about.cover) ?? data.projects.flatMap((p) => p.media).map(urlOf).find(Boolean) ?? null;
  const avatar = urlOf(data.about.avatar);
  const name = data.about.name.trim() || t.yourName;
  const meta = [data.about.discipline, data.about.city].filter(Boolean).join(" · ");

  return (
    <section
      ref={ref}
      aria-label={t.pv}
      className={cn("scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-card", className)}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-foreground">{t.pv}</h2>
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Lock className="h-3 w-3" aria-hidden /> {badge}
        </span>
        {collapsible ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-8 gap-1 text-xs"
            aria-expanded={open}
            aria-controls="invite-preview-body"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? t.collapse : t.expand}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden />
          </Button>
        ) : null}
      </div>

      <div id="invite-preview-body" hidden={!open}>
        <div className="relative aspect-[16/6] w-full bg-muted">
          {cover ? (
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-secondary">
              <ImageIcon className="h-8 w-8 text-muted-foreground/50" aria-hidden />
            </div>
          )}
        </div>
        <div className="px-4 pb-5 sm:px-6">
          <div className="relative flex items-end gap-3">
            <span className="-mt-8 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-secondary text-xl font-semibold text-foreground sm:-mt-10 sm:h-20 sm:w-20">
              {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <h3 className="truncate font-display text-xl font-semibold text-foreground sm:text-2xl">{name}</h3>
              {meta ? <p className="truncate text-xs text-muted-foreground">{meta}</p> : null}
            </div>
            <span aria-disabled="true" className="mb-1 hidden rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground sm:inline-flex">
              {t.follow}
            </span>
          </div>
          {data.about.bio ? <p className="mt-3 max-w-prose whitespace-pre-line text-sm text-foreground/85">{data.about.bio}</p> : null}

          <div className="mt-4 flex gap-4 border-b border-border text-sm" role="presentation">
            <span className="border-b-2 border-foreground pb-2 font-medium text-foreground">{t.worksTab}</span>
            <span className="pb-2 text-muted-foreground">{t.aboutTab}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.projects.map((p) => {
              const img = p.media.map(urlOf).find(Boolean);
              return (
                <div key={p.slot} className="min-w-0">
                  <div className="aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                    {img ? (
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/50" aria-hidden />
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-sm font-medium text-foreground">{p.title || t.projectTitle}</p>
                  {p.role ? <p className="truncate text-xs text-muted-foreground">{p.role}</p> : null}
                </div>
              );
            })}
          </div>
          {collapsible ? <p className="mt-4 text-[11px] text-muted-foreground">{t.pvNote}</p> : null}
        </div>
      </div>
    </section>
  );
});

export default InviteProfilePreview;
