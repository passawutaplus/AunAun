import { useId, useState, type FormEvent } from "react";
import { CircleCheck } from "lucide-react";
import { Link } from "react-router-dom";
import LineMarkIcon from "@/components/icons/LineMarkIcon";
import { Title } from "@/components/support/SupportShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/input";
import { BRAND_LINE_CONTACT_URL } from "@/lib/brandConfig";
import { cleanWaitlistEmail } from "@/lib/founding/campaign";
import { isFoundingTest } from "@/lib/founding/flags";
import { useT } from "@/lib/i18n";
import { FOUNDING } from "@/lib/i18n/founding";
import { joinFoundingWaitlist } from "@/server/mutations/foundingWaitlist";

/** "Join the Founding 30 waitlist": one email, one consent tick. Nothing is paid here. */
export function WaitlistForm({ campaign }: { campaign: string }) {
  const t = useT(FOUNDING);
  const test = isFoundingTest();
  const emailId = useId();
  const consentId = useId();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [tried, setTried] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "failed" | "done">("idle");

  const clean = cleanWaitlistEmail(email);
  const emailError = tried && !clean;
  const consentError = tried && !consent;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    setTried(true);
    if (!clean) {
      document.getElementById(emailId)?.focus();
      return;
    }
    if (!consent) {
      document.getElementById(consentId)?.focus();
      return;
    }
    setState("sending");
    try {
      await joinFoundingWaitlist(campaign, clean, test);
      setState("done");
    } catch {
      setState("failed");
    }
  };

  if (state === "done") {
    return (
      <section aria-live="polite" className="rounded-3xl bg-card p-6 text-center sm:p-10">
        <CircleCheck className="mx-auto h-8 w-8 text-success" strokeWidth={1.5} aria-hidden />
        <Title as="h2" className="mt-4">
          You&apos;re on <em>the list.</em>
        </Title>
        <p className="mt-3 text-[15px] text-muted-foreground thai-body">{t("wlDone")}</p>
        {test ? <p className="mt-2 text-[13px] text-muted-foreground thai-body">{t("wlTest")}</p> : null}
        <p className="mt-5 text-[13px] text-muted-foreground thai-body">{t("wlLeave")}</p>
      </section>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="rounded-3xl bg-card p-6 sm:p-8">
      <Title as="h2">
        Join the <em>Founding 30 Waitlist</em>
      </Title>
      <p className="mt-2 text-[15px] text-muted-foreground thai-body">{t("wlLine")}</p>

      <div className="mt-6 max-w-md">
        <label htmlFor={emailId} className="mb-1.5 block text-sm thai-body">
          {t("wlEmail")}
          <span aria-hidden className="ml-0.5 text-brand">*</span>
        </label>
        <Input
          id={emailId}
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          className="h-12 bg-background"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? `${emailId}-error` : undefined}
        />
        {emailError ? <FieldError id={`${emailId}-error`} message={t("wlEmailError")} className="mt-1.5" /> : null}
      </div>

      <div className="mt-5">
        <div className="flex items-start gap-2.5">
          <Checkbox
            id={consentId}
            className="mt-0.5"
            checked={consent}
            onCheckedChange={(v) => setConsent(v === true)}
            aria-invalid={consentError ? true : undefined}
            aria-describedby={consentError ? `${consentId}-error` : undefined}
          />
          <label htmlFor={consentId} className="text-sm thai-body">
            {t("wlConsent")}
            <span aria-hidden className="ml-0.5 text-brand">*</span>
            <span className="text-muted-foreground"> · </span>
            <Link to="/legal/privacy" className="text-muted-foreground underline underline-offset-4">
              {t("privacy")}
            </Link>
          </label>
        </div>
        {consentError ? <FieldError id={`${consentId}-error`} message={t("wlConsentError")} className="mt-1.5" /> : null}
      </div>

      {state === "failed" ? (
        <div role="alert" className="mt-5 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive thai-body">
          <span>{t("wlFailed")}</span>{" "}
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

      <Button type="submit" size="lg" className="mt-6 w-full sm:w-auto" disabled={state === "sending"}>
        {state === "sending" ? t("wlJoining") : t("wlJoin")}
      </Button>
      <p className="mt-3 text-[13px] text-muted-foreground thai-body">{t("wlLeave")}</p>
    </form>
  );
}

export default WaitlistForm;
