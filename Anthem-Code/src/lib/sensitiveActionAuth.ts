import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** ยืนยันตัวตนก่อน consent / PDPA / รายงาน — เก็บใน session (ไม่ใช่ cookie) */
export const REAUTH_SESSION_KEY = "aplus1-sensitive-reauth-at";

/** ไม่ต้องใส่รหัสซ้ำภายใน 10 นาทีหลังยืนยันสำเร็จ */
export const REAUTH_TTL_MS = 10 * 60 * 1000;

export function isSensitiveActionVerified(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(REAUTH_SESSION_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < REAUTH_TTL_MS;
  } catch {
    return false;
  }
}

export function markSensitiveActionVerified(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(REAUTH_SESSION_KEY, String(Date.now()));
}

export function clearSensitiveActionVerified(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(REAUTH_SESSION_KEY);
}

export function userHasEmailPassword(user: User | null | undefined): boolean {
  if (!user) return false;
  const fromIdentities = user.identities?.some((i) => i.provider === "email") ?? false;
  const providers = user.app_metadata?.providers as string[] | undefined;
  const fromMeta = Array.isArray(providers) && providers.includes("email");
  return fromIdentities || fromMeta;
}

export async function verifyUserPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    throw new Error(
      error.message.includes("Invalid login credentials")
        ? "รหัสผ่านไม่ถูกต้อง"
        : error.message,
    );
  }
  markSensitiveActionVerified();
}

/** บัญชี OAuth เท่านั้น — ยืนยันด้วยการพิมพ์อีเมลให้ตรง (ไม่มีรหัสผ่านในระบบ) */
export function verifyEmailConfirmation(userEmail: string, typed: string): void {
  if (userEmail.trim().toLowerCase() !== typed.trim().toLowerCase()) {
    throw new Error("อีเมลไม่ตรงกับบัญชีที่เข้าสู่ระบบ");
  }
  markSensitiveActionVerified();
}
