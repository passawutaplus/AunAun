import { Webhook } from "standardwebhooks";

export type SupabaseAuthHookPayload = {
  user: {
    email: string;
    new_email?: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
    old_email?: string;
  };
};

export type ParsedAuthEmailHook = {
  run_id: string;
  emailType: string;
  email: string;
  confirmationUrl: string;
  token?: string;
  oldEmail?: string;
  newEmail?: string;
  brandUrl: string;
};

const SKIP_EMAIL_TYPES = new Set([
  "password_changed_notification",
  "email_changed_notification",
  "phone_changed_notification",
  "identity_linked_notification",
  "identity_unlinked_notification",
  "mfa_factor_enrolled_notification",
  "mfa_factor_unenrolled_notification",
]);

export function getAuthHookSecret(): string | undefined {
  return process.env.SEND_EMAIL_HOOK_SECRET || process.env.LOVABLE_API_KEY;
}

/** Supabase dashboard secret is `v1,whsec_<base64>` — library wants base64 only. */
export function stripHookSecretPrefix(secret: string): string {
  return secret.replace(/^v1,whsec_/, "");
}

export function isSupabaseAuthHook(request: Request): boolean {
  return request.headers.has("webhook-signature");
}

export function buildSupabaseConfirmationUrl(
  supabaseUrl: string,
  emailData: SupabaseAuthHookPayload["email_data"],
): string {
  const params = new URLSearchParams({
    token: emailData.token_hash,
    type: emailData.email_action_type,
  });
  if (emailData.redirect_to) {
    params.set("redirect_to", emailData.redirect_to);
  }
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/auth/v1/verify?${params.toString()}`;
}

function resolveAppOrigin(brandUrl?: string | null): string {
  const fallbacks = [
    process.env.VITE_APLUS1_APP_URL,
    process.env.VITE_ANTHEM_APP_URL,
    import.meta.env.VITE_APLUS1_APP_URL as string | undefined,
    import.meta.env.VITE_ANTHEM_APP_URL as string | undefined,
    "https://aplus1.app",
  ];
  if (brandUrl) {
    try {
      return new URL(brandUrl).origin;
    } catch {
      if (/aplus1\.app/i.test(brandUrl)) return "https://aplus1.app";
    }
  }
  for (const candidate of fallbacks) {
    if (!candidate) continue;
    try {
      return new URL(candidate).origin;
    } catch {
      continue;
    }
  }
  return "https://aplus1.app";
}

/** Direct app link — avoids PKCE ?code= exchange that breaks from email clients. */
export function buildAppAuthConfirmationUrl(
  appOrigin: string,
  emailData: SupabaseAuthHookPayload["email_data"],
): string {
  const params = new URLSearchParams({
    token_hash: emailData.token_hash,
    type: emailData.email_action_type,
  });
  const path =
    emailData.email_action_type === "recovery" ? "/reset-password" : "/auth/callback";
  return `${appOrigin.replace(/\/$/, "")}${path}?${params.toString()}`;
}

export async function verifySupabaseAuthHook(
  request: Request,
  secret: string,
): Promise<ParsedAuthEmailHook | null> {
  const rawBody = await request.text();
  const headers = Object.fromEntries(request.headers);
  const wh = new Webhook(stripHookSecretPrefix(secret));
  const payload = wh.verify(rawBody, headers) as SupabaseAuthHookPayload;

  const emailType = payload.email_data.email_action_type;
  if (SKIP_EMAIL_TYPES.has(emailType)) {
    return null;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
    "";
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL not configured");
  }

  const webhookId = request.headers.get("webhook-id") || crypto.randomUUID();
  const brandUrl = payload.email_data.redirect_to || payload.email_data.site_url;
  const appOrigin = resolveAppOrigin(brandUrl);
  const confirmationUrl = buildAppAuthConfirmationUrl(appOrigin, payload.email_data);

  return {
    run_id: webhookId,
    emailType,
    email: payload.user.email,
    confirmationUrl,
    token: payload.email_data.token,
    oldEmail: payload.email_data.old_email,
    newEmail: payload.user.new_email || payload.email_data.token_new,
    brandUrl,
  };
}
