import { createFileRoute } from "@tanstack/react-router";
import { runDailyTrendsGeneration, todayISO } from "@/lib/dailyTrends.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authorizeCronBearer } from "@/lib/cronAuth.server";

export const Route = createFileRoute("/api/public/cron/fetch-daily-trends")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = authorizeCronBearer(request);
        if (authError) return authError;

        const date = todayISO();
        const force = new URL(request.url).searchParams.get("force") === "1";

        if (!force) {
          const { data: cached } = await supabaseAdmin
            .from("dashboard_daily_trends")
            .select("items")
            .eq("trend_date", date)
            .maybeSingle();

          if (cached && Array.isArray(cached.items) && cached.items.length > 0) {
            return Response.json({
              ok: true,
              skipped: true,
              date,
              itemCount: cached.items.length,
            });
          }
        }

        try {
          const result = await runDailyTrendsGeneration(force);
          return Response.json({
            ok: true,
            date: result.date,
            itemCount: result.items.length,
            status: result.status,
          });
        } catch (e) {
          console.error("[fetch-daily-trends] error:", e);
          return Response.json({ error: "Failed to generate trends" }, { status: 500 });
        }
      },
    },
  },
});
