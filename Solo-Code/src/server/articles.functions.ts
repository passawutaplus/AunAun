import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ARTICLE_CATEGORIES, slugify, stripHtml } from "@/lib/articleHelpers";

const ArticleInput = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  summary: z.string().max(400).default(""),
  content: z.string().max(60_000).default(""),
  category: z.enum(ARTICLE_CATEGORIES),
  featured_image: z.string().url().max(2048).optional().nullable(),
  featured_image_alt: z.string().max(200).optional().nullable(),
  meta_title: z.string().max(70).optional().nullable(),
  meta_description: z.string().max(180).optional().nullable(),
  related_feature_link: z
    .string()
    .max(300)
    .refine(
      (v) => {
        if (!v) return true;
        if (v.startsWith("/")) return true; // internal app route
        try {
          const u = new URL(v);
          return u.protocol === "http:" || u.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "ลิงก์ต้องเป็น http(s) หรือ path ภายในเริ่มด้วย /" },
    )
    .optional()
    .nullable(),
  status: z.enum(["draft", "published"]).default("draft"),
});

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(`Role check failed: ${error.message}`);
  if (!data) throw new Error("Access denied: admin only");
}

/* ----------------------------- PUBLIC READS ----------------------------- */

export const listPublishedArticles = createServerFn({ method: "GET" })
  .inputValidator((data: { limit?: number; category?: string; q?: string } | undefined) => {
    return z
      .object({
        limit: z.number().int().min(1).max(50).optional().default(50),
        category: z.string().max(40).optional(),
        q: z.string().max(120).optional(),
      })
      .parse(data ?? {});
  })
  .handler(async ({ data }) => {
    let query = supabaseAdmin
      .from("articles")
      .select(
        "id,slug,title,summary,category,featured_image,featured_image_alt,published_at,view_count",
      )
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(data.limit);

    if (data.category && data.category !== "all") {
      query = query.eq("category", data.category);
    }
    if (data.q && data.q.trim()) {
      const term = data.q.trim().replace(/[%_]/g, "");
      query = query.or(`title.ilike.%${term}%,summary.ilike.%${term}%`);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { articles: rows ?? [] };
  });

export const getArticleBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(120) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("articles")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { article: row };
  });

export const incrementArticleView = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(120) }).parse(data),
  )
  .handler(async ({ data }) => {
    await supabaseAdmin.rpc("increment_article_view", { _slug: data.slug });
    return { ok: true };
  });

/** Used by sitemap.xml — only published slugs + lastmod */
export const listArticleSitemap = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("articles")
    .select("slug,published_at,updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return { articles: data ?? [] };
});

/* ----------------------------- ADMIN WRITES ----------------------------- */

export const adminListArticles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("articles")
      .select(
        "id,slug,title,summary,category,status,published_at,updated_at,view_count,featured_image",
      )
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { articles: data ?? [] };
  });

export const adminGetArticle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("articles")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { article: row };
  });

export const adminUpsertArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ArticleInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const slug = slugify(data.slug || data.title);
    if (!slug) throw new Error("Invalid slug");

    // Auto-derive meta defaults if missing
    const meta_title = (data.meta_title?.trim() || data.title).slice(0, 70);
    const meta_description = (
      data.meta_description?.trim() ||
      data.summary?.trim() ||
      stripHtml(data.content).slice(0, 180)
    ).slice(0, 180);

    const payload = {
      slug,
      title: data.title.trim(),
      summary: data.summary?.trim() ?? "",
      content: data.content,
      category: data.category,
      featured_image: data.featured_image || null,
      featured_image_alt: data.featured_image_alt || null,
      meta_title,
      meta_description,
      related_feature_link: data.related_feature_link || null,
      status: data.status,
      published_at: data.status === "published" ? new Date().toISOString() : null,
      author_user_id: context.userId,
    };

    if (data.id) {
      // On update, preserve original published_at if already published
      const { data: prev } = await supabaseAdmin
        .from("articles")
        .select("published_at,status")
        .eq("id", data.id)
        .maybeSingle();
      const preservedPublishedAt =
        prev?.status === "published" && prev?.published_at
          ? prev.published_at
          : payload.published_at;

      const { data: updated, error } = await supabaseAdmin
        .from("articles")
        .update({ ...payload, published_at: preservedPublishedAt })
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { article: updated };
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("articles")
      .insert(payload)
      .select()
      .single();
    if (error) {
      // Friendlier error for slug conflicts
      if (/duplicate key/i.test(error.message)) {
        throw new Error("Slug นี้มีอยู่แล้ว — กรุณาเลือก slug อื่น");
      }
      throw new Error(error.message);
    }
    return { article: inserted };
  });

export const adminDeleteArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("articles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
