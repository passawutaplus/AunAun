import assert from "node:assert/strict";
import { test } from "node:test";
import { candidateFromSubmission, submissionVerdict, type Submission } from "./creator";
import { licenseGate } from "./license";

const sub: Submission = { id: "11111111-1111-4111-8111-111111111111", user_id: "22222222-2222-4222-8222-222222222222", asset_path: "22222222-2222-4222-8222-222222222222/1-work.webp", title: "Blue chair", credit_name: "Mali D.", license: "cc-by", link_url: "https://mali.example/work" };

test("a submission becomes a normal candidate that passes the licence gate (credit + CC BY link + https source)", () => {
  const c = candidateFromSubmission(sub, "https://aplus-vault.vercel.app/", "https://x.supabase.co/");
  assert.equal(c.source, "creator");
  assert.equal(c.sourceId, sub.id);
  assert.equal(c.sourceUrl, "https://mali.example/work");
  assert.match(c.attribution, /Mali D\./);
  assert.match(c.attribution, /CC BY 4\.0/);
  assert.equal(c.attributionJson.artist, "Mali D.");
  assert.match(c.licenseUrl ?? "", /^https:\/\/creativecommons\.org\/licenses\/by\/4\.0/);
  assert.deepEqual(licenseGate(c), { ok: true });
});

test("without a link the source falls back to Discover; CC0 needs no licence page conditions", () => {
  const c = candidateFromSubmission({ ...sub, link_url: null, license: "cc0" }, "https://aplus-vault.vercel.app", "https://x.supabase.co");
  assert.equal(c.sourceUrl, "https://aplus-vault.vercel.app/discover");
  assert.equal(c.license, "cc0");
  assert.deepEqual(licenseGate(c), { ok: true });
});

test("verdict: only a published outcome goes public; everything else is not_published with the reason", () => {
  assert.deepEqual(submissionVerdict({ status: "published", sourceId: "x" }), { status: "published", reason: null });
  assert.deepEqual(submissionVerdict({ status: "review", sourceId: "x", reason: "quality 65 below 70" }), { status: "not_published", reason: "quality 65 below 70" });
  assert.deepEqual(submissionVerdict({ status: "rejected", sourceId: "x", reason: "moderation_blocked" }), { status: "not_published", reason: "moderation_blocked" });
});
