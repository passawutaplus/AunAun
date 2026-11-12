import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CircleCheck, Send } from "lucide-react";
import { Link } from "react-router-dom";
import LineMarkIcon from "@/components/icons/LineMarkIcon";
import { Title } from "@/components/support/SupportShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n";
import { SUPPORT } from "@/lib/i18n/support";
import { SUPPORT_LINE_URL, isSupportDemo } from "@/lib/support/flags";
import { submitSponsorInquiry, type SponsorReceipt } from "@/server/mutations/sponsorInquiry";
import {
  EMPTY_SPONSOR_INQUIRY,
  SPONSOR_BUDGETS,
  SPONSOR_INTERESTS,
  SPONSOR_LIMITS,
  validateSponsorInquiry,
  type SponsorBudget,
  type SponsorErrors,
  type SponsorField,
  type SponsorInquiry,
  type SponsorInterest,
} from "@/lib/support/sponsorForm";
import { cn } from "@/lib/utils";

const FIELD_ORDER: SponsorField[] = ["company", "contact", "email", "consent"];
const selectClass =
  "h-12 w-full appearance-none rounded-full border border-input bg-card px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm";

/** "Tell us your idea": the sponsor / collaborate form, with its sent and could-not-send states. */
export function SponsorForm() {
  const t = useT(SUPPORT);
  const demo = isSupportDemo();
  const uid = useId();
  const [value, setValue] = useState<SponsorInquiry>(EMPTY_SPONSOR_INQUIRY);
  const [tried, setTried] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "failed">("idle");
  const [receipt, setReceipt] = useState<SponsorReceipt | null>(null);

  const doneRef = useRef<HTMLElement>(null);

  // The "sent" card replaces a much taller form: keep it on screen.
  useEffect(() => {
    if (receipt) doneRef.current?.scrollIntoView({ block: "center" });
  }, [receipt]);

  const errors: SponsorErrors = tried ? validateSponsorInquiry(value) : {};
  const errorCount = Object.keys(errors).length;
  const set = <K extends keyof SponsorInquiry>(key: K, v: SponsorInquiry[K]) => setValue((prev) => ({ ...prev, [key]: v }));
  const id = (name: string) => `${uid}-${name}`;

  const interestLabel: Record<SponsorInterest, string> = {
    platform: "Sponsor SAMECOR",
    first_connect: "FIRST CONNECT",
    in_kind: t("iInKind"),
    invite_us: t("iInvite"),
    event: "Workshop · Exhibition · Open Call",
    unsure: t("iUnsure"),
  };
  const budgetLabel: Record<SponsorBudget, string> = {
    undecided: t("bUndecided"),
    under_5k: t("bUnder5"),
    "5k_10k": "฿5,000 – ฿10,000",
    "10k_30k": "฿10,000 – ฿30,000",
    over_30k: t("bOver30"),
    in_kind: t("bInKind"),
  };
  const errorText: Record<SponsorField, string> = {
    company: t("eCompany"),
    contact: t("eContact"),
    email: t("eEmail"),
    consent: t("eConsent"),
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    setTried(true);
    const found = validateSponsorInquiry(value);
    const first = FIELD_ORDER.find((f) => found[f]);
    if (first) {
      document.getElementById(id(first))?.focus();
      return;
    }
    setState("sending");
    try {
      setReceipt(await submitSponsorInquiry(value, demo));
      setState("idle");
    } catch {
      setState("failed");
    }
  };

  if (receipt) {
    return (
      <section ref={doneRef} aria-live="polite" className="rounded-3xl bg-card p-6 text-center sm:p-10">
        <CircleCheck className="mx-auto h-8 w-8 text-success" strokeWidth={1.5} aria-hidden />
        <Title as="h2" className="mt-4">
          Got it. <em>Thank you.</em>
        </Title>
        <p className="mt-3 text-[15px] text-muted-foreground thai-body">{t("sentLine")}</p>
        <p className="mt-1 text-[13px] tabular-nums text-muted-foreground thai-body">{t("refNo", { ref: receipt.ref })}</p>
        {receipt.demo ? (
          <p className="mx-auto mt-5 max-w-sm rounded-2xl bg-muted px-4 py-3 text-[13px] text-muted-foreground thai-body">
            {t("formDemo")}
          </p>
        ) : null}
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setReceipt(null);
            setValue(EMPTY_SPONSOR_INQUIRY);
            setTried(false);
          }}
        >
          {t("sendAnother")}
        </Button>
      </section>
    );
  }

  const field = (name: SponsorField | "lineId" | "interest" | "budget" | "message", label: string, required: boolean, control: ReactNode) => (
    <div>
      <label htmlFor={id(name)} className="mb-1.5 block text-sm thai-body">
        {label}
        {required ? <span aria-hidden className="ml-0.5 text-brand">*</span> : null}
      </label>
      {control}
      {name in errors ? <FieldError id={`${id(name)}-error`} message={errorText[name as SponsorField]} className="mt-1.5" /> : null}
    </div>
  );
  const invalid = (name: SponsorField) =>
    errors[name] ? { "aria-invalid": true as const, "aria-describedby": `${id(name)}-error` } : {};

  return (
    <form noValidate onSubmit={onSubmit} className="rounded-3xl bg-card p-6 sm:p-8">
      <Title as="h2">
        Tell us <em>your idea</em>
      </Title>
      {demo ? <p className="mt-2 text-[13px] text-muted-foreground thai-body">{t("formDemo")}</p> : null}

      {errorCount > 0 ? (
        <p role="alert" className="mt-5 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive thai-body">
          {t("missing", { n: errorCount })}
        </p>
      ) : null}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {field(
          "company",
          t("fCompany"),
          true,
          <Input
            id={id("company")}
            className="h-12 bg-background"
            autoComplete="organization"
            maxLength={SPONSOR_LIMITS.company}
            value={value.company}
            onChange={(e) => set("company", e.target.value)}
            {...invalid("company")}
          />,
        )}
        {field(
          "contact",
          t("fContact"),
          true,
          <Input
            id={id("contact")}
            className="h-12 bg-background"
            autoComplete="name"
            maxLength={SPONSOR_LIMITS.contact}
            value={value.contact}
            onChange={(e) => set("contact", e.target.value)}
            {...invalid("contact")}
          />,
        )}
        {field(
          "email",
          t("fEmail"),
          true,
          <Input
            id={id("email")}
            type="email"
            inputMode="email"
            className="h-12 bg-background"
            autoComplete="email"
            maxLength={254}
            value={value.email}
            onChange={(e) => set("email", e.target.value)}
            {...invalid("email")}
          />,
        )}
        {field(
          "lineId",
          "LINE ID",
          false,
          <Input
            id={id("lineId")}
            className="h-12 bg-background"
            autoComplete="off"
            maxLength={SPONSOR_LIMITS.lineId}
            value={value.lineId}
            onChange={(e) => set("lineId", e.target.value)}
          />,
        )}
        {field(
          "interest",
          t("fInterest"),
          true,
          <select
            id={id("interest")}
            className={cn(selectClass, "bg-background")}
            value={value.interest}
            onChange={(e) => set("interest", e.target.value as SponsorInterest)}
          >
            {SPONSOR_INTERESTS.map((k) => (
              <option key={k} value={k}>
                {interestLabel[k]}
              </option>
            ))}
          </select>,
        )}
        {field(
          "budget",
          t("fBudget"),
          false,
          <select
            id={id("budget")}
            className={cn(selectClass, "bg-background")}
            value={value.budget}
            onChange={(e) => set("budget", e.target.value as SponsorBudget)}
          >
            {SPONSOR_BUDGETS.map((k) => (
              <option key={k} value={k}>
                {budgetLabel[k]}
              </option>
            ))}
          </select>,
        )}
        <div className="sm:col-span-2">
          {field(
            "message",
            t("fMessage"),
            false,
            <Textarea
              id={id("message")}
              rows={4}
              className="bg-background"
              maxLength={SPONSOR_LIMITS.message}
              value={value.message}
              onChange={(e) => set("message", e.target.value)}
            />,
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-start gap-2.5">
          <Checkbox
            id={id("consent")}
            className="mt-0.5"
            checked={value.consent}
            onCheckedChange={(v) => set("consent", v === true)}
            {...invalid("consent")}
          />
          <label htmlFor={id("consent")} className="text-sm thai-body">
            {t("consent")}
            <span aria-hidden className="ml-0.5 text-brand">*</span>
            <span className="text-muted-foreground"> · </span>
            <Link to="/legal/privacy" className="text-muted-foreground underline underline-offset-4">
              {t("privacy")}
            </Link>
          </label>
        </div>
        {errors.consent ? <FieldError id={`${id("consent")}-error`} message={errorText.consent} className="mt-1.5" /> : null}
      </div>

      {state === "failed" ? (
        <div role="alert" className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive thai-body">
          <span>{t("sendFailed")}</span>
          <a
            href={SUPPORT_LINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium underline underline-offset-4"
          >
            <LineMarkIcon className="h-4 w-4" />
            {t("chatLine")}
          </a>
        </div>
      ) : null}

      <Button type="submit" size="lg" className="mt-6 w-full sm:w-auto" disabled={state === "sending"}>
        <Send className="mr-2 h-4 w-4" strokeWidth={1.5} aria-hidden />
        {state === "sending" ? t("sending") : t("sendMessage")}
      </Button>
    </form>
  );
}

export default SponsorForm;
