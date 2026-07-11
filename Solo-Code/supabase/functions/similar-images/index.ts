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

type ProjectRow = {
  id: string;
  title: string;
  category: string;
  owner_id: string;
  gallery_urls?: string[] | null;
  cover_url?: string | null;
  tags?: string[] | null;
  tools?: string[] | null;
  description?: string | null;
  subtitle?: string | null;
  embedding?: unknown;
  status?: string;
};

function pickImage(m: ProjectRow): string | null {
  const urls = m.gallery_urls ?? [];
  return (urls[0] || m.cover_url || "").trim() || null;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

function metaTokens(p: ProjectRow): Set<string> {
  const parts = [
    p.title,
    p.subtitle ?? "",
    p.category,
    p.description ?? "",
    ...(p.tags ?? []),
    ...(p.tools ?? []),
  ]
    .join(" ")
    .toLowerCase()
    .split(/[\s,./|#()[\]{}:;'"!?+\-]+/)
    .filter((t) => t.length >= 2);
  return new Set(parts);
}

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
    raw = await req.json();
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
    const seenProjects = new Set<string>();
    const seenUrls = new Set<string>();

    const pushUnique = (item: SimilarItem) => {
      const urlKey = item.image_url.trim().toLowerCase();
      if (!urlKey || seenProjects.has(item.project_id) || seenUrls.has(urlKey)) return;
      seenProjects.add(item.project_id);
      seenUrls.add(urlKey);
      images.push(item);
    };

    if (mode === "image") {
      const { data: candidates } = await admin
        .from("projects")
        .select("id, title, category, owner_id, gallery_urls, cover_url, tags, tools, description")
        .eq("status", "Published")
        .neq("id", project_id)
        .limit(120);

      const srcTokens = metaTokens(project as ProjectRow);
      const srcTags = new Set<string>(
        [...(project.tags ?? []), ...(project.tools ?? [])].map((t: string) => t.toLowerCase()),
      );

      const scored = (candidates ?? []).map((m: ProjectRow) => {
        const mt = new Set<string>(
          [...(m.tags ?? []), ...(m.tools ?? [])].map((t) => t.toLowerCase()),
        );
        const tagScore = jaccard(srcTags, mt);
        const textScore = jaccard(srcTokens, metaTokens(m));
        const catBoost = m.category && m.category === project.category ? 0.2 : 0;
        return { m, score: Math.min(1, tagScore * 0.45 + textScore * 0.35 + catBoost) };
      });
      scored.sort((a, b) => b.score - a.score);

      for (const { m, score } of scored) {
        if (score < 0.08) continue;
        const pick = pickImage(m);
        if (!pick) continue;
        pushUnique({
          project_id: m.id,
          title: m.title,
          category: m.category,
          owner_id: m.owner_id,
          image_url: pick,
          similarity: score,
        });
        if (images.length >= 30) break;
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
        _limit: 40,
      });
      if (mErr) throw mErr;

      for (const m of matches ?? []) {
        const pick = pickImage(m as ProjectRow);
        if (!pick) continue;
        pushUnique({
          project_id: m.id,
          title: m.title,
          category: m.category,
          owner_id: m.owner_id,
          image_url: pick,
          similarity: Math.max(0, Math.min(1, Number(m.similarity) || 0)),
        });
        if (images.length >= 30) break;
      }
    }

    if (images.length === 0) {
      const { data: fallback } = await admin
        .from("projects")
        .select("id, title, category, owner_id, gallery_urls, cover_url, tags, tools")
        .eq("status", "Published")
        .eq("category", project.category)
        .neq("id", project_id)
        .limit(40);
      const srcTags = new Set<string>(
        [...(project.tags ?? []), ...(project.tools ?? [])].map((t: string) => t.toLowerCase()),
      );
      for (const m of (fallback ?? []) as ProjectRow[]) {
        const pick = pickImage(m);
        if (!pick) continue;
        const mt = new Set<string>(
          [...(m.tags ?? []), ...(m.tools ?? [])].map((t) => t.toLowerCase()),
        );
        pushUnique({
          project_id: m.id,
          title: m.title,
          category: m.category,
          owner_id: m.owner_id,
          image_url: pick,
          similarity: Math.max(0.05, jaccard(srcTags, mt) * 0.5),
        });
        if (images.length >= 30) break;
      }
    }

    return json(req, { images });
  } catch {
    return json(req, { error: "internal error", images: [] }, 500);
  }
});
