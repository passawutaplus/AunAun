import type { SupabaseClient } from "@supabase/supabase-js";
import { bangkokDayStartIso, capLimits } from "../seeder/caps";
import { publicMediaUrl, serviceClient, SupabaseSeederRepo } from "../seeder/repo";
import { visionPricing } from "../seeder/config";
import { failingSources, healthDecision, HEALTH_HIDE_AFTER, type DailyStats, type LearningDigest } from "./logic";

type Row = Record<string, unknown>;

/** Service-role access for the ops jobs and the review/takedown admin pages. Server-side only. */
export class OpsRepo {
  constructor(private readonly db: SupabaseClient = serviceClient()) {}

  async logEvent(kind: string, severity: "info" | "warn" | "urgent", detail: Record<string, unknown> = {}): Promise<void> {
    await this.db.rpc("ops_log_event", { p_kind: kind, p_severity: severity, p_detail: detail });
  }

  /** Log at most once per `hours` for the same kind + key (caps and kill-switch events would otherwise repeat every batch). */
  async logEventOnce(kind: string, key: string, severity: "info" | "warn" | "urgent", detail: Record<string, unknown> = {}, hours = 12): Promise<void> {
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    const { data } = await this.db.from("ops_events").select("id").eq("kind", kind).eq("detail->>key", key).gte("created_at", since).limit(1);
    if (data && data.length) return;
    await this.logEvent(kind, severity, { ...detail, key });
  }

  async deadLetter(job: string, payload: unknown, error: string, attempts: number): Promise<void> {
    await this.db.from("dead_letters").insert({ job, payload: payload ?? null, error: error.slice(0, 500), attempts });
  }

  // ---------------------------------------------------------------- link health
  async itemsToCheck(limit: number, olderThanDays = 6): Promise<{ id: string; path: string; fail_count: number; hidden_by_health: boolean }[]> {
    const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString();
    const { data, error } = await this.db
      .from("discover_items")
      .select("id, image_sm_path, check_fail_count, status, status_reason, last_checked_at")
      .or("status.eq.published,and(status.eq.hidden,status_reason.like.link_health%)")
      .or(`last_checked_at.is.null,last_checked_at.lt.${cutoff}`)
      .not("image_sm_path", "is", null)
      .order("last_checked_at", { ascending: true, nullsFirst: true })
      .limit(limit);
    if (error) throw new Error(`itemsToCheck: ${error.message}`);
    return ((data ?? []) as Row[]).map((r) => ({
      id: String(r.id),
      path: String(r.image_sm_path),
      fail_count: Number(r.check_fail_count ?? 0),
      hidden_by_health: r.status === "hidden",
    }));
  }

  async recordHealth(item: { id: string; fail_count: number; hidden_by_health: boolean }, ok: boolean): Promise<"hidden" | "restored" | "ok" | "failing"> {
    const d = healthDecision(item.fail_count, ok, item.hidden_by_health, HEALTH_HIDE_AFTER);
    const patch: Row = { check_fail_count: d.failCount, last_checked_at: new Date().toISOString() };
    if (d.hide) {
      patch.status = "hidden";
      patch.status_reason = "link_health: image unreachable";
    } else if (d.restore) {
      patch.status = "published";
      patch.status_reason = "link_health: recovered";
    }
    const { error } = await this.db.from("discover_items").update(patch).eq("id", item.id);
    if (error) throw new Error(`recordHealth: ${error.message}`);
    return d.hide ? "hidden" : d.restore ? "restored" : ok ? "ok" : "failing";
  }

  async runRetention(): Promise<unknown> {
    const { data, error } = await this.db.rpc("ops_run_retention");
    if (error) throw new Error(`retention: ${error.message}`);
    return data;
  }

  // ---------------------------------------------------------------- review queue + takedown + taxonomy growth
  async reviewItems(limit = 40): Promise<{ id: string; title: string; source: string; source_url: string; category: string; quality_score: number | null; status_reason: string | null; image_sm_path: string | null; tags_json: unknown }[]> {
    const { data, error } = await this.db
      .from("discover_items")
      .select("id, title, source, source_url, category, quality_score, status_reason, image_sm_path, tags_json")
      .eq("status", "review")
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(`reviewItems: ${error.message}`);
    return (data ?? []) as never;
  }

  /** Approve = publish (the DB CHECK still enforces the passport rules; legacy flag lets a human override the tag count). */
  async approveReview(id: string, by: string): Promise<void> {
    const { error } = await this.db
      .from("discover_items")
      .update({ status: "published", status_reason: `approved by ${by}`, published_at: new Date().toISOString(), legacy_published: true })
      .eq("id", id)
      .eq("status", "review");
    if (error) throw new Error(`approveReview: ${error.message}`);
  }

  async rejectReview(id: string, by: string): Promise<void> {
    const { error } = await this.db
      .from("discover_items")
      .update({ status: "rejected", reject_reason: "low_quality", status_reason: `rejected by ${by}` })
      .eq("id", id)
      .eq("status", "review");
    if (error) throw new Error(`rejectReview: ${error.message}`);
  }

  async topUnknown(limit = 20): Promise<{ term: string; lang: string; count: number; last_seen: string; example_queries?: string[]; suggested_term_id?: string | null }[]> {
    const { data, error } = await this.db.from("unknown_terms").select("term, lang, count, last_seen, example_queries, suggested_term_id").eq("status", "new").order("count", { ascending: false }).limit(limit);
    if (error) throw new Error(`topUnknown: ${error.message}`);
    return (data ?? []) as never;
  }

  /** One-click "add as synonym of…": records a proposal; the owner exports it into docs/dictionary and rebuilds (never auto-added). */
  async proposeSynonym(term: string, lang: string, termId: string): Promise<void> {
    const { error } = await this.db.from("synonym_proposals").upsert({ term, lang, term_id: termId }, { onConflict: "term,lang,term_id" });
    if (error) throw new Error(`proposeSynonym: ${error.message}`);
    await this.db.from("unknown_terms").update({ status: "promoted" }).eq("term", term).eq("lang", lang);
  }

  async ignoreUnknown(term: string, lang: string): Promise<void> {
    await this.db.from("unknown_terms").update({ status: "ignored" }).eq("term", term).eq("lang", lang);
  }

  /** Permanent takedown: renditions removed from storage, the row stays as a tombstone so the seeder never re-imports it. */
  async deleteTakedown(id: string, by: string): Promise<{ title: string }> {
    const { data, error } = await this.db.from("discover_items").select("title, phash, sha256, image_sm_path, image_md_path, image_lg_path").eq("id", id).maybeSingle();
    if (error) throw new Error(`deleteTakedown: ${error.message}`);
    const paths = [data?.image_sm_path, data?.image_md_path, data?.image_lg_path].filter((p): p is string => typeof p === "string");
    if (paths.length) await this.db.storage.from("discover-media").remove(paths);
    const { error: e2 } = await this.db
      .from("discover_items")
      .update({ status: "rejected", reject_reason: "license_not_allowed", status_reason: `takedown deleted by ${by}`, image_sm_path: null, image_md_path: null, image_lg_path: null, published_at: null })
      .eq("id", id);
    if (e2) throw new Error(`deleteTakedown: ${e2.message}`);
    // Block the image for good: identical bytes and near-identical look can never be imported again (any source, any id).
    const sha256 = typeof data?.sha256 === "string" ? data.sha256 : null;
    const phash = typeof data?.phash === "string" ? data.phash : null;
    if (sha256 || phash) {
      const { error: e3 } = await this.db.from("image_blocks").insert({ sha256, phash, item_id: id, reason: "takedown" });
      if (e3 && e3.code !== "23505") throw new Error(`deleteTakedown block: ${e3.message}`);
    }
    return { title: String(data?.title ?? "") };
  }

  // ---------------------------------------------------------------- daily report
  async gatherDailyStats(day: string): Promise<DailyStats> {
    const since = bangkokDayStartIso(new Date(`${day}T05:00:00Z`));
    const count = async (build: (q: ReturnType<SupabaseClient["from"]>) => PromiseLike<{ count: number | null }>) => (await build(this.db.from("discover_items")) ).count ?? 0;
    const today = (q: ReturnType<SupabaseClient["from"]>) => q.select("id", { count: "exact", head: true }).gte("created_at", since);
    const fetched = await count((q) => today(q));
    const published = await count((q) => today(q).eq("status", "published"));
    const review = await count((q) => today(q).eq("status", "review"));
    const hidden = await count((q) => q.select("id", { count: "exact", head: true }).eq("status", "hidden").gte("updated_at", since));
    const reviewQueue = await count((q) => q.select("id", { count: "exact", head: true }).eq("status", "review"));

    const { data: rej } = await this.db.from("discover_items").select("reject_reason").eq("status", "rejected").gte("created_at", since).limit(2000);
    const rejected: Record<string, number> = {};
    for (const r of (rej ?? []) as Row[]) rejected[String(r.reject_reason ?? "unknown")] = (rejected[String(r.reject_reason ?? "unknown")] ?? 0) + 1;

    const { inPerM, outPerM } = visionPricing();
    const { data: usageRows } = await this.db.from("discover_items").select("ai_usage:source_meta->ai_usage").gte("created_at", since).not("source_meta->ai_usage", "is", null).limit(2000);
    let aiCostUsd = 0;
    for (const r of (usageRows ?? []) as unknown as { ai_usage: { input_tokens?: number; output_tokens?: number } }[]) aiCostUsd += (Number(r.ai_usage?.input_tokens ?? 0) * inPerM + Number(r.ai_usage?.output_tokens ?? 0) * outPerM) / 1_000_000;

    const seeder = new SupabaseSeederRepo(this.db);
    const [flags, usage] = await Promise.all([seeder.flags(), seeder.capUsage()]);

    const { data: ev } = await this.db.from("ops_events").select("kind, detail").gte("created_at", since).in("kind", ["cap", "kill_switch"]).limit(50);
    const capsReached = [...new Set(((ev ?? []) as Row[]).filter((e) => e.kind === "cap").map((e) => String((e.detail as Row)?.reason ?? "cap")))];

    const { data: dl } = await this.db.from("dead_letters").select("job, error").gte("created_at", since).limit(20);
    const failures = ((dl ?? []) as Row[]).map((f) => ({ job: String(f.job), error: String(f.error ?? "") }));

    const { data: targets } = await this.db.from("seed_targets").select("source, enabled");
    const enabled = [...new Set(((targets ?? []) as Row[]).filter((t) => t.enabled).map((t) => String(t.source)))];
    const lastPublished: Record<string, string | null> = {};
    for (const src of enabled) {
      const { data } = await this.db.from("discover_items").select("published_at").eq("source", src).eq("status", "published").order("published_at", { ascending: false }).limit(1);
      lastPublished[src] = ((data ?? [])[0] as Row | undefined)?.published_at ? String(((data ?? [])[0] as Row).published_at) : null;
    }

    const topUnknownTerms = (await this.topUnknown(8)).map((t) => ({ term: t.term, lang: t.lang, count: t.count }));

    let dsarDue: { id: string; due_at: string }[] = [];
    try {
      const soon = new Date(Date.now() + 7 * 86400000).toISOString();
      const { data } = await this.db.from("dsar_requests").select("id, due_at").neq("status", "done").lte("due_at", soon).order("due_at").limit(10);
      dsarDue = ((data ?? []) as Row[]).map((d) => ({ id: String(d.id), due_at: String(d.due_at) }));
    } catch {
      /* table arrives with phase 12 */
    }

    const { count: openReports } = await this.db.from("discover_reports").select("id", { count: "exact", head: true }).eq("status", "open");

    let userAiUsage: DailyStats["userAiUsage"];
    try {
      const month = new Date().toISOString().slice(0, 7) + "-01";
      const { data } = await this.db.from("user_ai_usage").select("count").eq("month", month);
      const rows = (data ?? []) as Row[];
      userAiUsage = { users: rows.length, calls: rows.reduce((n, r) => n + Number(r.count ?? 0), 0) };
    } catch {
      userAiUsage = undefined;
    }

    return {
      day, fetched, published, review, rejected, hidden, failures, aiCostUsd, aiCalls: usage.aiCallsToday, monthUsd: usage.monthUsd,
      monthlyBudgetUsd: capLimits(process.env.SEEDER_BUDGET_USD).monthlyAiUsd, capsReached, killSwitch: flags.killSwitch,
      failingSources: failingSources(enabled, lastPublished), topUnknownTerms, dsarDue, reviewQueue, openReports: openReports ?? 0, userAiUsage,
    };
  }

  /** Plain-SQL weekly digest (phase 10). Null when the function is missing or capture is off. */
  async learningDigest(days = 7): Promise<LearningDigest | null> {
    const { data, error } = await this.db.rpc("learning_digest", { p_days: days });
    return error ? null : (data as LearningDigest);
  }

  async saveReport(day: string, body: unknown, emailed: boolean): Promise<void> {
    const { error } = await this.db.from("ops_reports").upsert({ day, body, emailed_at: emailed ? new Date().toISOString() : null }, { onConflict: "day" });
    if (error) throw new Error(`saveReport: ${error.message}`);
  }

  async latestReports(limit = 7): Promise<{ day: string; body: { text?: string; alerts?: { severity: string; text: string }[] }; emailed_at: string | null }[]> {
    const { data } = await this.db.from("ops_reports").select("day, body, emailed_at").order("day", { ascending: false }).limit(limit);
    return (data ?? []) as never;
  }

  async recentEvents(limit = 30): Promise<{ id: number; kind: string; severity: string; detail: unknown; created_at: string }[]> {
    const { data } = await this.db.from("ops_events").select("id, kind, severity, detail, created_at").order("created_at", { ascending: false }).limit(limit);
    return (data ?? []) as never;
  }
}

export { publicMediaUrl };
