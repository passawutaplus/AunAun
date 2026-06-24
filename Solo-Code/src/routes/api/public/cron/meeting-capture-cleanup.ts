import { createFileRoute } from "@tanstack/react-router";
import { authorizeCronBearer } from "@/lib/cronAuth.server";
import { runMeetingCaptureCleanup } from "@/lib/meetingCaptureCleanup.server";
import { toClientError } from "@/lib/security";

export const Route = createFileRoute("/api/public/cron/meeting-capture-cleanup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = authorizeCronBearer(request);
        if (authError) return authError;

        try {
          const result = await runMeetingCaptureCleanup();
          return Response.json({ ok: true, ...result });
        } catch (e) {
          console.error("[cron/meeting-capture-cleanup]", e);
          return Response.json({ error: toClientError(e) }, { status: 500 });
        }
      },
    },
  },
});
