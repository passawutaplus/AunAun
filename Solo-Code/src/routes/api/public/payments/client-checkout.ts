import { createFileRoute } from "@tanstack/react-router";
import {
  createClientJobCheckoutSession,
  paymentsCorsPreflightHeaders,
  paymentsJsonResponse,
  createEscrowCheckoutSession,
} from "@/lib/stripePayments.server";
import { parseClientCheckoutApiBody } from "@/lib/paymentsApiValidation";
import { guardIpRateLimit, IP_RATE_LIMITS } from "@/lib/rateLimit.server";
import { ZodError } from "zod";

export const Route = createFileRoute("/api/public/payments/client-checkout")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: paymentsCorsPreflightHeaders(request) }),
      POST: async ({ request }) => {
        const limited = guardIpRateLimit(request, IP_RATE_LIMITS.clientCheckout);
        if (limited) return limited;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return paymentsJsonResponse(request, { error: "Invalid JSON" }, 400);
        }

        let parsed;
        try {
          parsed = parseClientCheckoutApiBody(body);
        } catch (e) {
          const message = e instanceof ZodError ? e.issues[0]?.message : "Invalid input";
          return paymentsJsonResponse(request, { error: message ?? "Invalid input" }, 400);
        }

        const paymentType = parsed.paymentType ?? "deposit";
        const environment = parsed.environment === "live" ? "live" : "sandbox";

        if (paymentType === "escrow") {
          const result = await createEscrowCheckoutSession({
            portalToken: parsed.token,
            environment,
            successUrl: parsed.successUrl,
            cancelUrl: parsed.cancelUrl,
          });
          if ("error" in result) {
            return paymentsJsonResponse(request, result, 400);
          }
          return paymentsJsonResponse(request, result);
        }

        const result = await createClientJobCheckoutSession({
          shareToken: parsed.token,
          paymentType: paymentType as "deposit" | "final",
          environment,
          successUrl: parsed.successUrl,
          cancelUrl: parsed.cancelUrl,
        });

        if ("error" in result) {
          return paymentsJsonResponse(request, result, 400);
        }
        return paymentsJsonResponse(request, result);
      },
    },
  },
});
