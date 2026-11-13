import type { ReactNode } from "react";
import { ArrowLeft, FlaskConical, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import SeoHead from "@/components/SeoHead";
import { useT } from "@/lib/i18n";
import { SUPPORT } from "@/lib/i18n/support";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { isSupportDemo } from "@/lib/support/flags";
import { selectBagCount, useBag } from "@/stores/bagStore";
import { cn } from "@/lib/utils";

type ShellProps = {
  title: string;
  path: string;
  description?: string;
  /** Link shown above the page label. */
  back?: { to: string; label: string };
  /** Shows the bag button (shop pages). */
  bag?: boolean;
  noindex?: boolean;
  /** Pages outside the shop (Founding) hide the shop's test-mode strip. */
  hideDemoStrip?: boolean;
  children: ReactNode;
};

/** Shared frame for Support / Shop pages: test-mode strip, back link, bag button, footer. */
export function SupportShell({ title, path, description, back, bag, noindex, hideDemoStrip, children }: ShellProps) {
  const t = useT(SUPPORT);
  const demo = isSupportDemo() && !hideDemoStrip;
  return (
    <main id="main-content" className={cn("min-h-screen bg-background text-foreground", MOBILE_PAGE_BOTTOM_CLASS)}>
      <SeoHead title={title} description={description} path={path} noindex={noindex || demo} />
      {demo ? (
        <p className="flex items-center justify-center gap-2 bg-foreground px-4 py-2 text-center text-xs text-background">
          <FlaskConical className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
          {t("demoNote")}
        </p>
      ) : null}
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-5 sm:px-6 lg:pt-10">
        {back || bag ? (
          <div className="mb-6 flex min-h-10 items-center justify-between gap-3">
            {back ? (
              <Link
                to={back.to}
                className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                {back.label}
              </Link>
            ) : (
              <span />
            )}
            {bag ? <BagButton /> : null}
          </div>
        ) : null}
        {children}
      </div>
      <Footer />
    </main>
  );
}

export function BagButton() {
  const t = useT(SUPPORT);
  const count = useBag(selectBagCount);
  return (
    <Link
      to="/shop/bag"
      aria-label={t("bagAria", { n: count })}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted"
    >
      <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
      {count > 0 ? (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-semibold text-white"
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}

/** Small English label above a page title. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground", className)}>{children}</p>
  );
}

/** Page title: light weight, with the second half in bold italic (pass it as <em>). */
export function Title({ children, as: Tag = "h1", className }: { children: ReactNode; as?: "h1" | "h2"; className?: string }) {
  return (
    <Tag
      className={cn(
        "font-display font-light leading-[1.08] tracking-tight [&_em]:font-bold [&_em]:italic",
        Tag === "h1" ? "text-[2rem] sm:text-5xl" : "text-2xl sm:text-3xl",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** One short friendly line under a title. */
export function Lede({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-3 text-[15px] text-muted-foreground thai-body sm:text-base", className)}>{children}</p>;
}
