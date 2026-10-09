#!/usr/bin/env node
/**
 * Move legacy KYC documents out of the PUBLIC `project-media` bucket into the PRIVATE `kyc-documents` bucket.
 *
 *   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/migrate-kyc-to-private-bucket.mjs                  # dry run (default): prints the plan only
 *     node scripts/migrate-kyc-to-private-bucket.mjs --apply         # copy + rewrite DB paths, keep the old files
 *     node scripts/migrate-kyc-to-private-bucket.mjs --apply --delete-legacy   # also delete the public copies
 *
 * Order: 1) apply migration 20261009110000_aplus1_kyc_private_bucket.sql  2) deploy the app  3) run this script.
 * Safe to re-run: documents already moved are skipped. The old object is deleted only after the copy was
 * downloaded back and its size matched, and the database rows were updated.
 *
 * Rewrites shared.kyc_documents.storage_path, shared.kyc_requests.bank_book_path and shared.payout_profiles.bank_book_path.
 * The service-role key is read from the environment only; never put it in a file that is committed.
 */
import { createClient } from "@supabase/supabase-js";

const LEGACY_BUCKET = "project-media";
const NEW_BUCKET = "kyc-documents";
const LEGACY_PREFIX = "anthem/kyc/";

const apply = process.argv.includes("--apply");
const deleteLegacy = process.argv.includes("--delete-legacy");
if (deleteLegacy && !apply) {
  console.error("--delete-legacy needs --apply");
  process.exit(2);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(2);
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const db = sb.schema("shared");

const contentTypeFor = (p) => (p.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
const newPathFor = (oldPath) => oldPath.slice(LEGACY_PREFIX.length); // <user>/<docType>/<uuid>.<ext>

const { data: docs, error: docsErr } = await db
  .from("kyc_documents")
  .select("id, user_id, doc_type, storage_path")
  .like("storage_path", `${LEGACY_PREFIX}%`);
if (docsErr) throw docsErr;

console.log(`${apply ? "APPLY" : "DRY RUN"}: ${docs.length} legacy document(s) in ${LEGACY_BUCKET}`);

let moved = 0;
let failed = 0;
for (const d of docs) {
  const oldPath = d.storage_path;
  const newPath = newPathFor(oldPath);
  console.log(`- ${d.doc_type} ${d.id}: ${oldPath} -> ${newPath}`);
  if (!apply) continue;

  try {
    const { data: blob, error: dlErr } = await sb.storage.from(LEGACY_BUCKET).download(oldPath);
    if (dlErr) throw new Error(`download: ${dlErr.message}`);
    const bytes = Buffer.from(await blob.arrayBuffer());

    const { error: upErr } = await sb.storage
      .from(NEW_BUCKET)
      .upload(newPath, bytes, { contentType: contentTypeFor(newPath), upsert: false });
    if (upErr && !/already exists|Duplicate/i.test(upErr.message)) throw new Error(`upload: ${upErr.message}`);

    const { data: check, error: chkErr } = await sb.storage.from(NEW_BUCKET).download(newPath);
    if (chkErr) throw new Error(`verify download: ${chkErr.message}`);
    if (check.size !== bytes.length) throw new Error(`size mismatch ${check.size} != ${bytes.length}`);

    for (const [table, column] of [
      ["kyc_documents", "storage_path"],
      ["kyc_requests", "bank_book_path"],
      ["payout_profiles", "bank_book_path"],
    ]) {
      const { error } = await db.from(table).update({ [column]: newPath }).eq(column, oldPath);
      if (error) throw new Error(`update ${table}.${column}: ${error.message}`);
    }

    if (deleteLegacy) {
      const { error: rmErr } = await sb.storage.from(LEGACY_BUCKET).remove([oldPath]);
      if (rmErr) throw new Error(`delete legacy: ${rmErr.message}`);
    }
    moved += 1;
  } catch (e) {
    failed += 1;
    console.error(`  FAILED: ${e.message}`);
  }
}

if (apply) {
  console.log(`done: moved ${moved}, failed ${failed}${deleteLegacy ? ", legacy copies deleted" : ", legacy copies kept (re-run with --delete-legacy once verified)"}`);
  process.exit(failed ? 1 : 0);
}
console.log("Nothing was changed. Re-run with --apply to move the documents.");
