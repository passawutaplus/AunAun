import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const anthemRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(anthemRoot, "..");

const ENV_PATHS = [
  join(repoRoot, "scripts", "ecosystem", ".env.seed.local"),
  join(repoRoot, "Solo-Code", ".env"),
  join(anthemRoot, ".env"),
];

export function loadSeedEnv() {
  for (const p of ENV_PATHS) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }

  const tokenPath = join(process.env.HOME || process.env.USERPROFILE || "", ".config", "supabase", "access-token");
  if (!process.env.SUPABASE_ACCESS_TOKEN && existsSync(tokenPath)) {
    process.env.SUPABASE_ACCESS_TOKEN = readFileSync(tokenPath, "utf8").trim();
  }

  if (!process.env.DEMO_SEED_PASSWORD) {
    process.env.DEMO_SEED_PASSWORD = "pixel100-demo-seed";
  }
}

export function getSupabaseClients(createClient) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  const opts = { auth: { autoRefreshToken: false, persistSession: false } };
  return {
    url,
    key,
    publicDb: createClient(url, key, { ...opts, db: { schema: "public" } }),
    anthemDb: createClient(url, key, { ...opts, db: { schema: "anthem" } }),
    sharedDb: createClient(url, key, { ...opts, db: { schema: "shared" } }),
    admin: createClient(url, key, opts),
  };
}

export { anthemRoot, repoRoot };
