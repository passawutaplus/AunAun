import { supabase } from "@/integrations/supabase/client";
import {
  LEGAL_COOKIES_VERSION,
  LEGAL_PRIVACY_VERSION,
  LEGAL_TERMS_VERSION,
} from "@/lib/legalConfig";

const ANON_COOKIE_KEY = "anthem-cookie-anon-id";

function getAnonymousId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(ANON_COOKIE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_COOKIE_KEY, id);
  }
  return id;
}

const PENDING_SIGNUP_CONSENT_KEY = "anthem-pending-signup-consent";

export function markPendingSignupConsent(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PENDING_SIGNUP_CONSENT_KEY, "1");
}

/** เรียกหลัง login สำเร็จ — บันทึก consent ที่ค้างจาก signup (กรณียืนยันอีเมลทีหลัง) */
export async function flushPendingSignupConsent(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem(PENDING_SIGNUP_CONSENT_KEY)) return;
  await recordSignupConsents();
  localStorage.removeItem(PENDING_SIGNUP_CONSENT_KEY);
}

/** บันทึก consent ตอนสมัคร — ไม่ throw ถ้า migration ยังไม่รัน */
export async function recordSignupConsents(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)("record_signup_consents", {
      _terms_version: LEGAL_TERMS_VERSION,
      _privacy_version: LEGAL_PRIVACY_VERSION,
      _locale: typeof navigator !== "undefined" ? navigator.language.slice(0, 10) : "th",
    });
  } catch {
    /* migration อาจยังไม่ deploy — ไม่บล็อก signup */
  }
}

/** บันทึก cookie preference ฝั่ง server */
export async function logCookieConsentServer(analytics: boolean, functional: boolean): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)("log_cookie_consent", {
      _analytics: analytics,
      _preferences: functional,
      _marketing: false,
      _anonymous_id: getAnonymousId(),
      _policy_version: LEGAL_COOKIES_VERSION,
    });
  } catch {
    /* silent — local consent ยังใช้ได้ */
  }
}

export type ConsentStatus = {
  authenticated: boolean;
  needs_reconsent?: boolean;
  missing?: string[];
};

export async function fetchConsentStatus(): Promise<ConsentStatus | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("user_consent_status");
    if (error) return null;
    return data as ConsentStatus;
  } catch {
    return null;
  }
}

export async function recordPolicyReconsent(terms: boolean, privacy: boolean): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)("record_policy_reconsent", {
    _terms_version: terms ? LEGAL_TERMS_VERSION : null,
    _privacy_version: privacy ? LEGAL_PRIVACY_VERSION : null,
  });
  if (error) throw error;
}

export interface CopyrightReportInput {
  claimant_name: string;
  claimant_email: string;
  claimant_role?: string;
  original_work_description: string;
  original_work_url?: string;
  infringing_url: string;
  good_faith_confirmed: boolean;
  authority_confirmed: boolean;
  signature_text: string;
}

export async function submitCopyrightReport(input: CopyrightReportInput): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("submit_copyright_report", {
    _claimant_name: input.claimant_name,
    _claimant_email: input.claimant_email,
    _claimant_role: input.claimant_role ?? null,
    _original_work_description: input.original_work_description,
    _original_work_url: input.original_work_url ?? null,
    _infringing_url: input.infringing_url,
    _good_faith_confirmed: input.good_faith_confirmed,
    _authority_confirmed: input.authority_confirmed,
    _signature_text: input.signature_text,
  });
  if (error) throw error;
  return data as string;
}

export type PrivacyRequestType = "access" | "export" | "delete" | "correct" | "object" | "withdraw";

export async function submitPrivacyRequest(
  requestType: PrivacyRequestType,
  description?: string,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("submit_privacy_request", {
    _request_type: requestType,
    _description: description ?? "",
  });
  if (error) throw error;
  return data as string;
}
