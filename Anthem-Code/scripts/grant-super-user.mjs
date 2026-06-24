#!/usr/bin/env node
/** Grant admin + In-House tier — run from Anthem-Code: node scripts/grant-super-user.mjs */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const anthemRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(anthemRoot, "..");
for (const p of [
  join(anthemRoot, ".env"),
  join(repoRoot, "Solo-Code", ".env"),
  join(repoRoot, "scripts", "ecosystem", ".env.seed.local"),
]) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const email = (process.env.GRANT_EMAIL || "passawut.a.plus@gmail.com").trim().toLowerCase();
const seats = Number(process.env.GRANT_SEATS || "10");

if (!url || !key) {
  console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function resolveUserId(targetEmail) {
  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("user_id, id, email")
    .ilike("email", targetEmail)
    .maybeSingle();
  if (profErr) throw profErr;
  if (prof?.user_id) return prof.user_id;
  if (prof?.id) return prof.id;

  try {
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const hit = data.users.find((u) => u.email?.toLowerCase() === targetEmail);
      if (hit) return hit.id;
      if (data.users.length < 200) break;
    }
  } catch (e) {
    console.warn("auth.admin.listUsers skipped:", e.message ?? e);
  }
  return null;
}

const userId = await resolveUserId(email);
if (!userId) {
  console.error("ไม่พบ user — สมัครด้วย", email, "ก่อน");
  process.exit(1);
}
console.log("user_id:", userId);

await supabase.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" }).then(({ error }) => { if (error) throw error; });
console.log("✓ admin");

const periodEnd = new Date();
periodEnd.setFullYear(periodEnd.getFullYear() + 5);

const subRow = {
  user_id: userId,
  stripe_subscription_id: `manual_inhouse_${userId}`,
  stripe_customer_id: `manual_${userId}`,
  product_id: "manual_inhouse",
  price_id: "inhouse_monthly",
  status: "active",
  current_period_start: new Date().toISOString(),
  current_period_end: periodEnd.toISOString(),
  cancel_at_period_end: false,
  environment: "sandbox",
};
const withSeats = { ...subRow, seat_quantity: seats };

let { error: subErr } = await supabase.from("subscriptions").upsert(withSeats, { onConflict: "stripe_subscription_id" });
if (subErr?.message?.includes("seat_quantity")) {
  ({ error: subErr } = await supabase.from("subscriptions").upsert(subRow, { onConflict: "stripe_subscription_id" }));
}
if (subErr) throw subErr;
console.log("✓ subscription inhouse");

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
console.log("✓ profile");

await supabase.rpc("sync_user_tier", { _user_id: userId }).then(({ error }) => {
  if (error) console.warn("sync_user_tier:", error.message);
});

const { data: profile } = await supabase
  .from("profiles")
  .select("subscription_tier, subscription_seats, tester_approved")
  .eq("user_id", userId)
  .maybeSingle();
const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);

console.log("Done — roles:", roles?.map((r) => r.role).join(", "), "| tier:", profile?.subscription_tier, "seats:", profile?.subscription_seats);
