import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeHireReference } from "@/lib/payments/chargeIds";
import { canChargeOmiseClient, DEFAULT_PAYMENT_FEATURE_FLAGS } from "@/lib/payments/flags";
import type { PaymentMethod } from "@/lib/payments/types";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("auth_required");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export type HireChargeInput = {
  amountSatang: number;
  method: PaymentMethod;
  title: string;
  quoteId?: string | null;
  hiringRequestId?: string | null;
  conversationId: string;
  cardToken?: string | null;
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
  paid?: boolean;
};

const MOCK_TTL_MS = 15 * 60 * 1000;

function mockCharge(input: HireChargeInput): HireChargeResult {
  return {
    chargeId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    reference: makeHireReference(),
    qrCodeUri: null,
    authorizeUri: null,
    amountSatang: input.amountSatang,
    method: input.method,
    expiresAt: new Date(Date.now() + MOCK_TTL_MS).toISOString(),
    live: false,
  };
}

/**
 * Create a hire charge. When Omise test/live charges are enabled, calls /api/hire-charge.
 * Otherwise returns a local mock so checkout UX stays demoable.
 */
export function useHireCharge() {
  const [pending, setPending] = useState(false);

  async function createCharge(input: HireChargeInput): Promise<HireChargeResult> {
    setPending(true);
    try {
      if (!canChargeOmiseClient(DEFAULT_PAYMENT_FEATURE_FLAGS, input.method)) {
        await new Promise((r) => setTimeout(r, 400));
        return mockCharge(input);
      }

      const res = await fetch("/api/hire-charge", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          amountSatang: input.amountSatang,
          method: input.method,
          quoteId: input.quoteId ?? null,
          hiringRequestId: input.hiringRequestId ?? null,
          conversationId: input.conversationId,
          title: input.title,
          cardToken: input.cardToken ?? null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<HireChargeResult> & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || `charge_failed_${res.status}`);
      }
      return {
        chargeId: data.chargeId ?? `srv_${Date.now()}`,
        reference: data.reference ?? makeReference(),
        qrCodeUri: data.qrCodeUri ?? null,
        authorizeUri: data.authorizeUri ?? null,
        amountSatang: data.amountSatang ?? input.amountSatang,
        method: input.method,
        expiresAt: data.expiresAt ?? new Date(Date.now() + MOCK_TTL_MS).toISOString(),
        live: true,
        paid: data.paid === true,
      };
    } finally {
      setPending(false);
    }
  }

  /** Test-mode only: mark PromptPay charge paid via Omise (triggers webhook). */
  async function markTestPaid(chargeId: string): Promise<boolean> {
    const res = await fetch("/api/hire-charge", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ action: "mark_paid", chargeId }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { paid?: boolean };
    return data.paid === true;
  }

  return { createCharge, markTestPaid, pending };
}
