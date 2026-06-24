import { createFileRoute } from "@tanstack/react-router";
import { runDeadlineReminders } from "@/lib/email/deadlineReminders.server";
import { authorizeCronBearer } from "@/lib/cronAuth.server";
import { toClientError } from "@/lib/security";

export const Route = createFileRoute("/api/public/cron/deadline-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = authorizeCronBearer(request);
        if (authError) return authError;

        try {
          const result = await runDeadlineReminders();
          return Response.json({ ok: true, ...result });
        } catch (e) {
          console.error("[cron/deadline-reminders]", e);
          return Response.json({ error: toClientError(e) }, { status: 500 });
        }
      },
    },
  },
});
