import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateBearerToken,
  processCashoutTransferForAdmin,
  paymentsJsonResponse,
  paymentsCorsPreflightHeaders,
} from "@/lib/stripePayments.server";
import { parseCashoutProcessApiBody } from "@/lib/paymentsApiValidation";
import { guardIpRateLimit, IP_RATE_LIMITS } from "@/lib/rateLimit.server";
import { ZodError } from "zod";

export const Route = createFileRoute("/api/payments/cashout/process")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: paymentsCorsPreflightHeaders(request) }),
      POST: async ({ request }) => {
        const limited = guardIpRateLimit(request, IP_RATE_LIMITS.cashoutProcess);
        if (limited) return limited;

        const auth = await authenticateBearerToken(request);
        if ("error" in auth) {
          return paymentsJsonResponse(request, { error: auth.error }, auth.status);
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return paymentsJsonResponse(request, { error: "Invalid JSON" }, 400);
        }

        let parsed;
        try {
          parsed = parseCashoutProcessApiBody(body);
        } catch (e) {
          const message = e instanceof ZodError ? e.issues[0]?.message : "Invalid input";
          return paymentsJsonResponse(request, { error: message ?? "Invalid input" }, 400);
        }

        const result = await processCashoutTransferForAdmin({
          adminUserId: auth.userId,
          cashoutId: parsed.cashoutId,
          environment: parsed.environment === "live" ? "live" : "sandbox",
        });

        if ("error" in result) {
          return paymentsJsonResponse(request, result, 400);
        }
        return paymentsJsonResponse(request, result);
      },
    },
  },
});
