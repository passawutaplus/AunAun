import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { geminiEmbedText, getGeminiApiKey } from "../_shared/gemini.ts";
import { corsHeadersForRequest } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BodySchema = z.object({
  project_id: z.string().uuid(),
  mode: z.enum(["ai", "image"]).optional(),
});

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

async function embed(text: string): Promise<number[]> {
  return geminiEmbedText(getGeminiApiKey(), text);
}

type SimilarItem = {
  project_id: string;
  title: string;
  category: string;
  owner_id: string;
  image_url: string;
  similarity: number;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  if (req.method !== "POST") return json(req, { error: "method not allowed" }, 405);

  // Auth required (any signed-in user) — prevents anonymous scraping & AI cost abuse.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(req, { error: "unauthorized" }, 401);
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims, error: authErr } = await userClient.auth.getClaims(
    authHeader.slice("Bearer ".length),
  );
  if (authErr || !claims?.claims?.sub) return json(req, { error: "unauthorized" }, 401);
  const callerId = claims.claims.sub as string;

  let raw: unknown;
  try {
    raw = await req.json(req);
  } catch {
    return json(req, { error: "invalid json" }, 400);
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return json(req, { error: parsed.error.flatten().fieldErrors }, 400);
  const { project_id } = parsed.data;
  const mode = parsed.data.mode ?? "ai";

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: project, error } = await admin
      .from("projects")
      .select(
        "id, title, subtitle, description, category, tags, tools, embedding, gallery_urls, cover_url, owner_id, status",
      )
      .eq("id", project_id)
      .maybeSingle();
    if (error || !project) return json(req, { error: "project not found", images: [] }, 404);
    if (project.status !== "Published" && project.owner_id !== callerId) {
      return json(req, { error: "forbidden", images: [] }, 403);
    }

    const images: SimilarItem[] = [];

    if (mode === "image") {
      const { data: candidates } = await admin
        .from("projects")
        .select("id, title, category, owner_id, gallery_urls, cover_url, tags, tools")
        .eq("status", "Published")
        .eq("category", project.category)
        .neq("id", project_id)
        .limit(60);

      const srcTags = new Set<string>([...(project.tags ?? []), ...(project.tools ?? [])]);
      const scored = (candidates ?? []).map((m) => {
        const mt = new Set<string>([...(m.tags ?? []), ...(m.tools ?? [])]);
        let overlap = 0;
        for (const t of mt) if (srcTags.has(t)) overlap += 1;
        return { m, score: overlap };
      });
      scored.sort((a, b) => b.score - a.score);

      for (const { m, score } of scored.slice(0, 30)) {
        const urls: string[] = m.gallery_urls ?? [];
        const pick = urls[0] || m.cover_url;
        if (!pick) continue;
        images.push({
          project_id: m.id,
          title: m.title,
          category: m.category,
          owner_id: m.owner_id,
          image_url: pick,
          similarity: score / Math.max(srcTags.size, 1),
        });
      }
    } else {
      let queryVec = project.embedding as unknown as number[] | null;
      if (!queryVec) {
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
        queryVec = await embed(text);
        if (project.owner_id === callerId) {
          await admin
            .from("projects")
            .update({ embedding: queryVec as unknown as string })
            .eq("id", project_id);
        }
      }

      const { data: matches, error: mErr } = await admin.rpc("match_similar_projects", {
        _query: queryVec as unknown as string,
        _exclude: project_id,
        _limit: 30,
      });
      if (mErr) throw mErr;

      for (const m of matches ?? []) {
        const urls: string[] = m.gallery_urls ?? [];
        const pick = urls[0] || m.cover_url;
        if (!pick) continue;
        images.push({
          project_id: m.id,
          title: m.title,
          category: m.category,
          owner_id: m.owner_id,
          image_url: pick,
          similarity: m.similarity,
        });
      }
    }

    if (images.length === 0) {
      const { data: fallback } = await admin
        .from("projects")
        .select("id, title, category, owner_id, gallery_urls, cover_url")
        .eq("status", "Published")
        .eq("category", project.category)
        .neq("id", project_id)
        .limit(30);
      for (const m of fallback ?? []) {
        const urls: string[] = m.gallery_urls ?? [];
        const pick = urls[0] || m.cover_url;
        if (!pick) continue;
        images.push({
          project_id: m.id,
          title: m.title,
          category: m.category,
          owner_id: m.owner_id,
          image_url: pick,
          similarity: 0,
        });
      }
    }

    return json(req, { images });
  } catch {
    return json(req, { error: "internal error", images: [] }, 500);
  }
});
