#!/usr/bin/env node
/** Copy Supabase env from Solo-Code/.env to linked Vercel project (demo). */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const soloEnv = readFileSync(join(root, "..", "Solo-Code", ".env"), "utf8");
const map = Object.fromEntries(
  soloEnv
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  const value = map[key];
  if (!value) {
    console.error(`Missing ${key} in Solo-Code/.env`);
    process.exit(1);
  }
  const result = spawnSync(
    "npx",
    ["vercel", "env", "add", key, "production", "--yes", "--force", "--sensitive"],
    { cwd: root, input: value, stdio: ["pipe", "inherit", "inherit"], shell: process.platform === "win32" },
  );
  if (result.status !== 0) process.exit(result.status || 1);
  console.log(`✓ ${key} set on linked Vercel project`);
}

const list = spawnSync("npx", ["vercel", "env", "ls", "production"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(list.status || 0);

