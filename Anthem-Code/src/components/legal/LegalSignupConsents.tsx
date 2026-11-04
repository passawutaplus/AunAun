import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, FileText, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { LEGAL_APP_NAME } from "@/lib/legalConfig";
import { authCopy, type AuthCopy } from "@/lib/authCopy";
import type { PageLang } from "@/lib/creatorInvite";

export interface LegalSignupConsentState {
  terms: boolean;
  privacy: boolean;
}

interface Props {
  value: LegalSignupConsentState;
  onChange: (next: LegalSignupConsentState) => void;
  compact?: boolean;
  /** Sign-up page language (TH default). */
  lang?: PageLang;
}

export function isLegalSignupComplete(value: LegalSignupConsentState): boolean {
  return value.terms && value.privacy;
}

function steps(t: AuthCopy) {
  return [
    {
      key: "terms" as const,
      icon: FileText,
      title: t.termsTitle,
      body: (
        <>
          {t.termsAccept}{" "}
          <Link to="/legal/terms" target="_blank" className="text-primary hover:underline font-medium">
            {t.terms}
          </Link>
          {" "}— {t.termsBody.replace("SAMECOR", LEGAL_APP_NAME)}
          <strong className="font-medium text-foreground"> {t.termsNot}</strong> {t.termsBody2}
        </>
      ),
    },
    {
      key: "privacy" as const,
      icon: Shield,
      title: t.privacyTitle,
      body: (
        <>
          {t.privacyAck}{" "}
          <Link to="/legal/privacy" target="_blank" className="text-primary hover:underline font-medium">
            {t.pdpa}
          </Link>
          {" "}{t.and}{" "}
          <Link to="/legal/cookies" target="_blank" className="text-primary hover:underline font-medium">
            {t.cookies}
          </Link>
          {" "}— {t.privacyBody}
        </>
      ),
    },
  ];
}

const LegalSignupConsents = ({ value, onChange, compact, lang = "th" }: Props) => {
  const STEPS = steps(authCopy(lang));
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-3 space-y-2.5">
      {STEPS.map(({ key, icon: Icon, title, body }) => {
        const checked = value[key];
        return (
          <label
            key={key}
            className={cn(
              "flex gap-2.5 items-start cursor-pointer select-none rounded-lg border p-2.5 transition-colors",
              checked
                ? "border-primary/40 bg-primary/5"
                : "border-border/50 bg-background/60 hover:border-border",
            )}
          >
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => onChange({ ...value, [key]: v === true })}
              className="mt-0.5"
              aria-label={title}
            />
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
                <span className={cn("font-medium text-foreground", compact ? "text-[11px]" : "text-xs")}>
                  {title}
                </span>
                {checked ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto shrink-0" aria-hidden />
                ) : null}
              </div>
              <p className={cn("leading-relaxed text-muted-foreground", compact ? "text-[10px]" : "text-[11px]")}>
                {body}
              </p>
            </div>
          </label>
        );
      })}
    </div>
  );
};

export default LegalSignupConsents;
