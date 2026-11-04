import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, Layers, Search, ShieldCheck, User } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { publicInviteApi, rememberSelfSignup, type PublicInvite } from "@/lib/creatorInvite";
import type { InviteCopy } from "@/lib/creatorInviteCopy";
import { cn } from "@/lib/utils";

/** Example profile in the preview: the founder's own published SAMECOR profile and works (used with permission). */
const MEDIA = "https://zkflkpbmbozrchqncpzi.supabase.co/storage/v1/object/public/project-media/anthem/82039b6d-cdf4-4c46-958a-d770d849382c";
const SAMPLE = {
  name: "Passawut Saelore",
  discipline: "Illustration / Art",
  avatar: `${MEDIA}/avatar/5c1c6002-4002-41f7-b0a7-2dacdd7dfe91.webp`,
  cover: `${MEDIA}/cover/db9ff535-5214-44a0-88c7-8cd0b521f0f4.webp`,
  works: [
    `${MEDIA}/b04d9734-3412-4d3c-a851-9164f5cb300f/0c699f0d-a0d4-469f-9578-ab5cb50ae154.webp`,
    `${MEDIA}/8fca0cac-ea67-4a47-aa04-742f4082b885/a9733fa1-5c3b-4f66-bdbd-463e79a75737.webp`,
    `${MEDIA}/3fcd9ef0-1bf8-427c-8e9c-7127081c8886/b1c76751-db6e-46a7-834e-05683a627b42.webp`,
  ],
};

/** Personal invitation landing: who it is for, who sends it, the two paths, what happens next, a preview. */
export default function InviteLanding({ token, t, invite }: { token: string; t: InviteCopy; invite: PublicInvite }) {
  const navigate = useNavigate();
  const [nextOpen, setNextOpen] = useState(false);
  const open = () => void publicInviteApi.open(token).catch(() => undefined);
  const steps: [string, string][] = [
    [t.next1, t.next1sub],
    [t.next2, t.next2sub],
    [t.next3, t.next3sub],
  ];

  return (
    <div className="relative overflow-hidden">
      {/* soft brand-red swoosh behind the name */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-40 left-[28%] h-[46rem] w-28 rotate-[28deg] rounded-full bg-gradient-to-b from-brand/0 via-brand/55 to-brand/0 blur-2xl sm:w-40" />
        <div className="absolute -top-24 left-[34%] h-[40rem] w-10 rotate-[28deg] rounded-full bg-gradient-to-b from-brand/0 via-brand/30 to-brand/0 blur-xl" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-start md:gap-10 lg:gap-16">
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{t.eyebrow}</p>
            <p className="mt-3 text-base text-foreground/80">{t.invFor}</p>
            <h1 className="mt-1 break-words font-display text-5xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              {invite.display_name}
            </h1>
            <p className="mt-6 text-xl font-semibold text-foreground sm:text-2xl">{t.headline}</p>
            <p className="mt-3 max-w-xl text-base text-foreground/75">{t.subline}</p>

            <div className="mt-8 flex items-center gap-4">
              <img src="/invite/aun.webp" alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-full object-cover" />
              <div className="border-l border-border pl-4 text-sm">
                <p className="font-medium text-foreground">{t.inviteFrom}</p>
                <p className="mt-0.5 text-muted-foreground">{t.founderRole}</p>
              </div>
            </div>
            <p className="mt-4 max-w-xl whitespace-pre-line text-sm italic text-foreground/80">“{invite.personal_note?.trim() || t.defaultNote}”</p>
          </section>

          <section className="flex flex-col gap-3" aria-label={t.cardA}>
            <div className="rounded-2xl border border-brand/80 bg-card/80 p-5 backdrop-blur sm:p-6">
              <div className="flex gap-4">
                <Layers className="mt-0.5 h-7 w-7 shrink-0 text-brand" aria-hidden />
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-foreground">{t.cardA}</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">{t.cardAsub}</p>
                </div>
              </div>
              <Button
                className="mt-5 h-12 w-full rounded-xl bg-brand text-base font-semibold text-white hover:bg-brand/90"
                onClick={() => {
                  open();
                  navigate(`/invite/creator/${token}/form`);
                }}
              >
                {t.ctaA} <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Button>
            </div>

            <button
              type="button"
              onClick={() => {
                open();
                rememberSelfSignup(token);
                navigate("/auth?tab=signup");
              }}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card/80 p-5 text-left backdrop-blur transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6"
            >
              <User className="h-7 w-7 shrink-0 text-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold text-foreground">{t.pathB}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{t.cardBsub}</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>

            <p className="mt-2 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground md:justify-end">
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden /> {t.trust}
            </p>
          </section>
        </div>

        {/* What happens next — inline on desktop, collapsible on phones */}
        <div className="mt-12 border-t border-border pt-6">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-2xl bg-card/80 px-5 py-4 text-left md:hidden"
            aria-expanded={nextOpen}
            onClick={() => setNextOpen((v) => !v)}
          >
            <span className="text-base font-semibold text-foreground">{t.nextTitle}</span>
            <ChevronDown className={cn("h-5 w-5 transition-transform", nextOpen && "rotate-180")} aria-hidden />
          </button>
          <div className={cn("mt-4 md:mt-0 md:flex md:items-center md:gap-6", nextOpen ? "block" : "hidden md:flex")}>
            <h2 className="hidden shrink-0 text-lg font-semibold text-foreground md:block md:border-r md:border-border md:pr-6">{t.nextTitle}</h2>
            <ol className="flex flex-col gap-4 md:flex-1 md:flex-row md:items-center md:gap-3">
              {steps.map(([title, sub], i) => (
                <li key={title} className="flex items-center gap-3 md:flex-1">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs font-semibold text-foreground">
                    0{i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{title}</span>
                    <span className="block text-xs text-muted-foreground">{sub}</span>
                  </span>
                  {i < steps.length - 1 ? <span aria-hidden className="ml-auto hidden h-px w-6 shrink-0 bg-border lg:block" /> : null}
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Live preview teaser */}
        <section className="mt-10 grid items-center gap-8 rounded-3xl border border-border bg-card/60 p-6 sm:p-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]" aria-label={t.livePreview}>
          <div>
            <span className="inline-flex rounded-full bg-brand/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand">{t.livePreview}</span>
            <h2 className="mt-4 font-display text-2xl font-semibold leading-tight text-foreground sm:text-3xl">{t.lpTitle}</h2>
            <p className="mt-3 text-sm text-muted-foreground">{t.lpSub}</p>
          </div>
          <div aria-hidden className="pointer-events-none select-none overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
            <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
              <BrandLogo tone="theme" size="sm" className="shrink-0" />
              <span className="ml-auto flex min-w-0 gap-1.5 overflow-hidden">
                {["Showcase", "Creators", "Exhibition"].map((label, i) => (
                  <span
                    key={label}
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium",
                      i === 1 ? "bg-foreground text-background" : "border border-border text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                ))}
              </span>
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </div>
            <img src={SAMPLE.cover} alt="" className="h-28 w-full object-cover sm:h-36" loading="lazy" />
            <div className="px-4 pb-4">
              <div className="relative flex items-end gap-3">
                <img src={SAMPLE.avatar} alt="" loading="lazy" className="-mt-8 h-16 w-16 shrink-0 rounded-full border-4 border-background object-cover" />
                <div className="min-w-0 flex-1 pt-2">
                  <p className="truncate text-base font-semibold text-foreground">{SAMPLE.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{SAMPLE.discipline}</p>
                </div>
                <span className="mb-1 rounded-md bg-brand px-3 py-1 text-[11px] font-semibold text-white">Follow</span>
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] text-foreground/75">{t.lpBio}</p>
              <div className="mt-3 flex gap-4 border-b border-border text-[11px]">
                <span className="border-b-2 border-brand pb-1.5 font-medium text-foreground">Works</span>
                <span className="pb-1.5 text-muted-foreground">About</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {SAMPLE.works.map((src) => (
                  <img key={src} src={src} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-md object-cover" />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
