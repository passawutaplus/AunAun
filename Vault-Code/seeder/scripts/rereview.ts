/**
 * Re-applies the CURRENT publish rules (config/engine.json) to items waiting in review, and publishes the ones that now pass.
 * Safety-flagged items are never touched (the pipeline already rejects those). Prints counts only.
 * Usage: node --env-file=.env.local --import tsx scripts/rereview.ts [--dry]
 */
import { createClient } from "@supabase/supabase-js";
import { cfg, isPassportComplete, publishDecision } from "../src/seeder/engine";

async function main() {
  const dry = process.argv.includes("--dry");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await db
    .from("discover_items")
    .select("id,title,source_url,attribution,license,license_url,width,height,blurhash,phash,image_sm_path,image_md_path,image_lg_path,palette,quality_score,tags_json,tags_ids")
    .eq("status", "review");
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  let promote = 0;
  const reasons: Record<string, number> = {};
  for (const r of rows) {
    const decision = publishDecision(
      { quality: r.quality_score, safetyFlag: false, tagsJson: r.tags_json ?? [], passportComplete: isPassportComplete(r) },
      cfg,
    );
    if (decision.status !== "published") {
      reasons[decision.reason.replace(/\d+/g, "N")] = (reasons[decision.reason.replace(/\d+/g, "N")] ?? 0) + 1;
      continue;
    }
    promote++;
    if (!dry) {
      const { error: e } = await db
        .from("discover_items")
        .update({ status: "published", status_reason: "ok", published_at: new Date().toISOString() })
        .eq("id", r.id);
      if (e) console.log(`  could not publish ${r.id}: ${e.message.slice(0, 120)}`);
    }
  }
  console.log(`${dry ? "[dry] " : ""}review rows=${rows.length} now publishable=${promote}`);
  console.log("still waiting:", JSON.stringify(reasons));
}

main().catch((err) => {
  console.error(String(err?.message || err).slice(0, 300));
  process.exit(1);
});
