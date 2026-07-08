/**
 * Add A+ Vault demo URLs to Supabase Auth redirect allow list.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const envPath = path.join(root, "Solo-Code/.env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter(line => line && !line.startsWith("#"))
    .map(line => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    })
);

const token = env.SUPABASE_ACCESS_TOKEN;
const projectRef = env.SUPABASE_PROJECT_REF || "zkflkpbmbozrchqncpzi";
if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN missing in Solo-Code/.env");
  process.exit(1);
}

import {
  VAULT_DEMO_SITE_URL,
  VAULT_PROD_SITE_URL,
} from "./vault-site-urls.mjs";

const vaultUrls = [
  `${VAULT_PROD_SITE_URL}/**`,
  `${VAULT_DEMO_SITE_URL}/**`,
  "http://127.0.0.1:5177/**",
  "http://localhost:5177/**",
];

const getRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!getRes.ok) {
  console.error("Failed to read auth config:", getRes.status, await getRes.text());
  process.exit(1);
}

const current = await getRes.json();
const existing = String(current.uri_allow_list || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);
const merged = [...new Set([...existing, ...vaultUrls])];

const patchRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ uri_allow_list: merged.join(",") }),
});

if (!patchRes.ok) {
  console.error("Auth PATCH failed:", patchRes.status, await patchRes.text());
  process.exit(1);
}

console.log("Vault auth redirect URLs patched");
for (const url of vaultUrls) console.log(" +", url);
