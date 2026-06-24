#!/usr/bin/env node
/**
 * Prepare deploy arg files for MCP deploy_edge_function calls.
 * Usage: node scripts/mcp-deploy-all-bundles.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const bundles = [
  ".bundle-ai-design-chat.json",
  ".bundle-ai-price-suggest.json",
  ".bundle-color-mentor.json",
  ".bundle-planner-ai-assist.json",
  ".bundle-generate-contract.json",
];
const outDir = "C:/Users/PC/.cursor/projects/f-So1o-Solo-Code/agent-tools";

for (const f of bundles) {
  const b = JSON.parse(fs.readFileSync(path.join(root, "supabase", f), "utf8"));
  const payload = {
    project_id: b.project_id,
    name: b.name,
    entrypoint_path: b.entrypoint_path,
    verify_jwt: b.verify_jwt,
    files: b.files,
  };
  const out = path.join(outDir, `deploy-${b.name}-args.json`);
  fs.writeFileSync(out, JSON.stringify(payload), "utf8");
  console.log("prepared", b.name, "->", out);
}
