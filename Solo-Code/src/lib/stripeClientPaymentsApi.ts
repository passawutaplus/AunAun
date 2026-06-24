import { getStripeEnvironment } from "@/lib/stripe";

export async function startClientJobCheckout(opts: {
  token: string;
  paymentType: "deposit" | "final";
  successUrl?: string;
  cancelUrl?: string;
}): Promise<void> {
  const origin = window.location.origin;
  const successUrl = opts.successUrl ?? `${origin}/track/${opts.token}?stripe=${opts.paymentType}`;
  const cancelUrl =
    opts.cancelUrl ?? `${origin}/track/${opts.token}/checkout?payment=${opts.paymentType}`;

  const res = await fetch("/api/public/payments/client-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: opts.token,
      paymentType: opts.paymentType,
      environment: getStripeEnvironment(),
      successUrl,
      cancelUrl,
    }),
  });

  const json = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || json.error || !json.url) {
    throw new Error(json.error ?? "ไม่สามารถเริ่มชำระเงินได้");
  }
  window.location.href = json.url;
}
