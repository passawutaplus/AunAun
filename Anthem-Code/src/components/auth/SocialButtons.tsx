import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { openOAuthPopup, signInWithOAuth, type OAuthProviderId } from "@/integrations/oauth";
import { enabledExtraProviders } from "@/lib/authProviders";
import { GoogleIcon, PROVIDER_ICONS } from "@/components/auth/ProviderIcons";
import { isWebViewApp } from "@/lib/appShell";
import { cn } from "@/lib/utils";
import { userFacingError } from "@/lib/userFacingError";

async function handleOAuth(provider: OAuthProviderId, name: string, redirectTo?: string, popup?: Window | null) {
  const result = await signInWithOAuth({ redirectTo, popup, provider });
  if (result.error) {
    toast.error(userFacingError(result.error, `เข้าสู่ระบบด้วย ${name} ไม่สำเร็จ`));
  }
}

export function SocialButtons({
  className,
  buttonClassName,
  redirectTo,
  label = "เข้าสู่ระบบด้วย Google",
}: {
  className?: string;
  buttonClassName?: string;
  redirectTo?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState<OAuthProviderId | null>(null);
  const extras = enabledExtraProviders();

  const start = async (provider: OAuthProviderId, name: string) => {
    setBusy(provider);
    // Open the popup synchronously (still inside the click gesture) so
    // browsers don't block it once we `await` the Supabase call below.
    const popup = openOAuthPopup();
    try {
      await handleOAuth(provider, name, redirectTo, popup);
    } finally {
      setBusy(null);
    }
  };

  // Google rejects OAuth inside embedded WebViews (disallowed_useragent); email sign-in only there.
  if (isWebViewApp()) return null;

  return (
    <div className={cn(className)}>
      {extras.length ? (
        // Several providers: logo-only buttons in one row (Google first).
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${extras.length + 1}, minmax(0, 1fr))` }}>
          {[{ key: "google" as const, id: "google" as OAuthProviderId, name: "Google" }, ...extras].map((p) => {
            const Icon = PROVIDER_ICONS[p.key];
            return (
              <Button
                key={p.key}
                type="button"
                variant="outline"
                disabled={!!busy}
                aria-label={`เข้าสู่ระบบด้วย ${p.name}`}
                title={p.name}
                onClick={() => void start(p.id, p.name)}
                className={cn("h-11 w-full rounded-xl bg-background/60 backdrop-blur [&_svg]:h-5 [&_svg]:w-5", buttonClassName)}
              >
                {busy === p.id ? <Loader2 className="animate-spin" /> : <Icon />}
              </Button>
            );
          })}
        </div>
      ) : null}
      {extras.some((p) => p.key === "line") ? (
        // Consent + purpose for the email LINE shares (required by LINE's email permission).
        <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
          เข้าสู่ระบบด้วย LINE เราขออีเมลของคุณ เพื่อสร้างบัญชีและแจ้งเรื่องบัญชีเท่านั้น ·{" "}
          <Link to="/legal/privacy" className="underline underline-offset-2 hover:text-foreground">
            นโยบายความเป็นส่วนตัว
          </Link>
        </p>
      ) : null}
      {extras.length ? null : (
        <Button
          type="button"
          variant="outline"
          disabled={!!busy}
          onClick={() => void start("google", "Google")}
          className={cn("h-11 w-full gap-2 rounded-xl bg-background/60 backdrop-blur", buttonClassName)}
        >
          {busy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
          <span className="text-sm">{label}</span>
        </Button>
      )}
    </div>
  );
}

export function AuthEmailSeparator({ label = "หรือเข้าด้วยอีเมล" }: { label?: string } = {}) {
  if (isWebViewApp()) return null;
  return (
    <div className="relative my-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border/60" />
      </div>
      <div className="relative flex justify-center text-[11px]">
        <span className="bg-background px-3 text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
