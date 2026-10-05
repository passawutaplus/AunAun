// Applies APPROVED learned aliases: reads synonym_proposals (status "proposed") with the service role, writes
// docs/dictionary/src/extra/99-learned.txt, rebuilds the dictionary + taxonomy, and logs the change.
// Never runs by itself. Usage: node scripts/apply-learned.mjs   (needs SUPABASE_SERVICE_ROLE_KEY in your shell)
import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { learnedFile } from "../lib/engine/learning.mjs";
import { serviceRoleKey, supabaseRest } from "../lib/supabase-rest.mjs";

if (!serviceRoleKey()) { console.error("Set SUPABASE_SERVICE_ROLE_KEY in your shell first (never commit it)."); process.exit(2); }
const rows = await supabaseRest("/rest/v1/synonym_proposals?select=id,term,lang,term_id,status&status=in.(proposed,exported)&order=created_at.asc&limit=500", { feature: "learned" });
if (!rows.length) { console.log("No approved aliases."); process.exit(0); }
writeFileSync("docs/dictionary/src/extra/99-learned.txt", learnedFile(rows));
const run = (cmd, args) => spawnSync(cmd, args, { stdio: "inherit" });
if (run("python", ["docs/dictionary/build.py"]).status !== 0) { console.error("Dictionary build failed: the file was written but nothing was marked exported. Fix and re-run."); process.exit(1); }
if (run("node", ["scripts/build-taxonomy.mjs"]).status !== 0) process.exit(1);
if (run("node", ["scripts/eval-search.mjs"]).status !== 0) { console.error("The eval set regressed after the change. Review before deploying."); process.exit(1); }
const ids = rows.map(r => r.id);
await supabaseRest(`/rest/v1/synonym_proposals?id=in.(${ids.join(",")})`, { method: "PATCH", body: { status: "exported" }, prefer: "return=minimal", feature: "learned" });
await supabaseRest("/rest/v1/learning_changelog", { method: "POST", body: { what: "dictionary aliases", before: null, after: { aliases: rows.map(r => `${r.term} -> ${r.term_id}`) }, reason: "approved in /admin/review" }, prefer: "return=minimal", feature: "learned" });
console.log(`Applied ${rows.length} aliases. Commit docs/dictionary, taxonomy/ and outputs/a-plus-vault/engine-data.json, then deploy. No re-tagging needed (parser-only).`);
