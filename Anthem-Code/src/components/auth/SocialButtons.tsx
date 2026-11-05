import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { openOAuthPopup, signInWithOAuth, type OAuthProviderId } from "@/integrations/oauth";
import { isWebViewApp } from "@/lib/appShell";
import { cn } from "@/lib/utils";
import { userFacingError } from "@/lib/userFacingError";

async function handleOAuth(provider: OAuthProviderId, name: string, redirectTo?: string, popup?: Window | null) {
  const result = await signInWithOAuth({ redirectTo, popup, provider });
  if (result.error) {
    toast.error(userFacingError(result.error, `เข้าสู่ระบบด้วย ${name} ไม่สำเร็จ`));
  }
}

const FacebookIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#1877F2"
      d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"
    />
  </svg>
);

const LineIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
    <rect width="24" height="24" rx="5.5" fill="#06C755" />
    <path
      fill="#fff"
      d="M12 4.6c-4.4 0-8 2.9-8 6.5 0 3.2 2.8 5.9 6.7 6.4.3.1.6.2.7.4.1.2.1.5 0 .7l-.1.7c0 .2-.2.8.7.4.9-.4 4.9-2.9 6.7-4.9 1.2-1.3 1.8-2.6 1.8-4.1 0-3.6-3.6-6.5-8-6.5z"
    />
  </svg>
);

type ExtraProvider = { key: string; id: OAuthProviderId; name: string; icon: () => JSX.Element };

const EXTRA_PROVIDERS: ExtraProvider[] = [
  { key: "line", id: "custom:line", name: "LINE", icon: LineIcon },
  { key: "facebook", id: "facebook", name: "Facebook", icon: FacebookIcon },
];

/**
 * Extra sign-in buttons are off until the provider is set up in Supabase.
 * VITE_AUTH_EXTRA_PROVIDERS="line,facebook" (any subset, in this order).
 */
function enabledExtraProviders(): ExtraProvider[] {
  const raw = String(import.meta.env.VITE_AUTH_EXTRA_PROVIDERS ?? "");
  const keys = new Set(
    raw
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean),
  );
  return EXTRA_PROVIDERS.filter((p) => keys.has(p.key));
}

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.96l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
  </svg>
);

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
          {[{ key: "google", id: "google" as OAuthProviderId, name: "Google", icon: GoogleIcon }, ...extras].map((p) => {
            const Icon = p.icon;
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
      ) : (
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
