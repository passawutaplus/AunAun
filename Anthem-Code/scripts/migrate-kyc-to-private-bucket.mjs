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
 *
 * Every file under `project-media/anthem/kyc/` is handled, not only the ones the database points to:
 * - referenced by shared.kyc_documents -> copied to `<user>/<docType>/<file>` and the DB paths are rewritten
 *   (shared.kyc_documents.storage_path, shared.kyc_requests.bank_book_path, shared.payout_profiles.bank_book_path);
 * - not referenced, account still exists -> copied to `_orphaned/<user>/<docType>/<file>` (private, nothing reads it);
 * - not referenced, account deleted -> not copied; removed with --delete-legacy (the owner asked for deletion).
 *
 * Safe to re-run: copies that already exist are reused. A public file is deleted only after its private copy
 * was downloaded back and its size matched, and the database rows were updated.
 * The service-role key is read from the environment only; never put it in a file that is committed.
 */
import { createClient } from "@supabase/supabase-js";

const LEGACY_BUCKET = "project-media";
const NEW_BUCKET = "kyc-documents";
const LEGACY_PREFIX = "anthem/kyc/";
const ORPHAN_PREFIX = "_orphaned/";

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
const legacy = sb.storage.from(LEGACY_BUCKET);
const priv = sb.storage.from(NEW_BUCKET);

/** The private bucket only accepts JPEG and PDF. */
const contentTypeFor = (p) => (p.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");

/** All object paths under a prefix (Storage `list` is one folder deep, so walk it). */
async function listAll(prefix) {
  const out = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await legacy.list(prefix.replace(/\/$/, ""), { limit: 100, offset });
    if (error) throw new Error(`list ${prefix}: ${error.message}`);
    for (const item of data) {
      const path = `${prefix}${item.name}`;
      if (item.id) out.push(path);
      else out.push(...(await listAll(`${path}/`)));
    }
    if (data.length < 100) return out;
  }
}

// All paths, not only legacy ones: after an --apply run the rows already point at the new path, and a re-run
// must still treat that file as referenced (not as an orphan).
const { data: docs, error: docsErr } = await db.from("kyc_documents").select("storage_path");
if (docsErr) throw docsErr;
const referenced = new Set(docs.map((d) => d.storage_path));
const isReferenced = (oldPath) => referenced.has(oldPath) || referenced.has(oldPath.slice(LEGACY_PREFIX.length));

const files = await listAll(LEGACY_PREFIX);
const userExists = new Map();
async function accountExists(userId) {
  if (!userExists.has(userId)) {
    const { data, error } = await sb.auth.admin.getUserById(userId);
    if (error && !/not found/i.test(error.message)) throw new Error(`getUserById: ${error.message}`);
    userExists.set(userId, Boolean(data?.user));
  }
  return userExists.get(userId);
}

const plan = [];
for (const oldPath of files) {
  const rest = oldPath.slice(LEGACY_PREFIX.length); // <user>/<docType>/<file>
  if (isReferenced(oldPath)) plan.push({ oldPath, newPath: rest, kind: "referenced" });
  else if (await accountExists(rest.split("/")[0])) plan.push({ oldPath, newPath: `${ORPHAN_PREFIX}${rest}`, kind: "orphan" });
  else plan.push({ oldPath, newPath: null, kind: "deleted-account" });
}
for (const p of referenced) if (p.startsWith(LEGACY_PREFIX) && !files.includes(p)) console.warn(`! DB points to a missing file: ${p}`);

const count = (k) => plan.filter((p) => p.kind === k).length;
console.log(
  `${apply ? "APPLY" : "DRY RUN"}: ${plan.length} file(s) in ${LEGACY_BUCKET}/${LEGACY_PREFIX} — ` +
    `${count("referenced")} referenced, ${count("orphan")} unreferenced (account exists), ${count("deleted-account")} of deleted accounts`,
);

let moved = 0;
let removed = 0;
let failed = 0;
for (const { oldPath, newPath, kind } of plan) {
  console.log(`- [${kind}] ${oldPath} -> ${newPath ?? (deleteLegacy ? "(delete)" : "(left for --delete-legacy)")}`);
  if (!apply) continue;

  try {
    if (newPath) {
      const { data: blob, error: dlErr } = await legacy.download(oldPath);
      if (dlErr) throw new Error(`download: ${dlErr.message}`);
      const bytes = Buffer.from(await blob.arrayBuffer());

      const { error: upErr } = await priv.upload(newPath, bytes, { contentType: contentTypeFor(newPath), upsert: false });
      if (upErr && !/already exists|Duplicate/i.test(upErr.message)) throw new Error(`upload: ${upErr.message}`);

      const { data: check, error: chkErr } = await priv.download(newPath);
      if (chkErr) throw new Error(`verify download: ${chkErr.message}`);
      if (check.size !== bytes.length) throw new Error(`size mismatch ${check.size} != ${bytes.length}`);

      if (kind === "referenced") {
        for (const [table, column] of [
          ["kyc_documents", "storage_path"],
          ["kyc_requests", "bank_book_path"],
          ["payout_profiles", "bank_book_path"],
        ]) {
          const { error } = await db.from(table).update({ [column]: newPath }).eq(column, oldPath);
          if (error) throw new Error(`update ${table}.${column}: ${error.message}`);
        }
      }
      moved += 1;
    }

    if (deleteLegacy) {
      const { error: rmErr } = await legacy.remove([oldPath]);
      if (rmErr) throw new Error(`delete legacy: ${rmErr.message}`);
      removed += 1;
    }
  } catch (e) {
    failed += 1;
    console.error(`  FAILED: ${e.message}`);
  }
}

if (apply) {
  console.log(
    `done: copied ${moved}, public files deleted ${removed}, failed ${failed}` +
      (deleteLegacy ? "" : " — public copies kept; re-run with --apply --delete-legacy once the admin KYC page shows the documents"),
  );
  process.exit(failed ? 1 : 0);
}
console.log("Nothing was changed. Re-run with --apply to copy the documents.");
