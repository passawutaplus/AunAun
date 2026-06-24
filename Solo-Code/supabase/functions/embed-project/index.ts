import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { geminiEmbedText, getGeminiApiKey } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BodySchema = z.object({ project_id: z.string().uuid() });

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function embed(text: string): Promise<number[]> {
  return geminiEmbedText(getGeminiApiKey(), text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims, error: authErr } = await userClient.auth.getClaims(
    authHeader.slice("Bearer ".length),
  );
  if (authErr || !claims?.claims?.sub) return json({ error: "unauthorized" }, 401);
  const uid = claims.claims.sub as string;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const { project_id } = parsed.data;

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: project, error } = await admin
      .from("projects")
      .select("id, owner_id, title, subtitle, description, category, tags, tools")
      .eq("id", project_id)
      .maybeSingle();
    if (error || !project) return json({ error: "project not found" }, 404);

    // Only owner or admin may trigger a (possibly expensive) re-embed.
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (project.owner_id !== uid && !isAdmin) return json({ error: "forbidden" }, 403);

    const text = [
      project.title,
      project.subtitle ?? "",
      project.category,
      project.description ?? "",
      (project.tags ?? []).join(", "),
      (project.tools ?? []).join(", "),
    ]
      .filter(Boolean)
      .join("\n");

    const vec = await embed(text);
    const { error: upErr } = await admin
      .from("projects")
      .update({ embedding: vec as unknown as string })
      .eq("id", project_id);
    if (upErr) throw upErr;

    return json({ ok: true, dims: vec.length });
  } catch {
    return json({ error: "internal error" }, 500);
  }
});
