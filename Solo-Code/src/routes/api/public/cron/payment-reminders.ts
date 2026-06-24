import { createFileRoute } from "@tanstack/react-router";
import { runPaymentReminders } from "@/lib/email/paymentReminders.server";
import { authorizeCronBearer } from "@/lib/cronAuth.server";
import { toClientError } from "@/lib/security";

export const Route = createFileRoute("/api/public/cron/payment-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = authorizeCronBearer(request);
        if (authError) return authError;

        try {
          const result = await runPaymentReminders();
          return Response.json({ ok: true, ...result });
        } catch (e) {
          console.error("[cron/payment-reminders]", e);
          return Response.json({ error: toClientError(e) }, { status: 500 });
        }
      },
    },
  },
});
