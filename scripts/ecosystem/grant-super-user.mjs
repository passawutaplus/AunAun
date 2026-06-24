#!/usr/bin/env node
/**
 * Grant admin + In-House tier to an existing user (ecosystem unified DB).
 *
 * Usage:
 *   GRANT_EMAIL=passawut.a.plus@gmail.com node scripts/ecosystem/grant-super-user.mjs
 *
 * Env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from Solo-Code/.env
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const envPaths = [
  join(root, "Solo-Code", ".env"),
  join(root, "scripts", "ecosystem", ".env.seed.local"),
];

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

for (const p of envPaths) loadEnv(p);

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const email = (process.env.GRANT_EMAIL || "passawut.a.plus@gmail.com").trim().toLowerCase();
const seats = Number(process.env.GRANT_SEATS || "10");

if (!url || !key) {
  console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(targetEmail) {
  let page = 1;
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === targetEmail);
    if (hit) return hit;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function main() {
  console.log("Grant super user:", email);

  const user = await findUserByEmail(email);
  if (!user) {
    console.error("User not found — สมัครบัญชีด้วยอีเมลนี้ก่อน แล้วรันสคริปต์อีกครั้ง");
    process.exit(1);
  }

  const userId = user.id;
  console.log("user_id:", userId);

  const { error: roleErr } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
  if (roleErr) throw roleErr;
  console.log("✓ admin role");

  const periodEnd = new Date();
  periodEnd.setFullYear(periodEnd.getFullYear() + 5);
  const subId = `manual_inhouse_${userId}`;

  const { error: subErr } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subId,
      stripe_customer_id: `manual_${userId}`,
      product_id: "manual_inhouse",
      price_id: "inhouse_monthly",
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      environment: "sandbox",
      seat_quantity: seats,
    },
    { onConflict: "stripe_subscription_id" },
  );
  if (subErr) throw subErr;
  console.log("✓ inhouse subscription (sandbox)");

  const { error: profErr } = await supabase
    .from("profiles")
    .update({
      email,
      subscription_tier: "inhouse",
      subscription_seats: seats,
      tester_approved: true,
      onboarding_completed: true,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (profErr) throw profErr;
  console.log("✓ profile tier inhouse + tester_approved");

  const { error: syncErr } = await supabase.rpc("sync_user_tier", { _user_id: userId });
  if (syncErr) console.warn("sync_user_tier:", syncErr.message);
  else console.log("✓ sync_user_tier");

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_seats, tester_approved")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);

  console.log("\nDone:");
  console.log("  roles:", roles?.map((r) => r.role).join(", "));
  console.log("  tier:", profile?.subscription_tier, "seats:", profile?.subscription_seats);
  console.log("  So1o: /admin + full Pro/In-House features");
  console.log("  Anthem: /admin + isPro");
}

main().catch((e) => {
  console.error("Failed:", e.message ?? e);
  process.exit(1);
});
