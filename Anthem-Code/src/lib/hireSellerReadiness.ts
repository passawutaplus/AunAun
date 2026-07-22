import { isValidThaiTaxId } from "@/lib/chatOffer";
import type { BillingProfileFields } from "@/lib/billingProfile";

export type HireSellerCheckId = "email" | "billing" | "identity" | "bank";

export type HireSellerCheckItem = {
  id: HireSellerCheckId;
  label: string;
  hint: string;
  done: boolean;
  href: string;
};

export type HireSellerBankInfo = {
  bank_name?: string | null;
  account_number?: string | null;
  account_name?: string | null;
  verified_at?: string | null;
} | null;

export type HireSellerReadinessInput = {
  emailConfirmed: boolean;
  billing: BillingProfileFields | null | undefined;
  isVerified: boolean;
  /** Prefer payout_profiles; fall back to approved KYC bank fields. */
  bank: HireSellerBankInfo;
  /** True when a KYC request is pending review (for UI copy). */
  kycPending?: boolean;
};

export type HireSellerReadiness = {
  ready: boolean;
  items: HireSellerCheckItem[];
  missingLabels: string[];
  kycPending: boolean;
};

/** Minimum billing fields for hire docs (quote / invoice / receipt). */
export function isHireBillingComplete(billing: BillingProfileFields | null | undefined): boolean {
  if (!billing) return false;
  const type = billing.billing_type === "corporate" ? "corporate" : "individual";
  // Prefer billing_address; fall back to generic profile address if present on payload.
  const address = (
    billing.billing_address ||
    (billing as BillingProfileFields & { address?: string | null }).address ||
    ""
  ).trim();
  if (address.length < 8) return false;

  if (type === "corporate") {
    const company = (billing.company_name || "").trim();
    const contact = (billing.contact_person || "").trim();
    const taxOk = isValidThaiTaxId(billing.tax_id);
    return company.length >= 2 && contact.length >= 2 && taxOk;
  }

  const name = (billing.legal_name || billing.display_name || "").trim();
  return name.length >= 2;
}

export function isHireBankReady(bank: HireSellerBankInfo): boolean {
  if (!bank) return false;
  const bankName = (bank.bank_name || "").trim();
  const account = (bank.account_number || "").replace(/\D/g, "");
  const accountName = (bank.account_name || "").trim();
  return bankName.length >= 2 && account.length >= 10 && accountName.length >= 2;
}

/**
 * Seller readiness to open “สนใจจ้างงาน” on portfolio —
 * marketplace-standard: verified identity + payout bank + billing docs + confirmed email.
 * Independent from PX gift/cashout follower/referral gates.
 */
export function evaluateHireSellerReadiness(input: HireSellerReadinessInput): HireSellerReadiness {
  const billingDone = isHireBillingComplete(input.billing);
  const bankDone = isHireBankReady(input.bank);
  const identityDone = !!input.isVerified;
  const emailDone = !!input.emailConfirmed;

  const items: HireSellerCheckItem[] = [
    {
      id: "email",
      label: "ยืนยันอีเมลแล้ว",
      hint: "ใช้รับแจ้งเตือนคำขอจ้างและเอกสารการเงิน",
      done: emailDone,
      href: "/settings",
    },
    {
      id: "billing",
      label: "ข้อมูลออกเอกสาร / ภาษีครบ",
      hint: "ชื่อ ที่อยู่ (และเลขผู้เสียภาษีถ้าเป็นนิติบุคคล)",
      done: billingDone,
      href: "/settings#billing-profile",
    },
    {
      id: "identity",
      label: "ยืนยันตัวตน (KYC) ผ่านแล้ว",
      hint: input.kycPending
        ? "คำขอ KYC อยู่ระหว่างตรวจ — รอผลอนุมัติ"
        : "ยืนยันบัตรประชาชนก่อนรับเงินค่าจ้าง",
      done: identityDone,
      href: "/verify",
    },
    {
      id: "bank",
      label: "บัญชีธนาคารรับเงินพร้อม",
      hint: "ธนาคาร · เลขบัญชี · ชื่อบัญชี สำหรับ payout",
      done: bankDone,
      href: "/verify",
    },
  ];

  const missingLabels = items.filter((i) => !i.done).map((i) => i.label);
  return {
    ready: missingLabels.length === 0,
    items,
    missingLabels,
    kycPending: !!input.kycPending && !identityDone,
  };
}
