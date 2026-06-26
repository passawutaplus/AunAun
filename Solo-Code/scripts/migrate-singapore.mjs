#!/usr/bin/env node
/**
 * Singapore migration helpers — inventory, env update, storage sync.
 * Usage:
 *   node scripts/migrate-singapore.mjs inventory [--source|--target]
 *   node scripts/migrate-singapore.mjs update-local-env
 *   node scripts/migrate-singapore.mjs storage-download
 *   node scripts/migrate-singapore.mjs storage-upload
 */
import { spawnSync } from "node:child_process";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOLO_ROOT = join(__dirname, "..");
const REPO_ROOT = join(SOLO_ROOT, "..");

const OLD_REF = "rvnzjiskqliexysicfmh";
const NEW_REF = "zkflkpbmbozrchqncpzi";

const BUCKETS = [
  "brand-logos",
  "brief-references",
  "job-tracker",
  "chat-images",
  "supplier-files",
  "supplier-covers",
  "expense-receipts",
  "wht-certificates",
  "ticket-attachments",
  "project-media",
];

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  const raw = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function upsertEnv(path, entries) {
  let text = existsSync(path) ? readFileSync(path, "utf8").replace(/^\uFEFF/, "") : "";
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined || value === null) continue;
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(text)) text = text.replace(re, line);
    else text = text.trimEnd() + (text.endsWith("\n") || text === "" ? "" : "\n") + line + "\n";
  }
  writeFileSync(path, text.replace(/^\uFEFF/, ""), "utf8");
}

function loadSoloEnv() {
  return parseEnvFile(join(SOLO_ROOT, ".env"));
}

function projectConfig(which) {
  const env = loadSoloEnv();
  const isNew = which === "target" || which === "new" || which === NEW_REF;
  if (isNew) {
    return {
      ref: NEW_REF,
      url: env.SG_SUPABASE_URL || env.SUPABASE_URL || `https://${NEW_REF}.supabase.co`,
      serviceKey: env.SG_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
      dbPassword: env.SG_SUPABASE_DB_PASSWORD,
      poolerHost: env.SG_SUPABASE_POOLER_HOST || "aws-0-ap-southeast-1.pooler.supabase.com",
    };
  }
  return {
    ref: OLD_REF,
    url: env.US_SUPABASE_URL || `https://${OLD_REF}.supabase.co`,
    serviceKey: env.US_SUPABASE_SERVICE_ROLE_KEY,
    dbPassword: env.SUPABASE_DB_PASSWORD,
    poolerHost: env.SUPABASE_POOLER_HOST || "aws-1-us-east-1.pooler.supabase.com",
  };
}

async function runSqlQuery(config, sql) {
  const token = loadSoloEnv().SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN required in Solo-Code/.env");
  const res = await fetch(`https://api.supabase.com/v1/projects/${config.ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Query failed (${res.status}): ${body.slice(0, 400)}`);
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

async function inventory(which) {
  const config = projectConfig(which);
  console.log(`\n=== Inventory: ${config.ref} (${which}) ===\n`);

  const queries = [
    ["auth.users", "SELECT count(*)::int AS n FROM auth.users"],
    ["public.profiles", "SELECT count(*)::int AS n FROM public.profiles"],
    ["anthem.projects", "SELECT count(*)::int AS n FROM anthem.projects"],
    ["shared.wallets", "SELECT count(*)::int AS n FROM shared.wallets"],
    ["schema_migrations", "SELECT count(*)::int AS n FROM supabase_migrations.schema_migrations"],
  ];

  const results = {};
  for (const [label, sql] of queries) {
    try {
      const rows = await runSqlQuery(config, sql);
      const n = Array.isArray(rows) ? rows[0]?.n : "?";
      results[label] = n;
      console.log(`  ${label}: ${n}`);
    } catch (e) {
      results[label] = `error: ${e.message}`;
      console.log(`  ${label}: ${e.message}`);
    }
  }

  if (config.serviceKey) {
    let total = 0;
    for (const bucket of BUCKETS) {
      try {
        const count = await countBucketObjects(config.url, config.serviceKey, bucket);
        total += count;
        console.log(`  storage.${bucket}: ${count} object(s)`);
      } catch (e) {
        console.log(`  storage.${bucket}: ${e.message}`);
      }
    }
    console.log(`  storage total: ${total}`);
  } else {
    console.log("  (skip storage — no service role key)");
  }

  const outPath = join(REPO_ROOT, "backups", `inventory-${config.ref}.json`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify({ ref: config.ref, at: new Date().toISOString(), results }, null, 2));
  console.log(`\nSaved ${outPath}`);
}

function storageHeaders(serviceKey) {
  return {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    "Content-Type": "application/json",
  };
}

async function storageList(url, serviceKey, bucket, prefix = "", offset = 0, limit = 1000) {
  const res = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: storageHeaders(serviceKey),
    body: JSON.stringify({ prefix, limit, offset }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(body.slice(0, 200));
  return JSON.parse(body);
}

async function countBucketObjects(url, serviceKey, bucket, prefix = "") {
  let total = 0;
  let offset = 0;
  const limit = 1000;
  while (true) {
    const data = await storageList(url, serviceKey, bucket, prefix, offset, limit);
    if (!Array.isArray(data) || !data.length) break;
    for (const item of data) {
      if (item.id) total += 1;
      else if (item.metadata) total += 1;
      else if (item.name) total += (await countBucketObjects(url, serviceKey, bucket, prefix ? `${prefix}/${item.name}` : item.name));
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return total;
}

function updateLocalEnv() {
  const env = loadSoloEnv();
  const sgUrl = `https://${NEW_REF}.supabase.co`;
  const publishable =
    env.SG_VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.SG_SUPABASE_PUBLISHABLE_KEY ||
    "your_publishable_key";
  const serviceRole = env.SG_SUPABASE_SERVICE_ROLE_KEY || "your_service_role_key";

  const shared = {
    VITE_SUPABASE_URL: sgUrl,
    VITE_SUPABASE_PUBLISHABLE_KEY: publishable,
    VITE_SUPABASE_PROJECT_ID: NEW_REF,
    SUPABASE_URL: sgUrl,
    SUPABASE_PUBLISHABLE_KEY: publishable,
    SUPABASE_ANON_KEY: publishable,
    ANTHEM_SUPABASE_URL: sgUrl,
    ANTHEM_SUPABASE_SERVICE_ROLE_KEY: serviceRole,
  };

  const paths = [
    join(SOLO_ROOT, ".env"),
    join(REPO_ROOT, "Anthem-Code", ".env"),
    join(REPO_ROOT, "Ops-Hub", ".env"),
  ];

  for (const p of paths) {
    if (!existsSync(p)) continue;
    const current = parseEnvFile(p);
    upsertEnv(p, {
      ...shared,
      SUPABASE_SERVICE_ROLE_KEY: p.includes("Solo-Code") ? serviceRole : current.SUPABASE_SERVICE_ROLE_KEY,
    });
    console.log(`Updated ${p}`);
  }
}

async function listAllObjects(url, serviceKey, bucket, prefix = "") {
  const out = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const data = await storageList(url, serviceKey, bucket, prefix, offset, limit);
    if (!Array.isArray(data) || !data.length) break;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) out.push({ bucket, path });
      else if (item.metadata) out.push({ bucket, path });
      else {
        const nested = await listAllObjects(url, serviceKey, bucket, path);
        out.push(...nested);
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return out;
}

async function storageDownload() {
  const config = projectConfig("source");
  if (!config.serviceKey) throw new Error("US service role key required");
  const destRoot = join(REPO_ROOT, "backups", "storage", OLD_REF);
  mkdirSync(destRoot, { recursive: true });

  for (const bucket of BUCKETS) {
    console.log(`→ ${bucket}`);
    try {
      const objects = await listAllObjects(config.url, config.serviceKey, bucket);
      for (const { path } of objects) {
        const res = await fetch(`${config.url}/storage/v1/object/${bucket}/${path}`, {
          headers: storageHeaders(config.serviceKey),
        });
        if (!res.ok) {
          console.log(`  ✗ ${path}: ${res.status}`);
          continue;
        }
        const dest = join(destRoot, bucket, path);
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      }
      console.log(`  ✓ ${objects.length} file(s)`);
    } catch (e) {
      console.log(`  ✗ bucket error: ${e.message}`);
    }
  }
}

async function storageUpload() {
  const config = projectConfig("target");
  if (!config.serviceKey) throw new Error("SG service role key required");
  const srcRoot = join(REPO_ROOT, "backups", "storage", OLD_REF);
  if (!existsSync(srcRoot)) throw new Error(`No backup at ${srcRoot} — run storage-download first`);

  for (const bucket of BUCKETS) {
    const bucketDir = join(srcRoot, bucket);
    if (!existsSync(bucketDir)) continue;
    const files = walkFiles(bucketDir);
    console.log(`→ ${bucket}: ${files.length} file(s)`);
    for (const file of files) {
      const rel = relative(bucketDir, file).replace(/\\/g, "/");
      const body = readFileSync(file);
      const res = await fetch(`${config.url}/storage/v1/object/${bucket}/${rel}`, {
        method: "POST",
        headers: {
          ...storageHeaders(config.serviceKey),
          "x-upsert": "true",
        },
        body,
      });
      if (!res.ok) console.log(`  ✗ ${rel}: ${res.status} ${(await res.text()).slice(0, 120)}`);
    }
  }
  console.log("✓ Storage upload complete");
}

function walkFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}

function dbDump() {
  const config = projectConfig("source");
  if (!config.dbPassword) throw new Error("SUPABASE_DB_PASSWORD required for US dump");
  const outDir = join(REPO_ROOT, "backups", "db");
  mkdirSync(outDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  const out = join(outDir, `${OLD_REF}-${ts}.dump`);

  const args = [
    "supabase",
    "db",
    "dump",
    "--db-url",
    `postgresql://postgres.${OLD_REF}:${encodeURIComponent(config.dbPassword)}@${config.poolerHost}:5432/postgres`,
    "-f",
    out,
  ];
  console.log(`→ Dumping ${OLD_REF} → ${out}`);
  const r = spawnSync("npx", args, { cwd: SOLO_ROOT, stdio: "inherit", shell: true });
  if (r.status !== 0) throw new Error(`db dump failed (${r.status})`);
  return out;
}

function dbRestore(dumpPath) {
  const config = projectConfig("target");
  const password = config.dbPassword || loadSoloEnv().SG_SUPABASE_DB_PASSWORD;
  if (!password) throw new Error("SG_SUPABASE_DB_PASSWORD required for restore");
  const dump = dumpPath || findLatestDump();
  if (!dump) throw new Error("No dump file found in backups/db");

  console.log(`→ Restoring ${dump} → ${NEW_REF}`);
  const dbUrl = `postgresql://postgres.${NEW_REF}:${encodeURIComponent(password)}@${config.poolerHost}:5432/postgres`;
  const r = spawnSync(
    "npx",
    ["supabase", "db", "reset", "--db-url", dbUrl, "--linked", "false"],
    { cwd: SOLO_ROOT, stdio: "inherit", shell: true },
  );
  // supabase db reset isn't restore — use pg_restore via psql if available
  // Fallback: Management API won't do full restore
  console.log("\nIf supabase db reset is not appropriate, run pg_restore manually:");
  console.log(`  pg_restore -d "${dbUrl}" --clean --if-exists --no-owner "${dump}"`);
  return dump;
}

function findLatestDump() {
  const dir = join(REPO_ROOT, "backups", "db");
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".dump") && f.includes(OLD_REF))
    .map((f) => join(dir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return files[0] || null;
}

async function configureAuth() {
  const token = loadSoloEnv().SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN required");
  const urls = [
    "http://localhost:5173/**",
    "http://localhost:8080/**",
    "http://localhost:3000/**",
    "http://localhost:8081/**",
    "http://127.0.0.1:5173/**",
    "http://127.0.0.1:8080/**",
    "http://127.0.0.1:3000/**",
    "http://127.0.0.1:3090/**",
    "https://solofreelancer.com/**",
    "https://www.solofreelancer.com/**",
    "https://an1hem.app/**",
    "https://www.an1hem.app/**",
    "https://hq.solofreelancer.com/**",
  ];
  const res = await fetch(`https://api.supabase.com/v1/projects/${NEW_REF}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      site_url: "https://solofreelancer.com",
      uri_allow_list: urls.join(","),
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Auth config failed (${res.status}): ${body.slice(0, 400)}`);
  console.log("✓ Auth URLs configured on", NEW_REF);
}

async function deployEdgeFunctions() {
  const token = loadSoloEnv().SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN required");
  process.env.SUPABASE_ACCESS_TOKEN = token;
  const fnDir = join(SOLO_ROOT, "supabase", "functions");
  const names = readdirSync(fnDir).filter(
    (n) => !n.startsWith("_") && !n.startsWith(".") && statSync(join(fnDir, n)).isDirectory(),
  );
  console.log(`→ Deploying ${names.length} edge functions to ${NEW_REF}`);
  for (const name of names) {
    console.log(`  ${name}`);
    const r = spawnSync(
      "npx",
      ["supabase", "functions", "deploy", name, "--project-ref", NEW_REF],
      { cwd: SOLO_ROOT, stdio: "inherit", shell: true, env: { ...process.env, SUPABASE_ACCESS_TOKEN: token } },
    );
    if (r.status !== 0) console.log(`  ⚠ ${name} deploy returned ${r.status}`);
  }
}

const cmd = process.argv[2];
const arg = process.argv[3];

try {
  switch (cmd) {
    case "inventory":
      await inventory(arg === "--target" || arg === "target" ? "target" : "source");
      break;
    case "update-local-env":
      updateLocalEnv();
      break;
    case "storage-download":
      await storageDownload();
      break;
    case "storage-upload":
      await storageUpload();
      break;
    case "db-dump":
      dbDump();
      break;
    case "db-restore":
      dbRestore(arg);
      break;
    case "configure-auth":
      await configureAuth();
      break;
    case "deploy-functions":
      await deployEdgeFunctions();
      break;
    default:
      console.log(`Usage: node scripts/migrate-singapore.mjs <command>
Commands:
  inventory [--source|--target]
  update-local-env
  storage-download | storage-upload
  db-dump | db-restore [dump-path]
  configure-auth
  deploy-functions`);
      process.exit(1);
  }
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}
