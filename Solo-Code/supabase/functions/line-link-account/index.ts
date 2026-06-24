/**
 * Deprecated — use line-connect with OAuth/id_token verification instead.
 * Raw line_user_id binding allowed hijacking; this endpoint is intentionally disabled.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return json(
    {
      error: "deprecated",
      message: "Use line-connect with OAuth or LIFF id_token instead of line_user_id.",
    },
    410,
  );
});
