const REFERRAL_STORAGE_KEY = "pixel100_referral_code";
const REFERRAL_PATTERN = /^[A-Z0-9]{8,16}$/;

export function normalizeReferralCode(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase() ?? "";
  return REFERRAL_PATTERN.test(normalized) ? normalized : null;
}

export function captureReferralFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const code = normalizeReferralCode(params.get("ref"));
  if (!code) return null;
  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, code);
  } catch {
    /* Storage can be unavailable in private browsing. */
  }
  return code;
}

export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return normalizeReferralCode(localStorage.getItem(REFERRAL_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function clearStoredReferralCode(): void {
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    /* No-op. */
  }
}
