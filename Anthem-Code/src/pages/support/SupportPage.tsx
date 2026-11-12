import { ArrowRight, Coffee, Handshake, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import LineMarkIcon from "@/components/icons/LineMarkIcon";
import ProductCard from "@/components/support/ProductCard";
import { Eyebrow, Lede, SupportShell, Title } from "@/components/support/SupportShell";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { SUPPORT } from "@/lib/i18n/support";
import { listProducts, sortForShelf } from "@/lib/support/catalog";
import { SUPPORT_LINE_URL, isSupportDemo } from "@/lib/support/flags";

/** /support: things to buy first, then Donate and Sponsor & Collaborate. No money goal here (owner, 2026-11-12). */
export default function SupportPage() {
  const t = useT(SUPPORT);
  const demo = isSupportDemo();
  const shelf = sortForShelf(listProducts(demo)).slice(0, 4);

  return (
    <SupportShell title="Support SAMECOR" path="/support" description={t("heroLine")}>
      <header className="max-w-2xl">
        <Eyebrow>Support SAMECOR</Eyebrow>
        <Title className="mt-3">
          Buy something good. <em className="block">Keep this space open.</em>
        </Title>
        <Lede>{t("heroLine")}</Lede>
      </header>

      <section aria-labelledby="support-shop" className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="support-shop" className="flex items-center gap-2 font-display text-xl font-semibold">
            <ShoppingBag className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            Shop
          </h2>
          <Link
            to="/shop"
            className="inline-flex min-h-10 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("seeAll")}
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-4">
          {shelf.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <section aria-labelledby="support-donate" className="flex flex-col rounded-3xl bg-card p-6 sm:p-8">
          <Coffee className="h-6 w-6" strokeWidth={1.5} aria-hidden />
          <h2 id="support-donate" className="mt-4 font-display text-2xl font-semibold">
            Donate
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground thai-body">{t("donateLine")}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-auto md:pt-6">
            <Button asChild variant="outline">
              <Link to="/support/donate">{t("donateCta")}</Link>
            </Button>
            {demo ? null : <span className="text-[13px] text-muted-foreground thai-body">{t("notOpenYet")}</span>}
          </div>
        </section>

        <section aria-labelledby="support-sponsor" className="flex flex-col rounded-3xl bg-foreground p-6 text-background sm:p-8">
          <Handshake className="h-6 w-6" strokeWidth={1.5} aria-hidden />
          <h2 id="support-sponsor" className="mt-4 font-display text-2xl font-semibold">
            Sponsor &amp; Collaborate
          </h2>
          <p className="mt-2 text-[15px] text-background/75 thai-body">{t("sponsorLine")}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-auto md:pt-6">
            <Button asChild className="bg-background text-foreground hover:bg-background/90">
              <Link to="/support/partners">{t("talk")}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-background/30 text-background hover:bg-background/10 hover:text-background"
            >
              <a href={SUPPORT_LINE_URL} target="_blank" rel="noopener noreferrer">
                <LineMarkIcon className="mr-2 h-4 w-4" />
                {t("chatLine")}
              </a>
            </Button>
          </div>
        </section>
      </div>
    </SupportShell>
  );
}
