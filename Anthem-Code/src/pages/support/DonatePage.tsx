import { useEffect, useId, useState } from "react";
import { Coffee, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import LineMarkIcon from "@/components/icons/LineMarkIcon";
import { Eyebrow, Lede, SupportShell, Title } from "@/components/support/SupportShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useT } from "@/lib/i18n";
import { SUPPORT } from "@/lib/i18n/support";
import { formatThb } from "@/lib/support/catalog";
import { BRAND_LINE_CONTACT_URL } from "@/lib/brandConfig";
import { resolveDonation } from "@/lib/support/donate";
import { DONATE_AMOUNTS_THB, DONATE_GOAL_THB, DONATE_MIN_THB, isSupportDemo } from "@/lib/support/flags";
import { pledgeDonation } from "@/server/mutations/supportOrders";
import { cn } from "@/lib/utils";

/** Net amount received this month. Stays 0 until a real, lawful way to take donations is connected. */
const RAISED_THB = 0;

/** /support/donate: the only page that shows the monthly goal (owner, 2026-11-12). */
export default function DonatePage() {
  const t = useT(SUPPORT);
  const demo = isSupportDemo();
  const customId = useId();
  const showNameId = useId();
  const nameId = useId();
  const [choice, setChoice] = useState<number | "other">(DONATE_AMOUNTS_THB[1]);
  const [custom, setCustom] = useState("");
  const [showName, setShowName] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [thanked, setThanked] = useState<{ amount: number; ref: string } | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "failed">("idle");

  // The thank-you screen is much shorter than the form: bring it into view.
  useEffect(() => {
    if (thanked) window.scrollTo({ top: 0 });
  }, [thanked]);

  const donation = resolveDonation(choice, custom);
  const amountText = donation.amount === null ? null : formatThb(donation.amount);
  const customError = choice === "other" && custom !== "" && donation.amount === null ? t("minAmount", { n: DONATE_MIN_THB }) : null;

  // A pledge is a record for the team (pay by transfer comes next); no money moves on this page.
  const donate = async () => {
    if (donation.amount === null || state === "sending") return;
    const amount = donation.amount;
    setState("sending");
    try {
      const ref = await pledgeDonation(amount, showName, displayName, demo);
      setState("idle");
      setThanked({ amount, ref });
    } catch {
      setState("failed");
    }
  };

  const chip = (value: number | "other", label: string) => (
    <button
      key={value}
      type="button"
      aria-pressed={choice === value}
      onClick={() => setChoice(value)}
      className={cn(
        "min-h-12 rounded-full border px-5 text-[15px] transition-colors",
        choice === value ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );

  return (
    <SupportShell
      title="Donate"
      path="/support/donate"
      description={t("donateHeroLine")}
      back={{ to: "/support", label: t("backToSupport") }}
    >
      <div className="mx-auto max-w-xl">
        {thanked ? (
          <section aria-live="polite" className="py-10 text-center">
            <Heart className="mx-auto h-8 w-8 text-brand" strokeWidth={1.5} aria-hidden />
            <Title className="mt-4">
              Thank you. <em>{formatThb(thanked.amount)}</em>
            </Title>
            <p className="mt-3 text-[15px] text-muted-foreground thai-body">{t("thanks")}</p>
            <p className="mt-1 text-[13px] tabular-nums text-muted-foreground thai-body">{t("refNo", { ref: thanked.ref })}</p>
            <p className="mx-auto mt-6 max-w-sm rounded-2xl bg-muted px-4 py-3 text-[13px] text-muted-foreground thai-body">
              {t("donateDemo")}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/support">{t("backToSupport")}</Link>
              </Button>
              <Button variant="outline" onClick={() => setThanked(null)}>
                {t("donateCta")}
              </Button>
            </div>
          </section>
        ) : (
          <>
            <header>
              <Eyebrow>Donate</Eyebrow>
              <Title className="mt-3">
                Little things that keep <em className="block">big ideas moving.</em>
              </Title>
              <Lede>{t("donateHeroLine")}</Lede>
            </header>

            <section aria-labelledby="donate-goal" className="mt-8 rounded-3xl bg-card p-6">
              <h2 id="donate-goal" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Monthly goal
              </h2>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-3xl font-semibold tabular-nums">{formatThb(RAISED_THB)}</span>
                <span className="text-sm text-muted-foreground thai-body">{t("ofGoal", { goal: formatThb(DONATE_GOAL_THB) })}</span>
              </p>
              <Progress
                value={Math.min(100, Math.round((RAISED_THB / DONATE_GOAL_THB) * 100))}
                aria-labelledby="donate-goal"
                className="mt-4 h-2"
              />
            </section>

            <section aria-labelledby="donate-amount" className="mt-8">
              <h2 id="donate-amount" className="flex items-center gap-2 text-sm font-medium thai-body">
                <Coffee className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                {t("pickAmount")}
              </h2>
              <div role="group" aria-labelledby="donate-amount" className="mt-3 flex flex-wrap gap-2">
                {DONATE_AMOUNTS_THB.map((a) => chip(a, formatThb(a)))}
                {chip("other", t("other"))}
              </div>

              {choice === "other" ? (
                <div className="mt-4">
                  <label htmlFor={customId} className="text-sm text-muted-foreground thai-body">
                    {t("amountLabel")}
                  </label>
                  <Input
                    id={customId}
                    inputMode="numeric"
                    autoComplete="off"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                    aria-invalid={customError ? true : undefined}
                    aria-describedby={customError ? `${customId}-error` : undefined}
                    className="mt-1.5 h-12 max-w-[12rem] text-base"
                  />
                  <FieldError id={`${customId}-error`} message={customError} className="mt-1.5" />
                </div>
              ) : null}

              <p className="mt-4 text-[13px] text-muted-foreground thai-body">{t("oneTime")}</p>

              <div className="mt-4 flex items-center gap-2.5">
                <Checkbox id={showNameId} checked={showName} onCheckedChange={(v) => setShowName(v === true)} />
                <label htmlFor={showNameId} className="text-sm thai-body">
                  {t("showName")}
                </label>
              </div>
              {showName ? (
                <div className="mt-3">
                  <label htmlFor={nameId} className="text-sm text-muted-foreground thai-body">
                    {t("nameLabel")}
                  </label>
                  <Input
                    id={nameId}
                    autoComplete="nickname"
                    maxLength={60}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1.5 h-12 max-w-xs text-base"
                  />
                </div>
              ) : null}

              {state === "failed" ? (
                <div role="alert" className="mt-5 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive thai-body">
                  <span>{t("donateFailed")}</span>{" "}
                  <a
                    href={BRAND_LINE_CONTACT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium underline underline-offset-4"
                  >
                    <LineMarkIcon className="h-4 w-4" />
                    {t("chatLine")}
                  </a>
                </div>
              ) : null}

              {demo ? (
                <Button
                  size="lg"
                  className="mt-6 w-full sm:w-auto"
                  disabled={donation.amount === null || state === "sending"}
                  onClick={donate}
                >
                  {state === "sending"
                    ? t("donating")
                    : amountText
                      ? t("donateBtnDemo", { amount: amountText })
                      : t("donateCta")}
                </Button>
              ) : (
                <>
                  <Button size="lg" className="mt-6 w-full sm:w-auto" disabled>
                    {amountText ? t("donateBtn", { amount: amountText }) : t("donateCta")}
                  </Button>
                  <p className="mt-3 text-sm text-muted-foreground thai-body">
                    {t("donateClosedNote")}{" "}
                    <Link to="/shop" className="text-foreground underline underline-offset-4">
                      Shop
                    </Link>
                  </p>
                </>
              )}
            </section>

            <p className="mt-10 border-t border-border pt-4 text-xs text-muted-foreground thai-body">{t("taxNote")}</p>
          </>
        )}
      </div>
    </SupportShell>
  );
}
