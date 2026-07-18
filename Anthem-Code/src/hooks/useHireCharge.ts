import { useState } from "react";
import { DEFAULT_PAYMENT_FEATURE_FLAGS } from "@/lib/payments/flags";
import type { PaymentMethod } from "@/lib/payments/types";

export type HireChargeInput = {
  amountSatang: number;
  method: PaymentMethod;
  title: string;
  quoteId?: string | null;
  hiringRequestId?: string | null;
  conversationId: string;
};

export type HireChargeResult = {
  chargeId: string;
  /** Bank/merchant reference shown to the buyer. */
  reference: string;
  /** PromptPay QR image URI — null in mock mode (UI renders a placeholder). */
  qrCodeUri: string | null;
  /** For card/3DS redirect flows. */
  authorizeUri: string | null;
  amountSatang: number;
  method: PaymentMethod;
  /** ISO expiry — QR/charge validity window. */
  expiresAt: string;
  /** true = real Omise charge, false = local mock for demo/preview. */
  live: boolean;
};

const MOCK_TTL_MS = 15 * 60 * 1000;

function makeReference(): string {
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `AP${rand.slice(0, 14).padEnd(14, "0")}`;
}

function mockCharge(input: HireChargeInput): HireChargeResult {
  return {
    chargeId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    reference: makeReference(),
    qrCodeUri: null,
    authorizeUri: null,
    amountSatang: input.amountSatang,
    method: input.method,
    expiresAt: new Date(Date.now() + MOCK_TTL_MS).toISOString(),
    live: false,
  };
}

/** Whether a live Omise charge can be attempted for this method (else mock). */
function liveChargeEnabled(method: PaymentMethod): boolean {
  const f = DEFAULT_PAYMENT_FEATURE_FLAGS;
  if (!f.omisePaymentsEnabled || !f.liveMarketplacePaymentsEnabled) return false;
  if (method === "promptpay") return f.omisePromptPayEnabled;
  if (method === "card") return f.omiseCardEnabled;
  return f.bankTransferEnabled;
}

/**
 * Create a hire charge. UI-first: when live Omise is not enabled, returns a local
 * mock so the whole checkout → QR → success flow is demoable. When enabled, calls
 * the server route which creates the Omise charge and returns QR/reference.
 */
export function useHireCharge() {
  const [pending, setPending] = useState(false);

  async function createCharge(input: HireChargeInput): Promise<HireChargeResult> {
    setPending(true);
    try {
      if (!liveChargeEnabled(input.method)) {
        // Small delay so the UI transition feels intentional.
        await new Promise((r) => setTimeout(r, 400));
        return mockCharge(input);
      }

      const res = await fetch("/api/hire-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountSatang: input.amountSatang,
          method: input.method,
          quoteId: input.quoteId ?? null,
          hiringRequestId: input.hiringRequestId ?? null,
          conversationId: input.conversationId,
          title: input.title,
        }),
      });
      if (!res.ok) {
        throw new Error(`charge_failed_${res.status}`);
      }
      const data = (await res.json()) as Partial<HireChargeResult>;
      return {
        chargeId: data.chargeId ?? `srv_${Date.now()}`,
        reference: data.reference ?? makeReference(),
        qrCodeUri: data.qrCodeUri ?? null,
        authorizeUri: data.authorizeUri ?? null,
        amountSatang: data.amountSatang ?? input.amountSatang,
        method: input.method,
        expiresAt: data.expiresAt ?? new Date(Date.now() + MOCK_TTL_MS).toISOString(),
        live: true,
      };
    } finally {
      setPending(false);
    }
  }

  return { createCharge, pending };
}
