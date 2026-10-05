// DRY RUN: builds the weekly digest for a fixture user and prints it. Nothing is sent. Usage:
//   node scripts/digest-dry-run.mjs [docs/digest/test-user.json]
import { readFileSync } from "node:fs";
import { buildDigest, profileFromItems, signUnsubscribe } from "../lib/engine/digest.mjs";
import { engineConfig } from "../lib/engine/config.mjs";
import { defaultTaxonomy } from "../lib/engine/enrich.mjs";

const file = process.argv[2] || "docs/digest/test-user.json";
const data = JSON.parse(readFileSync(file, "utf8"));
const tax = defaultTaxonomy();
const key = process.env.DIGEST_UNSUB_SECRET || process.env.VAULT_EXTENSION_TOKEN_SECRET || "dry-run-only-secret";
const digest = buildDigest({
  user: data.user,
  profile: profileFromItems(data.items),
  candidates: data.candidates,
  pastPicks: data.pastPicks || [],
  label: id => tax.label(id),
  mediaUrl: p => `https://zkflkpbmbozrchqncpzi.supabase.co/storage/v1/object/public/discover-media/${p}`,
  unsubscribeToken: signUnsubscribe(data.user.id, key),
}, engineConfig);
if (!digest) { console.log("DRY RUN: nothing to send for this user."); process.exit(0); }
console.log("DRY RUN (not sent)\nSubject:", digest.subject, "\nHeaders:", JSON.stringify(digest.headers), "\n\n" + digest.text);
