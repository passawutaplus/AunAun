import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import type { Candidate } from "./adapters/types";
import { HttpError } from "./http";
import { processCandidate } from "./pipeline";
import type { PublishRow, RejectExtra, SeederRepo } from "./repo";
import type { VisionResult } from "./vision";

class FakeRepo implements SeederRepo {
  rejected: { reason: string; extra?: RejectExtra }[] = [];
  published: PublishRow[] = [];
  uploads: string[] = [];
  similar: string | null = null;

  async existingSourceIds() {
    return new Set<string>();
  }
  async recordRejected(_c: Candidate, _category: string, reason: string, extra?: RejectExtra) {
    this.rejected.push({ reason, extra });
  }
  async findSimilar() {
    return this.similar;
  }
  async uploadRendition(path: string) {
    this.uploads.push(path);
  }
  async publish(row: PublishRow) {
    this.published.push(row);
  }
  async categories() {
    return ["textile"];
  }
}

const candidate: Candidate = {
  source: "met",
  sourceId: "450741",
  sourceUrl: "https://www.metmuseum.org/art/collection/search/450741",
  originalImageUrl: "https://images.metmuseum.org/x.jpg",
  title: "Textile",
  license: "cc0",
  licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
  attribution: "Textile, 13th century. The Metropolitan Museum of Art, New York, Rogers Fund, 1947.",
  attributionJson: { artist: "", title: "Textile", date: "13th century", credit_line: "Rogers Fund, 1947", institution: "The Metropolitan Museum of Art", institution_url: "https://www.metmuseum.org/", object_url: "https://www.metmuseum.org/art/collection/search/450741" },
  sourceMeta: {},
};

const ctx = { category: "textile", categories: ["textile"] as const };

const safeVision: VisionResult = { safe: true, unsafe_reason: null, category: "textile", tags: ["silk", "weave", "floral"], style: "medieval", colors: ["#aa3311"] };

function image(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 180, g: 60, b: 30 } } })
    .composite([{ input: Buffer.from(`<svg width="${width}" height="${height}"><circle cx="${width / 3}" cy="${height / 2}" r="${height / 4}" fill="#fff"/></svg>`) }])
    .jpeg()
    .toBuffer();
}

test("good image is published with three renditions and blurhash", async () => {
  const repo = new FakeRepo();
  const big = await image(1200, 900);
  const out = await processCandidate(candidate, ctx, { repo, download: async () => big, vision: async () => safeVision });
  assert.deepEqual(out, { status: "published", sourceId: "450741" });
  assert.deepEqual(repo.uploads.sort(), ["met/450741/lg.webp", "met/450741/md.webp", "met/450741/sm.webp"]);
  assert.equal(repo.published[0].width, 1200);
  assert.ok(repo.published[0].blurhash.length > 6);
  assert.match(repo.published[0].phash, /^[01]{64}$/);
});

test("license gate runs before any download", async () => {
  const repo = new FakeRepo();
  let downloaded = false;
  const out = await processCandidate({ ...candidate, license: "restricted" }, ctx, {
    repo,
    download: async () => {
      downloaded = true;
      return Buffer.alloc(0);
    },
  });
  assert.equal(out.status, "rejected");
  assert.equal(downloaded, false);
  assert.equal(repo.rejected[0].reason, "license_not_allowed");
});

test("duplicate is rejected before vision", async () => {
  const repo = new FakeRepo();
  repo.similar = "existing-id";
  let visionCalled = false;
  const out = await processCandidate(candidate, ctx, {
    repo,
    download: async () => image(1200, 900),
    vision: async () => {
      visionCalled = true;
      return safeVision;
    },
  });
  assert.deepEqual(out, { status: "rejected", sourceId: "450741", reason: "duplicate_phash" });
  assert.equal(repo.rejected[0].extra?.duplicateOf, "existing-id");
  assert.equal(visionCalled, false);
});

test("small image is rejected for resolution", async () => {
  const repo = new FakeRepo();
  const out = await processCandidate(candidate, ctx, { repo, download: async () => image(800, 600), vision: async () => safeVision });
  assert.equal(out.status === "rejected" && out.reason, "below_min_resolution");
});

test("unsafe image is blocked and nothing is uploaded", async () => {
  const repo = new FakeRepo();
  const out = await processCandidate(candidate, ctx, {
    repo,
    download: async () => image(1200, 900),
    vision: async () => ({ ...safeVision, safe: false, unsafe_reason: "nudity" }),
  });
  assert.equal(out.status === "rejected" && out.reason, "moderation_blocked");
  assert.equal(repo.uploads.length, 0);
});

test("404 download is a rejection, 503 is retried by throwing", async () => {
  const repo = new FakeRepo();
  const out = await processCandidate(candidate, ctx, {
    repo,
    download: async () => {
      throw new HttpError(404, "x");
    },
  });
  assert.equal(out.status === "rejected" && out.reason, "download_failed");

  await assert.rejects(
    processCandidate(candidate, ctx, {
      repo,
      download: async () => {
        throw new HttpError(503, "x");
      },
    }),
    HttpError,
  );
});
