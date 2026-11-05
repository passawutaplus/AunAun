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

const AppleIcon = () => (
  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M16.37 12.62c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.77-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.65zM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.09 1.75-.96 2.79 1.02.08 2.05-.52 2.68-1.27z" />
  </svg>
);

type ExtraProvider = { key: string; id: OAuthProviderId; name: string; icon: () => JSX.Element };

const EXTRA_PROVIDERS: ExtraProvider[] = [
  { key: "line", id: "custom:line", name: "LINE", icon: LineIcon },
  { key: "facebook", id: "facebook", name: "Facebook", icon: FacebookIcon },
  { key: "apple", id: "apple", name: "Apple", icon: AppleIcon },
];

/**
 * Extra sign-in buttons are off until the provider is set up in Supabase.
 * VITE_AUTH_EXTRA_PROVIDERS="line,facebook,apple" (any subset, in this order).
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
      {extras.length ? (
        <div className={cn("mt-2 grid gap-2", extras.length === 1 ? "grid-cols-1" : extras.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
          {extras.map((p) => {
            const Icon = p.icon;
            return (
              <Button
                key={p.key}
                type="button"
                variant="outline"
                disabled={!!busy}
                aria-label={`เข้าสู่ระบบด้วย ${p.name}`}
                onClick={() => void start(p.id, p.name)}
                className={cn("h-11 w-full gap-2 rounded-xl bg-background/60 backdrop-blur", buttonClassName)}
              >
                {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon />}
                <span className="text-sm">{p.name}</span>
              </Button>
            );
          })}
        </div>
      ) : null}
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
