#!/usr/bin/env node
/** Seed 24 Designer Area community posts for demo catalog users. */
import { createClient } from "@supabase/supabase-js";
import { buildCommunitySeedPosts } from "../../scripts/ecosystem/community-posts-seed-data.mjs";
import { catalogUid } from "./demo-catalog-ids.mjs";
import { loadSeedEnv, getSupabaseClients } from "./seed-demo-env.mjs";

loadSeedEnv();
const { anthemDb } = getSupabaseClients(createClient);

async function main() {
  const posts = buildCommunitySeedPosts(catalogUid, "pixel100-community");
  const { error } = await anthemDb.from("community_posts").upsert(posts, { onConflict: "id" });
  if (error) throw new Error(error.message);
  console.log(`Community posts upserted: ${posts.length}`);
}

main().catch((e) => {
  console.error("Community seed failed:", e.message);
  process.exit(1);
});
