#!/usr/bin/env node
/**
 * Print deploy payload for one bundled edge function (for MCP deploy_edge_function).
 * Usage: node scripts/deploy-bundled-edge.mjs supabase/.bundle-ai-design-chat.json
 */
import fs from "node:fs";

const bundlePath = process.argv[2];
if (!bundlePath) {
  console.error("Usage: node scripts/deploy-bundled-edge.mjs <bundle.json>");
  process.exit(1);
}
const payload = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
const mcpArgs = {
  project_id: payload.project_id,
  name: payload.name,
  entrypoint_path: payload.entrypoint_path,
  verify_jwt: payload.verify_jwt,
  files: payload.files,
};
const outPath = process.argv[3];
if (outPath) {
  fs.writeFileSync(outPath, JSON.stringify(mcpArgs), "utf8");
} else {
  process.stdout.write(JSON.stringify(mcpArgs));
}
