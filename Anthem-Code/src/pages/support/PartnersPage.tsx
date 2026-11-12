import type { ReactNode } from "react";
import { CalendarDays, Gift, LayoutGrid, MapPin, PenLine, Send, ShieldCheck, Sparkles } from "lucide-react";
import LineMarkIcon from "@/components/icons/LineMarkIcon";
import SponsorForm from "@/components/support/SponsorForm";
import { Eyebrow, Lede, SupportShell, Title } from "@/components/support/SupportShell";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { SUPPORT } from "@/lib/i18n/support";
import { SUPPORT_LINE_QR_URL, SUPPORT_LINE_URL } from "@/lib/support/flags";

const FORM_ID = "sponsor-form";

function Item({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[15px] thai-body">
      <span className="mt-0.5 shrink-0 text-background/70">{icon}</span>
      {children}
    </li>
  );
}

/** /support/partners: sponsor SAMECOR, or bring SAMECOR into your own project. Both directions are welcome. */
export default function PartnersPage() {
  const t = useT(SUPPORT);
  const icon = "h-[18px] w-[18px]";
  // A plain "#sponsor-form" link changes the URL but the router keeps the page at the top.
  const goToForm = () => {
    const form = document.getElementById(FORM_ID);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    form?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    form?.querySelector<HTMLElement>("input")?.focus({ preventScroll: true });
  };

  return (
    <SupportShell
      title="Sponsor & Collaborate"
      path="/support/partners"
      description={t("partnerLine")}
      back={{ to: "/support", label: t("backToSupport") }}
    >
      <header className="max-w-2xl">
        <Eyebrow>Sponsor &amp; Collaborate</Eyebrow>
        <Title className="mt-3">
          Sponsor us. <em className="block">Or let&apos;s work together.</em>
        </Title>
        <Lede>{t("partnerLine")}</Lede>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" onClick={goToForm}>
            <Send className="mr-2 h-4 w-4" strokeWidth={1.5} aria-hidden />
            {t("sendMessage")}
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={SUPPORT_LINE_URL} target="_blank" rel="noopener noreferrer">
              <LineMarkIcon className="mr-2 h-4 w-4" />
              {t("chatLine")}
            </a>
          </Button>
        </div>
      </header>

      <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_17rem]">
        <section className="rounded-3xl bg-foreground p-6 text-background sm:p-8">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <Title as="h2">
                Sponsor <em>SAMECOR</em>
              </Title>
              <ul className="mt-5 space-y-3">
                <Item icon={<LayoutGrid className={icon} strokeWidth={1.5} aria-hidden />}>{t("sLogo")}</Item>
                <Item icon={<CalendarDays className={icon} strokeWidth={1.5} aria-hidden />}>{t("sEvent")}</Item>
                <Item icon={<Gift className={icon} strokeWidth={1.5} aria-hidden />}>{t("sInKind")}</Item>
              </ul>
            </div>
            <div>
              <Title as="h2">
                Work <em>with us</em>
              </Title>
              <ul className="mt-5 space-y-3">
                <Item icon={<Sparkles className={icon} strokeWidth={1.5} aria-hidden />}>Workshop · Exhibition · Open Call</Item>
                <Item icon={<PenLine className={icon} strokeWidth={1.5} aria-hidden />}>{t("wContent")}</Item>
                <Item icon={<MapPin className={icon} strokeWidth={1.5} aria-hidden />}>{t("wInvite")}</Item>
              </ul>
            </div>
          </div>
          <p className="mt-8 flex items-start gap-2 border-t border-background/15 pt-5 text-[13px] text-background/75 thai-body">
            <ShieldCheck className="mt-px h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
            {t("promise")}
          </p>
        </section>

        <a
          href={SUPPORT_LINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-3xl bg-card p-6 transition-colors hover:bg-muted lg:flex-col lg:justify-center lg:text-center"
        >
          <img
            src={SUPPORT_LINE_QR_URL}
            alt="LINE Official Account QR"
            width={144}
            height={144}
            loading="lazy"
            decoding="async"
            className="h-28 w-28 shrink-0 rounded-xl bg-white p-1 lg:h-36 lg:w-36"
          />
          <span>
            <span className="block font-display font-semibold">LINE OA</span>
            <span className="mt-1 block text-[13px] text-muted-foreground thai-body">{t("scanLine")}</span>
          </span>
        </a>
      </div>

      <div id={FORM_ID} className="mt-10 scroll-mt-20">
        <SponsorForm />
      </div>
    </SupportShell>
  );
}
