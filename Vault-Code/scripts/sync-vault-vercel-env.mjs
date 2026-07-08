#!/usr/bin/env node
/**
 * Copy Supabase server env from production Vercel project to demo project.
 * Run once after creating aplus-vault-demo.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VAULT_DEMO_VERCEL_PROJECT,
  VAULT_PROD_VERCEL_PROJECT,
} from "./vault-site-urls.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scope = process.env.VERCEL_SCOPE || "passawutaplus-9338s-projects";
const envKeys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

for (const key of envKeys) {
  const pullFile = join(root, `.vercel-env-${key}.txt`);
  execSync(
    `npx vercel env pull "${pullFile}" --environment=production --yes --scope "${scope}" --project "${VAULT_PROD_VERCEL_PROJECT}"`,
    { cwd: root, stdio: "inherit" },
  );
  const raw = readFileSync(pullFile, "utf8");
  const match = raw.match(new RegExp(`^${key}=(.*)$`, "m"));
  unlinkSync(pullFile);
  if (!match?.[1]) {
    console.error(`Missing ${key} on ${VAULT_PROD_VERCEL_PROJECT}`);
    process.exit(1);
  }
  const value = match[1].replace(/^"|"$/g, "");
  execSync(
    `npx vercel env add ${key} production --scope "${scope}" --project "${VAULT_DEMO_VERCEL_PROJECT}" --force`,
    { cwd: root, input: value, stdio: ["pipe", "inherit", "inherit"] },
  );
  console.log(`✓ Copied ${key} → ${VAULT_DEMO_VERCEL_PROJECT}`);
}

console.log("Done. Demo project should share capture API storage with production.");
