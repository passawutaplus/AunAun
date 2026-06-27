/**
 * Single source of truth for Google OAuth consent screen (So1o + Aplus1 unified).
 * Used by setup-google-oauth-branding.mjs — not imported by app runtime.
 */

export const SUPABASE_PROJECT_REF = "zkflkpbmbozrchqncpzi";

/** From Supabase auth config (public client id). */
export const GOOGLE_OAUTH_CLIENT_ID =
  "727912671200-tvdvkufkbppsvik3acj55objqcjpuqcm.apps.googleusercontent.com";

/** Google Cloud project number (prefix of client id). */
export const GOOGLE_CLOUD_PROJECT_NUMBER = "727912671200";

export const ECOSYSTEM_OAUTH = {
  /** Shown on Google consent screen after brand verification. */
  appName: "So1o & Aplus1",
  /** User support email on consent screen. */
  supportEmail: "passawut.a.plus@gmail.com",
  /** Primary marketing site for App domain links. */
  homePage: "https://aplus1.app",
  privacyPolicy: "https://aplus1.app/legal/privacy",
  termsOfService: "https://aplus1.app/legal/terms",
  /** 120×120 min for Google; use 512 PNG from production. */
  appLogoUrl: "https://aplus1.app/icons/icon-512.png",
};

/** Google Console → Authorized domains (Branding). */
export const GOOGLE_AUTHORIZED_DOMAINS = [
  "aplus1.app",
  "solofreelancer.com",
];

/** OAuth client → Authorized JavaScript origins. */
export const GOOGLE_JS_ORIGINS = [
  "https://aplus1.app",
  "https://www.aplus1.app",
  "https://solofreelancer.com",
  "https://www.solofreelancer.com",
  "https://aplus1-demo.vercel.app",
  "https://solo-demo-liart.vercel.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

/** OAuth client → Authorized redirect URIs. */
export const GOOGLE_REDIRECT_URIS = [
  `https://${SUPABASE_PROJECT_REF}.supabase.co/auth/v1/callback`,
  // After Supabase custom domain (Pro): uncomment + add in Google Console
  // "https://auth.aplus1.app/auth/v1/callback",
];

/** Supabase custom auth domain (Pro add-on) — changes “ไปยัง …supabase.co”. */
export const SUPABASE_CUSTOM_AUTH_HOST = "auth.aplus1.app";

export const GOOGLE_CONSOLE_URLS = {
  branding: `https://console.cloud.google.com/auth/branding?project=${GOOGLE_CLOUD_PROJECT_NUMBER}`,
  consent: `https://console.cloud.google.com/apis/credentials/consent?project=${GOOGLE_CLOUD_PROJECT_NUMBER}`,
  credentials: `https://console.cloud.google.com/apis/credentials?project=${GOOGLE_CLOUD_PROJECT_NUMBER}`,
  oauthClient: `https://console.cloud.google.com/apis/credentials/oauthclient/${GOOGLE_CLOUD_PROJECT_NUMBER}?project=${GOOGLE_CLOUD_PROJECT_NUMBER}`,
};
