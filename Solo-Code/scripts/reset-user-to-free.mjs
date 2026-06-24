#!/usr/bin/env node
/**
 * Reset a user to Free tier for Stripe upgrade testing.
 *
 * Usage (from Solo-Code/):
 *   node scripts/reset-user-to-free.mjs
 *   RESET_EMAIL=you@example.com node scripts/reset-user-to-free.mjs
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const email = (process.env.RESET_EMAIL || process.env.GRANT_EMAIL || "passawut.a.plus@gmail.com")
  .trim()
  .toLowerCase();

if (!url || !key) {
  console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Solo-Code/.env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserIdByEmail(targetEmail) {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, email")
    .ilike("email", targetEmail)
    .maybeSingle();
  if (error) throw error;
  if (data?.user_id) return data.user_id;

  // Fallback when profile row missing
  let page = 1;
  while (page <= 20) {
    const { data: users, error: listErr } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (listErr) throw listErr;
    const hit = users.users.find((u) => u.email?.toLowerCase() === targetEmail);
    if (hit) return hit.id;
    if (users.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function main() {
  console.log("Reset to Free:", email);

  const userId = await findUserIdByEmail(email);
  if (!userId) {
    console.error("User not found");
    process.exit(1);
  }

  console.log("user_id:", userId);

  const { data: subsBefore } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, environment, status, price_id")
    .eq("user_id", userId);

  if (subsBefore?.length) {
    console.log(
      "Removing subscriptions:",
      subsBefore.map((s) => s.stripe_subscription_id).join(", "),
    );
    const { error: delErr } = await supabase.from("subscriptions").delete().eq("user_id", userId);
    if (delErr) throw delErr;
    console.log("✓ subscriptions deleted");
  } else {
    console.log("✓ no subscription rows");
  }

  const { error: profErr } = await supabase
    .from("profiles")
    .update({
      subscription_tier: "free",
      subscription_seats: 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (profErr) throw profErr;
  console.log("✓ profile tier → free");

  const { error: syncErr } = await supabase.rpc("sync_user_tier", { _user_id: userId });
  if (syncErr) console.warn("sync_user_tier:", syncErr.message);
  else console.log("✓ sync_user_tier");

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_seats, email")
    .eq("user_id", userId)
    .maybeSingle();

  const { count } = await supabase
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  console.log("\nDone:");
  console.log("  email:", profile?.email ?? email);
  console.log("  tier:", profile?.subscription_tier, "seats:", profile?.subscription_seats);
  console.log("  subscriptions remaining:", count ?? 0);
}

main().catch((e) => {
  console.error("Failed:", e.message ?? e);
  process.exit(1);
});
