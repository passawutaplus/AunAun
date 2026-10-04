import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectionNameFor, defaultSelection, imageKey, isJunkUrl, rankCandidates } from "../../vault-extension/lib/keep-all.js";
import { MAX_ATTEMPTS, QUEUE_CAP, backoffMs, isRetryable, prepareForQueue, queueAdd, queueAfterFailure, queueDue, queueRemove, queueSummary } from "../../vault-extension/lib/queue.js";
import { extractCredit } from "../../vault-extension/lib/credit.js";
import { buildBatchItems, chunk, decideKeep, parseTagsAndNote, pickCollection, summarizeBatches, textFragmentUrl } from "../../vault-extension/lib/keep.js";

describe("Keep All candidates", () => {
  it("normalises rendition URLs to the same key", () => {
    assert.equal(imageKey("https://www.site.com/uploads/photo-300x200.jpg?w=300&h=200"), imageKey("https://site.com/uploads/photo.jpg"));
    assert.equal(imageKey("https://cdn.x.com/a@2x.png"), imageKey("https://cdn.x.com/a.png"));
    assert.notEqual(imageKey("https://x.com/a.jpg?id=1"), imageKey("https://x.com/a.jpg?id=2"));
  });
  it("drops data/blob, svg/ico, tracking and icon-like images", () => {
    for (const u of ["data:image/png;base64,AAA", "blob:https://x/1", "https://x.com/logo.svg", "https://x.com/img/sprite.png", "https://x.com/pixel.gif", "https://ad.doubleclick.net/x.png", "https://x.com/favicon.ico"]) assert.equal(isJunkUrl(u), true, u);
    assert.equal(isJunkUrl("https://x.com/photos/street-01.jpg"), false);
  });
  it("dedupes keeping the larger one, flags small ones, marks already-kept, caps the total", () => {
    const list = [
      { url: "https://x.com/a-300x200.jpg", width: 300, height: 200 },
      { url: "https://x.com/a.jpg", width: 1600, height: 1000 },
      { url: "https://x.com/b.jpg", width: 800, height: 600 },
      { url: "https://x.com/tiny.jpg", width: 120, height: 90 },
      { url: "https://x.com/c.jpg", width: 20, height: 20 },
      { url: "https://x.com/d.jpg", width: 900, height: 900 },
    ];
    const r = rankCandidates(list, { keptKeys: new Set([imageKey("https://x.com/b.jpg")]), max: 4 });
    assert.equal(r.hiddenDup, 1);
    assert.equal(r.hiddenJunk, 1);
    assert.equal(r.items.length, 4);
    assert.equal(r.items[0].url, "https://x.com/a.jpg");
    assert.ok(r.items.find(i => i.url.endsWith("tiny.jpg")).small);
    assert.ok(r.items.find(i => i.url.endsWith("b.jpg")).kept);
    assert.deepEqual(defaultSelection(r.items).sort(), [imageKey("https://x.com/a.jpg"), imageKey("https://x.com/d.jpg")].sort());
    const capped = rankCandidates(Array.from({ length: 80 }, (_, i) => ({ url: `https://x.com/p${i}.jpg`, width: 800, height: 800 })));
    assert.equal(capped.items.length, 60);
    assert.equal(capped.capped, 20);
  });
  it("lets unknown-size (lazy) images through and names a collection from the page title", () => {
    assert.equal(rankCandidates([{ url: "https://x.com/lazy.jpg" }]).items.length, 1);
    assert.equal(collectionNameFor("Brutalist posters - Behance", "behance.net"), "Brutalist posters");
    assert.equal(collectionNameFor("", "example.com"), "example.com");
  });
});

describe("offline queue", () => {
  it("retries network errors, 408, 429 and 5xx; never other 4xx", () => {
    for (const s of [0, null, 408, 429, 500, 503]) assert.equal(isRetryable(s), true, String(s));
    for (const s of [400, 401, 403, 404, 413]) assert.equal(isRetryable(s), false, String(s));
  });
  it("backs off exponentially and caps at 15 minutes", () => {
    assert.deepEqual([1, 2, 3].map(backoffMs), [5000, 10000, 20000]);
    assert.equal(backoffMs(30), 15 * 60_000);
  });
  it("adds without duplicates, caps at 50, removes, reports a summary", () => {
    let q = [];
    q = queueAdd(q, { objectId: "a" }, 1).queue;
    assert.equal(queueAdd(q, { objectId: "a" }, 2).added, false);
    for (let i = 0; i < 80; i++) q = queueAdd(q, { objectId: "x" + i }, 10 + i).queue;
    assert.equal(q.length, QUEUE_CAP);
    assert.equal(queueAdd(q, { objectId: "new" }, 99).reason, "full");
    assert.equal(queueSummary(queueRemove(q, "a")), `Waiting to send · ${QUEUE_CAP - 1}`);
    assert.equal(queueSummary([]), "");
  });
  it("schedules the retry, drops on non-retryable status or too many attempts, never retries early", () => {
    let q = queueAdd([], { objectId: "a" }, 0).queue;
    q = queueAfterFailure(q, "a", 503, 1000);
    assert.equal(q[0].attempts, 1);
    assert.equal(queueDue(q, 1000 + 4999).length, 0);
    assert.equal(queueDue(q, 1000 + 5000).length, 1);
    assert.equal(queueAfterFailure(q, "a", 403, 2000).length, 0);
    let many = q;
    for (let i = 0; i < MAX_ATTEMPTS; i++) many = queueAfterFailure(many, "a", 500, 5000 + i);
    assert.equal(many.length, 0);
  });
  it("big inline snapshots are trimmed (not stored whole); nothing usable left is refused", () => {
    const big = "data:image/png;base64," + "A".repeat(500_000);
    const trimmed = prepareForQueue({ assetUrl: big, previewUrl: "https://x.com/t.jpg", sourceUrl: "https://x.com" });
    assert.ok(trimmed.ok && trimmed.trimmed && !trimmed.payload.assetUrl);
    assert.equal(prepareForQueue({ assetUrl: big }).ok, false);
    assert.equal(prepareForQueue({ sourceUrl: "https://x.com" }).trimmed, undefined);
  });
});

describe("credit extraction", () => {
  const ld = JSON.stringify({ "@context": "https://schema.org", "@graph": [{ "@type": "ImageObject", license: "https://creativecommons.org/licenses/by/4.0/", creator: { name: "Jane Doe" }, copyrightHolder: { name: "Studio X" } }] });
  it("reads JSON-LD, rel=license and meta; stores data only", () => {
    const c = extractCredit({ jsonLd: [ld, "{bad json"], links: [], metas: { "og:site_name": "Behance", author: "Somebody Else" }, pageUrl: "https://p.com/x", imageUrl: "https://p.com/i.jpg" });
    assert.deepEqual(c.creators, ["Jane Doe", "Somebody Else"]);
    assert.equal(c.licenseUrl, "https://creativecommons.org/licenses/by/4.0/");
    assert.equal(c.copyrightHolder, "Studio X");
    assert.equal(c.siteName, "Behance");
  });
  it("falls back to rel=license and survives an empty page", () => {
    assert.equal(extractCredit({ links: [{ rel: "license", href: "https://example.com/terms" }] }).licenseUrl, "https://example.com/terms");
    assert.deepEqual(extractCredit({}).creators, []);
  });
});

describe("keep helpers", () => {
  it("quick keep decision and last-collection fallback", () => {
    assert.equal(decideKeep({ quickKeep: true }), "save-now");
    assert.equal(decideKeep({ quickKeep: true, hasTarget: false }), "open-panel");
    assert.equal(decideKeep({ quickKeep: false }), "open-panel");
    assert.equal(decideKeep({}), "open-panel");
    assert.equal(pickCollection("c1", [{ id: "c1" }]), "c1");
    assert.equal(pickCollection("gone", [{ id: "c1" }]), "all");
  });
  it("chunks and builds batch payloads with URLs, source and credit only", () => {
    assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
    const [item] = buildBatchItems([{ url: "https://x.com/a.jpg", width: 800, height: 600, alt: "A" }], { pageUrl: "https://x.com/p", title: "Page", credit: { creators: ["J"] } });
    assert.equal(item.assetUrl, "https://x.com/a.jpg");
    assert.equal(item.sourceUrl, "https://x.com/p");
    assert.equal(item.captureContext.credit.imageUrl, "https://x.com/a.jpg");
    assert.ok(!JSON.stringify(item).includes("data:"));
  });
  it("sums batch responses into one line", () => {
    const s = summarizeBatches([{ kept: 3, duplicates: 1, failed: 0, results: [{ status: "kept", objectId: "a" }] }, { kept: 2, duplicates: 2, failed: 1, results: [{ status: "kept", objectId: "b" }] }]);
    assert.equal(s.text, "Kept 5 · 3 skipped (already kept) · 1 failed");
    assert.deepEqual(s.ids, ["a", "b"]);
  });
  it("text fragment link and #tag parsing", () => {
    assert.equal(textFragmentUrl("https://a.com/p", "hello world"), "https://a.com/p#:~:text=hello%20world");
    const long = "start words ".repeat(20) + "end of the passage";
    assert.match(textFragmentUrl("https://a.com/p", long), /#:~:text=[^,]+,[^,]+$/);
    assert.equal(textFragmentUrl("not a url", "x"), "not a url");
    assert.deepEqual(parseTagsAndNote("great layout #poster #สีส้ม note"), { tags: ["poster", "สีส้ม"], note: "great layout note" });
  });
});
