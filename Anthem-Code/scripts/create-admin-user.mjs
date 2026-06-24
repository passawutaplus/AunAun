#!/usr/bin/env node
/**
 * Create or update an admin user (auth + profile + user_roles).
 * Credentials via env only — never commit passwords.
 *
 * Env (scripts/ecosystem/.env.seed.local or shell):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_EMAIL, ADMIN_PASSWORD
 *   ADMIN_DISPLAY_NAME (optional), ADMIN_USERNAME (optional)
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const anthemRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(anthemRoot, "..");
const envPaths = [
  join(anthemRoot, ".env"),
  join(repoRoot, "scripts", "ecosystem", ".env.seed.local"),
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
const email = process.env.ADMIN_EMAIL?.trim();
const password = process.env.ADMIN_PASSWORD;
const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || "Passawut";
const username = process.env.ADMIN_USERNAME?.trim() || "passawutaplus";

if (!url || !key) {
  console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!email || !password) {
  console.error("Missing ADMIN_EMAIL and ADMIN_PASSWORD");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(targetEmail) {
  let page = 1;
  const perPage = 200;
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === targetEmail.toLowerCase());
    if (hit) return hit;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function main() {
  console.log("Project:", url.replace(/https?:\/\//, ""));
  console.log("Admin email:", email);

  let user = await findUserByEmail(email);

  if (user) {
    console.log("User exists:", user.id);
    const { data: updated, error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, username },
    });
    if (error) throw error;
    user = updated.user;
    console.log("Password updated");
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, username },
    });
    if (error) throw error;
    user = created.user;
    console.log("User created:", user.id);
  }

  let profile = null;
  const { data: byId, error: byIdErr } = await supabase
    .from("profiles")
    .select("id, user_id, email, display_name, username")
    .eq("id", user.id)
    .maybeSingle();
  if (byIdErr) throw byIdErr;
  profile = byId;

  if (!profile) {
    const { data: byUserId, error: byUserIdErr } = await supabase
      .from("profiles")
      .select("id, user_id, email, display_name, username")
      .eq("user_id", user.id)
      .maybeSingle();
    if (byUserIdErr) throw byUserIdErr;
    profile = byUserId;
  }

  const profileKey = profile?.id ?? user.id;

  if (!profile) {
    const { error: insertErr } = await supabase.from("profiles").insert({
      id: user.id,
      user_id: user.id,
      display_name: displayName,
      username,
      email,
    });
    if (insertErr) throw insertErr;
    console.log("Profile created");
  } else {
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ email, display_name: displayName, username, user_id: user.id })
      .eq("id", profileKey);
    if (updateErr) throw updateErr;
    console.log("Profile synced:", profileKey);
  }

  const { error: roleErr } = await supabase
    .from("user_roles")
    .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });

  if (roleErr) throw roleErr;
  console.log("Admin role granted");

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  console.log("Roles:", roles?.map((r) => r.role).join(", ") || "(none)");
  console.log("Done — login at /login then open /admin");
}

main().catch((e) => {
  console.error("Failed:", e.message ?? e);
  process.exit(1);
});
