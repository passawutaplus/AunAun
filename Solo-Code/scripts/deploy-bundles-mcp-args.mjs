#!/usr/bin/env node
/** Print deploy args JSON for one bundle file (stdout, UTF-8). */
import fs from "node:fs";
const p = process.argv[2];
if (!p) {
  console.error("Usage: node scripts/deploy-bundles-mcp-args.mjs <bundle.json>");
  process.exit(1);
}
const b = JSON.parse(fs.readFileSync(p, "utf8"));
const out = {
  project_id: b.project_id,
  name: b.name,
  entrypoint_path: b.entrypoint_path,
  verify_jwt: b.verify_jwt,
  files: b.files,
};
process.stdout.write(JSON.stringify(out));
