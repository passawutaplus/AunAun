import type { ReactNode } from "react";
import { CircleCheck, CircleDashed, CircleDot, CircleSlash, Clock, ExternalLink, TriangleAlert } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import WaitlistForm from "@/components/founding/WaitlistForm";
import ProductArt, { PRODUCT_TILE } from "@/components/support/ProductArt";
import { Eyebrow, Lede, SupportShell, Title } from "@/components/support/SupportShell";
import { Button } from "@/components/ui/button";
import { campaignCta, findCampaign, type MilestoneStatus } from "@/lib/founding/campaign";
import { useT } from "@/lib/i18n";
import { FOUNDING } from "@/lib/i18n/founding";
import { cn } from "@/lib/utils";

const WAITLIST_ID = "founding-waitlist";
const TABS = [
  { id: "story", label: "Story" },
  { id: "rewards", label: "Rewards" },
  { id: "timeline", label: "Timeline" },
  { id: "updates", label: "Updates" },
  { id: "faq", label: "FAQ" },
  { id: "risks", label: "Risks" },
] as const;

const MILESTONE_ICON: Record<MilestoneStatus, typeof CircleCheck> = {
  completed: CircleCheck,
  in_progress: CircleDot,
  planned: CircleDashed,
  delayed: Clock,
  cancelled: CircleSlash,
};
const MILESTONE_LABEL: Record<MilestoneStatus, keyof typeof FOUNDING> = {
  completed: "msCompleted",
  in_progress: "msInProgress",
  planned: "msPlanned",
  delayed: "msDelayed",
  cancelled: "msCancelled",
};

function goTo(id: string) {
  const el = document.getElementById(id);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

function Section({ id, title, children }: { id: string; title: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28 border-t border-border py-10 sm:py-14">
      <Title as="h2" className="mb-6">
        <span id={`${id}-title`}>{title}</span>
      </Title>
      {children}
    </section>
  );
}

/** Every drawing of the device says it is a mock-up (spec: "ภาพจำลองต้นแบบเท่านั้น"). */
function DeviceMock({ label, className }: { label: string; className?: string }) {
  return (
    <figure className={className}>
      <div className={cn("relative aspect-[4/3] overflow-hidden rounded-3xl", PRODUCT_TILE)}>
        <ProductArt art="picker" className="p-6" />
        <span className="absolute bottom-3 left-3 rounded-full bg-[#282929] px-3 py-1 text-[11px] font-medium text-white">
          {label}
        </span>
      </div>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

/** /founding/:slug: one Founding Project. Waitlist stage: story, facts and risks, no payment. */
export default function FoundingPickerPage() {
  const { slug } = useParams();
  const t = useT(FOUNDING);
  const campaign = findCampaign(slug);

  if (!campaign) {
    return (
      <SupportShell title="Founding Projects" path="/founding" back={{ to: "/shop", label: t("backToShop") }} hideDemoStrip noindex>
        <p className="py-16 text-center text-muted-foreground thai-body">{t("notFound")}</p>
      </SupportShell>
    );
  }

  const cta = campaignCta(campaign.status);
  const joinButton =
    cta === "waitlist" ? (
      <Button size="lg" onClick={() => goTo(WAITLIST_ID)}>
        Join the Founding 30 Waitlist
      </Button>
    ) : null;

  return (
    <SupportShell
      title={`${campaign.product}: ${campaign.title.replace(/\.$/, "")}`}
      path={`/founding/${campaign.slug}`}
      description={t("heroLine")}
      hideDemoStrip
    >
      <header className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
        <div>
          <Eyebrow>
            Founding Projects · {campaign.code} · {campaign.product}
          </Eyebrow>
          <Title className="mt-3">
            {campaign.title} <em className="block">A small beginning for bigger ideas.</em>
          </Title>
          <Lede>{t("heroLine")}</Lede>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-[13px] thai-body">
            <span aria-hidden className="h-2 w-2 rounded-full bg-brand" />
            <span className="font-medium">Waitlist</span>
            <span className="text-muted-foreground">{t("statusWaitlist")}</span>
          </p>
          <div className="mt-6">{joinButton}</div>
        </div>
        <DeviceMock label={t("mockLabel")} />
      </header>

      <ul className="mt-10 grid gap-3 text-[15px] thai-body sm:grid-cols-3">
        {[t("factUnits", { n: campaign.deviceCap }), t("factPrice"), t("factMade")].map((fact) => (
          <li key={fact} className="rounded-2xl bg-card px-5 py-4">
            {fact}
          </li>
        ))}
      </ul>

      <nav
        aria-label="Sections"
        className="sticky top-0 z-10 -mx-4 mt-10 overflow-x-auto bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:top-14"
      >
        <ul className="flex gap-1">
          {TABS.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => goTo(tab.id)}
                className="min-h-10 whitespace-nowrap rounded-full px-4 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="how" title={<>How it <em>works</em></>}>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(["Back", "Reach", "Make", "Deliver"] as const).map((step, i) => (
            <li key={step} className="rounded-2xl bg-card p-5">
              <p className="text-xs font-semibold tabular-nums text-muted-foreground">0{i + 1}</p>
              <p className="mt-2 font-display text-lg font-semibold">{step}</p>
              <p className="mt-1 text-[15px] text-muted-foreground thai-body">{t(`s${i + 1}` as "s1")}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="story" title={<>The story <em>behind Picker</em></>}>
        <p className="max-w-2xl text-[15px] text-muted-foreground thai-body sm:text-base">{t("storyLine")}</p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {(
            [
              ["The problem", "problem"],
              ["Why Picker", "whyPicker"],
              ["Why Founding 30", "whyThirty"],
            ] as const
          ).map(([heading, key]) => (
            <div key={key} className="rounded-2xl bg-card p-5">
              <h3 className="font-display text-lg font-semibold">{heading}</h3>
              <p className="mt-2 text-[15px] text-muted-foreground thai-body">{t(key)}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-card p-5">
            <h3 className="font-display text-lg font-semibold">App</h3>
            <p className="mt-2 text-[15px] thai-body">{t("appLive", { v: campaign.appVersion })}</p>
            <p className="mt-1 text-[15px] text-muted-foreground thai-body">{t("appBrowsers")}</p>
            <Button asChild variant="outline" className="mt-4">
              <a href={campaign.appUrl} target="_blank" rel="noopener noreferrer">
                {t("openApp")}
                <ExternalLink className="ml-2 h-4 w-4" strokeWidth={1.5} aria-hidden />
              </a>
            </Button>
          </div>
          <div className="rounded-2xl bg-card p-5">
            <h3 className="font-display text-lg font-semibold">Hardware</h3>
            <p className="mt-2 text-[15px] thai-body">{t("hwProto")}</p>
            <p className="mt-1 text-[15px] text-muted-foreground thai-body">{t("hwSize")}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to={campaign.productPath}>{t("seeProduct")}</Link>
            </Button>
          </div>
        </div>
      </Section>

      <Section id="rewards" title={<>Founding <em>30</em></>}>
        <div className="grid gap-6 rounded-3xl bg-foreground p-6 text-background sm:p-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-[15px] thai-body">{t("rewardLine", { n: campaign.deviceCap })}</p>
            <p className="mt-3 font-display text-3xl font-semibold">
              {campaign.priceThb === null ? "Founding Price" : `฿${campaign.priceThb.toLocaleString("en-US")}`}
            </p>
            {campaign.priceThb === null ? <p className="mt-1 text-[15px] text-background/75 thai-body">{t("rewardPrice")}</p> : null}
            <ul className="mt-5 space-y-2 text-[15px] text-background/85 thai-body">
              <li>{t("rewardUpdates")}</li>
              <li>{t("rewardTester")}</li>
            </ul>
            <p className="mt-5 border-t border-background/15 pt-4 text-[13px] text-background/70 thai-body">{t("rewardNotShares")}</p>
          </div>
          {cta === "waitlist" ? (
            <Button size="lg" className="bg-background text-foreground hover:bg-background/90" onClick={() => goTo(WAITLIST_ID)}>
              Join the Waitlist
            </Button>
          ) : null}
        </div>
      </Section>

      <Section id="timeline" title={<>From idea <em>to delivery</em></>}>
        <ol className="space-y-3">
          {campaign.milestones.map((m) => {
            const Icon = MILESTONE_ICON[m.status];
            return (
              <li key={m.no} className="flex gap-4 rounded-2xl bg-card p-5">
                <p className="w-7 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{m.no}</p>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <h3 className="font-display text-lg font-semibold leading-tight">{m.title}</h3>
                    <p
                      className={cn(
                        "inline-flex items-center gap-1.5 text-[13px] thai-body",
                        m.status === "completed" ? "text-success" : m.status === "in_progress" ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                      {t(MILESTONE_LABEL[m.status])}
                    </p>
                  </div>
                  <p className="mt-1 text-[15px] text-muted-foreground thai-body">{t(m.noteKey as "m1")}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section id="updates" title={<>Project <em>updates</em></>}>
        <p className="rounded-2xl bg-card p-6 text-[15px] text-muted-foreground thai-body">{t("noUpdates")}</p>
      </Section>

      <Section id="faq" title="FAQ">
        <dl className="divide-y divide-border border-y border-border">
          {campaign.faq.map((f) => (
            <div key={f.qKey} className="py-4">
              <dt className="font-medium thai-body">{t(f.qKey as "q1")}</dt>
              <dd className="mt-1 text-[15px] text-muted-foreground thai-body">{t(f.aKey as "a1")}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="risks" title={<>Risks, <em>said plainly</em></>}>
        <ul className="space-y-3">
          {campaign.riskKeys.map((key) => (
            <li key={key} className="flex items-start gap-3 text-[15px] thai-body">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
              {t(key as "r1")}
            </li>
          ))}
        </ul>
      </Section>

      {cta === "waitlist" ? (
        <div id={WAITLIST_ID} className="scroll-mt-28 pt-4">
          <WaitlistForm campaign={campaign.slug} />
        </div>
      ) : null}
    </SupportShell>
  );
}
