import { normalizePromptPayId, promptPayPayload } from "@/lib/payments/promptpayQr";
import { isSupportDemo, isSupportSpaceEnabled } from "@/lib/support/flags";

/** Where shop orders and donations are paid: one PromptPay target plus the bank account behind it. */
export type SupportPayee = {
  promptPayId: string;
  accountName: string;
  bank: string;
  /** Shown as typed (e.g. "149-3-24848-7"); copied without the dashes. */
  accountNo: string | null;
};

/** A made-up payee so test mode can show the card without real details. Its QR is not a real account. */
const SAMPLE_PAYEE: SupportPayee = {
  promptPayId: "000000000000000",
  accountName: "SAMECOR (ตัวอย่าง)",
  bank: "กสิกรไทย",
  accountNo: "000-0-00000-0",
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The payee comes from build env, never from the repo (it is public):
 * VITE_SUPPORT_PROMPTPAY_ID, VITE_SUPPORT_ACCOUNT_NAME, VITE_SUPPORT_ACCOUNT_NO, VITE_SUPPORT_BANK.
 * Null when the id or the name is missing or the id is not a PromptPay target.
 */
export function getSupportPayee(): SupportPayee | null {
  const env = import.meta.env;
  const promptPayId = text(env.VITE_SUPPORT_PROMPTPAY_ID);
  const accountName = text(env.VITE_SUPPORT_ACCOUNT_NAME);
  if (promptPayId && accountName && normalizePromptPayId(promptPayId)) {
    return {
      promptPayId,
      accountName,
      bank: text(env.VITE_SUPPORT_BANK) || "กสิกรไทย",
      accountNo: text(env.VITE_SUPPORT_ACCOUNT_NO) || null,
    };
  }
  return isSupportDemo() ? SAMPLE_PAYEE : null;
}

/**
 * Real (non-test) checkout and Donate are offered once the space is on and a payee is set.
 * The server still refuses them until the owner opens anthem.support_settings.
 */
export function isSupportPayOpen(): boolean {
  if (!isSupportSpaceEnabled() || isSupportDemo()) return false;
  const env = import.meta.env;
  return normalizePromptPayId(text(env.VITE_SUPPORT_PROMPTPAY_ID)) !== null && text(env.VITE_SUPPORT_ACCOUNT_NAME) !== "";
}

/** The QR string for a fixed amount in whole baht. */
export function supportQrPayload(payee: SupportPayee, amountThb: number): string | null {
  return promptPayPayload(payee.promptPayId, amountThb);
}

/** True when the server refused because the owner has not opened the shop / donations yet. */
export function isClosedError(err: unknown): boolean {
  const msg = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "";
  return msg.startsWith("CLOSED");
}
