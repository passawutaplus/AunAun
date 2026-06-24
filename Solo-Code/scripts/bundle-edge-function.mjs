#!/usr/bin/env node
/**
 * Bundle a Supabase edge function + _shared deps for MCP deploy (flat imports).
 * Usage: node scripts/bundle-edge-function.mjs ai-design-chat
 */
import fs from "node:fs";
import path from "node:path";

const fnName = process.argv[2];
if (!fnName) {
  console.error("Usage: node scripts/bundle-edge-function.mjs <function-name>");
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, "..");
const fnDir = path.join(root, "supabase", "functions", fnName);
const indexPath = path.join(fnDir, "index.ts");
if (!fs.existsSync(indexPath)) {
  console.error(`Missing ${indexPath}`);
  process.exit(1);
}

let index = fs.readFileSync(indexPath, "utf8");
index = index.replaceAll("../_shared/", "./");

const files = [{ name: "index.ts", content: index }];
const sharedDir = path.join(root, "supabase", "functions", "_shared");

for (const dep of ["gemini.ts", "ai-quota.ts"]) {
  if (index.includes(`./${dep}`)) {
    files.push({
      name: dep,
      content: fs.readFileSync(path.join(sharedDir, dep), "utf8"),
    });
  }
}

const configPath = path.join(root, "supabase", "config.toml");
let verifyJwt = true;
if (fs.existsSync(configPath)) {
  const cfg = fs.readFileSync(configPath, "utf8");
  const m = cfg.match(
    new RegExp(`\\[functions\\.${fnName}\\][\\s\\S]*?verify_jwt\\s*=\\s*(true|false)`),
  );
  if (m) verifyJwt = m[1] === "true";
}

const out = {
  project_id: "rvnzjiskqliexysicfmh",
  name: fnName,
  entrypoint_path: "index.ts",
  verify_jwt: verifyJwt,
  files,
};

const outPath = process.argv[3];
if (outPath) {
  fs.writeFileSync(outPath, JSON.stringify(out), "utf8");
} else {
  process.stdout.write(JSON.stringify(out));
}
