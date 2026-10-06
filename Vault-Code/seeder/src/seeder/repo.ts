import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AdapterKey, Candidate, SourceKey } from "./adapters/types";
import { PHASH_MAX_DISTANCE, STORAGE_BUCKET, visionPricing } from "./config";
import { bangkokDayStartIso, capLimits, stopReason, type CapUsage, type StopReason } from "./caps";
import type { RejectReason } from "./license";

export type AiSpend = {
  totalUsd: number;
  monthUsd: number;
  /** Images with recorded token usage. */
  tracked: number;
  /** Analyzed images from before tracking existed (cost estimated from the average). */
  untracked: number;
  avgUsd: number;
  estimatedLegacyUsd: number;
  bySource: Record<string, number>;
};

export type SeedTarget = {
  category: string;
  source: AdapterKey;
  query: string;
  target_count: number;
  cursor: number;
  exhausted: boolean;
  enabled: boolean;
  scanned_count: number;
  skipped_count: number;
  last_run_at: string | null;
};

export type CategoryProgress = {
  category: string;
  target_count: number;
  published: number;
  pending: number;
  rejected: number;
};

export type AdminItem = {
  id: string;
  source: SourceKey;
  source_id: string;
  source_url: string;
  original_image_url: string;
  title: string;
  category: string;
  ai_category: string | null;
  reject_reason: string | null;
  image_sm_path: string | null;
  attribution: string;
  source_meta: Record<string, unknown>;
  updated_at: string;
};

export function publicMediaUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

export type RejectExtra = {
  phash?: string;
  sha256?: string;
  width?: number;
  height?: number;
  duplicateOf?: string;
  note?: string;
};

export type PublishRow = {
  candidate: Candidate;
  category: string;
  phash: string;
  sha256?: string;
  width: number;
  height: number;
  blurhash: string;
  paths: { sm: string; md: string; lg: string };
  /** "review" rows keep their renditions so a human can approve them later. */
  status: "published" | "review";
  passport: {
    tagsJson: unknown[];
    tagsIds: string[];
    palette: unknown[];
    metrics: unknown;
    quality: number;
    enrichLevel: number;
    statusReason: string;
    layerB: { era: string | null; culture_region: string | null; medium: string | null; institution: string | null; year: number | null };
    altText: { alt_text_th: string | null; alt_text_en: string | null };
    /** Open keywords for the current Discover keyword UI: English labels of confident tags + AI keywords. */
    openKeywords: string[];
    style: string;
    /** Palette hexes for the current Discover colour UI (now computed from pixels). */
    colors: string[];
  };
};

export interface SeederRepo {
  existingSourceIds(source: SourceKey, ids: string[]): Promise<Set<string>>;
  recordRejected(c: Candidate, category: string, reason: RejectReason, extra?: RejectExtra): Promise<void>;
  findSimilar(phash: string): Promise<string | null>;
  /** True when the image (identical bytes or a near-identical perceptual hash) was taken down before. Optional so test doubles stay small. */
  isBlocked?(sha256: string, phash: string): Promise<boolean>;
  uploadRendition(path: string, data: Buffer): Promise<void>;
  publish(row: PublishRow): Promise<void>;
  categories(): Promise<string[]>;
}

let cached: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}

function baseRow(c: Candidate, category: string) {
  return {
    source: c.source,
    source_id: c.sourceId,
    source_url: c.sourceUrl,
    original_image_url: c.originalImageUrl,
    title: c.title,
    license: c.license,
    license_url: c.licenseUrl,
    attribution: c.attribution,
    attribution_json: c.attributionJson,
    delivery_mode: "rehosted",
    category,
    source_meta: c.sourceMeta,
  };
}

function fail(context: string, error: { message: string } | null): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export class SupabaseSeederRepo implements SeederRepo {
  constructor(private readonly db: SupabaseClient = serviceClient()) {}

  async existingSourceIds(source: SourceKey, ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const { data, error } = await this.db.from("discover_items").select("source_id").eq("source", source).in("source_id", ids);
    fail("existingSourceIds", error);
    return new Set((data ?? []).map((r) => r.source_id as string));
  }

  async recordRejected(c: Candidate, category: string, reason: RejectReason, extra: RejectExtra = {}): Promise<void> {
    const { error } = await this.db.from("discover_items").upsert(
      {
        ...baseRow(c, category),
        status: "rejected",
        reject_reason: reason,
        phash: extra.phash ?? null,
        sha256: extra.sha256 ?? null,
        width: extra.width ?? null,
        height: extra.height ?? null,
        duplicate_of: extra.duplicateOf ?? null,
        source_meta: extra.note ? { ...c.sourceMeta, reject_note: extra.note.slice(0, 300) } : c.sourceMeta,
      },
      { onConflict: "source,source_id" },
    );
    fail("recordRejected", error);
  }

  async isBlocked(sha256: string, phash: string): Promise<boolean> {
    const { data, error } = await this.db.rpc("image_is_blocked", { p_sha: sha256, p_phash: phash, p_max: PHASH_MAX_DISTANCE });
    fail("isBlocked", error);
    return data === true;
  }

  async findSimilar(phash: string): Promise<string | null> {
    const { data, error } = await this.db.rpc("discover_find_similar", { p_phash: phash, p_max_distance: PHASH_MAX_DISTANCE });
    fail("findSimilar", error);
    const rows = (data ?? []) as { id: string; distance: number }[];
    return rows[0]?.id ?? null;
  }

  async uploadRendition(path: string, data: Buffer): Promise<void> {
    const { error } = await this.db.storage.from(STORAGE_BUCKET).upload(path, data, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    });
    fail(`uploadRendition ${path}`, error);
  }

  async publish(row: PublishRow): Promise<void> {
    const { error } = await this.db.from("discover_items").upsert(
      {
        ...baseRow(row.candidate, row.category),
        status: row.status,
        reject_reason: null,
        phash: row.phash,
        sha256: row.sha256 ?? null,
        width: row.width,
        height: row.height,
        blurhash: row.blurhash,
        image_sm_path: row.paths.sm,
        image_md_path: row.paths.md,
        image_lg_path: row.paths.lg,
        ai_category: row.category,
        tags: row.passport.openKeywords,
        style: row.passport.style,
        colors: row.passport.colors,
        tags_json: row.passport.tagsJson,
        tags_ids: row.passport.tagsIds,
        palette: row.passport.palette,
        metrics: row.passport.metrics,
        quality_score: row.passport.quality,
        enrich_level: row.passport.enrichLevel,
        status_reason: row.passport.statusReason,
        alt_text_th: row.passport.altText.alt_text_th,
        alt_text_en: row.passport.altText.alt_text_en,
        ...row.passport.layerB,
        last_checked_at: new Date().toISOString(),
        published_at: row.status === "published" ? new Date().toISOString() : null,
        legacy_published: false,
      },
      { onConflict: "source,source_id" },
    );
    fail("publish", error);
  }

  async categories(): Promise<string[]> {
    const { data, error } = await this.db.from("seed_targets").select("category").eq("enabled", true);
    fail("categories", error);
    return [...new Set((data ?? []).map((r) => r.category as string))].sort();
  }

  async flags(): Promise<{ paused: boolean; killSwitch: boolean }> {
    const { data, error } = await this.db.from("seeder_control").select("paused, kill_switch").eq("id", true).maybeSingle();
    fail("flags", error);
    return { paused: data?.paused ?? true, killSwitch: data?.kill_switch ?? false };
  }

  async setKillSwitch(on: boolean): Promise<void> {
    const { error } = await this.db.from("seeder_control").upsert({ id: true, kill_switch: on }, { onConflict: "id" });
    fail("setKillSwitch", error);
  }

  /** Counters for the daily/monthly caps. AI calls = rows with recorded vision usage. */
  async capUsage(): Promise<CapUsage> {
    const dayStart = bangkokDayStartIso();
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { inPerM, outPerM } = visionPricing();
    const { count: itemsToday, error: e1 } = await this.db.from("discover_items").select("id", { count: "exact", head: true }).gte("created_at", dayStart);
    fail("capUsage.items", e1);
    const { count: aiCallsToday, error: e2 } = await this.db
      .from("discover_items")
      .select("id", { count: "exact", head: true })
      .gte("created_at", dayStart)
      .not("source_meta->ai_usage", "is", null);
    fail("capUsage.ai", e2);
    let monthUsd = 0;
    for (let from = 0; ; from += 1000) {
      const { data, error } = await this.db
        .from("discover_items")
        .select("ai_usage:source_meta->ai_usage")
        .gte("created_at", monthStart.toISOString())
        .not("source_meta->ai_usage", "is", null)
        .range(from, from + 999);
      fail("capUsage.month", error);
      const rows = (data ?? []) as unknown as { ai_usage: { input_tokens?: number; output_tokens?: number } | null }[];
      for (const r of rows) monthUsd += (Number(r.ai_usage?.input_tokens ?? 0) * inPerM + Number(r.ai_usage?.output_tokens ?? 0) * outPerM) / 1_000_000;
      if (rows.length < 1000) break;
    }
    // Calls that were billed but never stored on an item (errors, early test runs) are invisible here; add the gap seen on the provider's Cost page.
    const adjust = Number.parseFloat(process.env.SEEDER_SPEND_ADJUST_USD ?? "");
    if (Number.isFinite(adjust) && adjust > 0) monthUsd += adjust;
    return { itemsToday: itemsToday ?? 0, aiCallsToday: aiCallsToday ?? 0, monthUsd };
  }

  /** Why seeding must stop right now (kill switch, pause, or a cap), or null. Reported by the job and the admin page. */
  async stopReason(): Promise<{ reason: StopReason; usage: CapUsage }> {
    const [flags, usage] = await Promise.all([this.flags(), this.capUsage()]);
    return { reason: stopReason(flags, usage, capLimits(process.env.SEEDER_BUDGET_USD)), usage };
  }

  async isPaused(): Promise<boolean> {
    const { data, error } = await this.db.from("seeder_control").select("paused").eq("id", true).maybeSingle();
    fail("isPaused", error);
    return data?.paused ?? true;
  }

  async setPaused(paused: boolean): Promise<void> {
    const { error } = await this.db.from("seeder_control").upsert({ id: true, paused }, { onConflict: "id" });
    fail("setPaused", error);
  }

  async progress(): Promise<CategoryProgress[]> {
    const { data, error } = await this.db.rpc("discover_category_progress");
    fail("progress", error);
    return (data ?? []) as CategoryProgress[];
  }

  async targets(): Promise<SeedTarget[]> {
    const { data, error } = await this.db.from("seed_targets").select("*").order("category").order("source");
    fail("targets", error);
    return (data ?? []) as SeedTarget[];
  }

  async target(category: string, source: AdapterKey): Promise<SeedTarget | null> {
    const { data, error } = await this.db
      .from("seed_targets")
      .select("*")
      .eq("category", category)
      .eq("source", source)
      .maybeSingle();
    fail("target", error);
    return (data as SeedTarget | null) ?? null;
  }

  async rejectSummary(): Promise<{ reject_reason: string; source: string; total: number }[]> {
    const { data, error } = await this.db.rpc("discover_reject_summary");
    fail("rejectSummary", error);
    return (data ?? []) as { reject_reason: string; source: string; total: number }[];
  }

  /** Vision API spend, summed from the token usage the pipeline stores in source_meta.ai_usage. */
  async aiSpend(): Promise<AiSpend> {
    const { inPerM, outPerM } = visionPricing();
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const cost = (i: number, o: number) => (i * inPerM + o * outPerM) / 1_000_000;

    let totalUsd = 0;
    let monthUsd = 0;
    let tracked = 0;
    const bySource: Record<string, number> = {};
    for (let from = 0; ; from += 1000) {
      const { data, error } = await this.db
        .from("discover_items")
        .select("source, created_at, ai_usage:source_meta->ai_usage")
        .not("source_meta->ai_usage", "is", null)
        .order("created_at", { ascending: true })
        .range(from, from + 999);
      fail("aiSpend", error);
      const rows = (data ?? []) as unknown as { source: string; created_at: string; ai_usage: { input_tokens?: number; output_tokens?: number } | null }[];
      for (const r of rows) {
        const usd = cost(Number(r.ai_usage?.input_tokens ?? 0), Number(r.ai_usage?.output_tokens ?? 0));
        tracked++;
        totalUsd += usd;
        bySource[r.source] = (bySource[r.source] ?? 0) + usd;
        if (new Date(r.created_at) >= monthStart) monthUsd += usd;
      }
      if (rows.length < 1000) break;
    }

    // Rows analyzed before usage tracking existed: published + AI-stage rejects without ai_usage.
    const { count: analyzed, error: e2 } = await this.db
      .from("discover_items")
      .select("id", { count: "exact", head: true })
      .or("status.eq.published,reject_reason.in.(moderation_blocked,ai_invalid_output)");
    fail("aiSpend.analyzed", e2);
    const untracked = Math.max(0, (analyzed ?? 0) - tracked);
    const avg = tracked > 0 ? totalUsd / tracked : cost(1600, 250);
    return { totalUsd, monthUsd, tracked, untracked, avgUsd: avg, estimatedLegacyUsd: untracked * avg, bySource };
  }

  async recentItems(status: "published" | "rejected" | "hidden", limit: number): Promise<AdminItem[]> {
    const { data, error } = await this.db
      .from("discover_items")
      .select("id, source, source_id, source_url, original_image_url, title, category, ai_category, reject_reason, image_sm_path, attribution, source_meta, updated_at")
      .eq("status", status)
      .order("updated_at", { ascending: false })
      .limit(limit);
    fail("recentItems", error);
    return (data ?? []) as AdminItem[];
  }

  async setItemStatus(id: string, status: "published" | "hidden"): Promise<void> {
    const { error } = await this.db
      .from("discover_items")
      .update({ status })
      .eq("id", id)
      .in("status", status === "hidden" ? ["published"] : ["hidden"]);
    fail("setItemStatus", error);
  }

  async updateTarget(category: string, source: AdapterKey, patch: { target_count?: number; enabled?: boolean; exhausted?: boolean }): Promise<void> {
    const { error } = await this.db.from("seed_targets").update(patch).eq("category", category).eq("source", source);
    fail("updateTarget", error);
  }

  /** Callers are serialized per source (Inngest concurrency), so read-modify-write is safe here. */
  async recordBatch(
    category: string,
    source: AdapterKey,
    batch: { fromCursor: number; nextCursor: number | null; scanned: number; skipped: number },
  ): Promise<void> {
    const current = await this.target(category, source);
    if (!current) return;
    const patch: Partial<SeedTarget> = {
      scanned_count: current.scanned_count + batch.scanned,
      skipped_count: current.skipped_count + batch.skipped,
      last_run_at: new Date().toISOString(),
    };
    if (batch.nextCursor === null) patch.exhausted = true;
    else if (batch.nextCursor > current.cursor) patch.cursor = batch.nextCursor;
    const { error } = await this.db.from("seed_targets").update(patch).eq("category", category).eq("source", source);
    fail("recordBatch", error);
  }
}
