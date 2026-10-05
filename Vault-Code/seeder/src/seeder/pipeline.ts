import { createHash } from "node:crypto";
import { AiOutputError, type AiClient, type Tag, type Usage } from "./ai";
import type { Candidate } from "./adapters/types";
import { DOWNLOAD_TIMEOUT_MS, MAX_DOWNLOAD_BYTES, type RenditionSize } from "./config";
import {
  altTextFromTags,
  analyzePixels,
  cfg,
  detectDomains,
  groupsToAsk,
  isPassportComplete,
  mergeTags,
  publishDecision,
  tagsFromMetadata,
  tax,
} from "./engine";
import { fetchBuffer, HttpError, TooLargeError } from "./http";
import { computeBlurhash, passesQuality, pixelSample, readImageInfo, visionJpeg, webpRenditions } from "./images";
import { licenseGate, type RejectReason } from "./license";
import { computePhash } from "./phash";
import type { PublishRow, SeederRepo } from "./repo";

export type ItemOutcome =
  | { status: "published"; sourceId: string }
  | { status: "review"; sourceId: string; reason: string }
  | { status: "rejected"; sourceId: string; reason: RejectReason };

export type PipelineDeps = {
  repo: SeederRepo;
  download?: (url: string) => Promise<Buffer>;
  ai?: AiClient;
};

export type PipelineContext = {
  category: string;
  categories: readonly string[];
};

export function renditionPath(c: Candidate, size: RenditionSize): string {
  const safeId = c.sourceId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${c.source}/${safeId}/${size}.webp`;
}

function defaultDownload(url: string): Promise<Buffer> {
  return fetchBuffer(url, MAX_DOWNLOAD_BYTES, { timeoutMs: DOWNLOAD_TIMEOUT_MS, retries: 1 });
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Source metadata -> hints for the taxonomy mapper (phase 05.B). */
export function hintsFrom(c: Candidate) {
  const m = c.sourceMeta ?? {};
  return {
    title: c.title,
    classification: str(m.classification) || str(m.object_name),
    medium: str(m.medium),
    era: str(m.period) || str(c.attributionJson?.date),
    culture: str(m.culture),
    institution: c.attributionJson?.institution,
    year: c.attributionJson?.date,
    keywords: Array.isArray(m.source_tags) ? (m.source_tags as unknown[]).filter((t): t is string => typeof t === "string") : [],
    description: str(m.alt_text),
  };
}

function addUsage(a: Usage | undefined, b: Usage | undefined): Usage | undefined {
  if (!a) return b;
  if (!b) return a;
  return { input_tokens: a.input_tokens + b.input_tokens, output_tokens: a.output_tokens + b.output_tokens };
}

/**
 * Cost-ordered cascade (never pay for AI on an image that can be rejected or tagged for free first):
 *   free gates (licence, dedupe, resolution, blank) -> A pixels (palette/metrics/colour tags) -> B source metadata
 *   -> C1 tiny AI (discipline + quality + safety) -> C2 deep AI only for missing groups -> publish rules.
 * Rejections are rows with a reason; transient failures (network, 5xx, 429, AI API errors) throw so Inngest retries.
 */
export async function processCandidate(c: Candidate, ctx: PipelineContext, deps: PipelineDeps): Promise<ItemOutcome> {
  const { repo } = deps;
  const download = deps.download ?? defaultDownload;
  const ai = deps.ai;
  if (!ai) throw new Error("AI client missing");

  const reject = async (reason: RejectReason, extra?: Parameters<SeederRepo["recordRejected"]>[3]): Promise<ItemOutcome> => {
    await repo.recordRejected(c, ctx.category, reason, extra);
    return { status: "rejected", sourceId: c.sourceId, reason };
  };

  // ---- free gates
  const gate = licenseGate(c);
  if (!gate.ok) return reject(gate.reason);

  let image: Buffer;
  try {
    image = await download(c.originalImageUrl);
  } catch (err) {
    if (err instanceof TooLargeError || (err instanceof HttpError && err.status < 500 && err.status !== 429)) {
      return reject("download_failed", { note: err.message });
    }
    throw err;
  }

  let phash: string;
  let info: Awaited<ReturnType<typeof readImageInfo>>;
  let pixels: Awaited<ReturnType<typeof pixelSample>>;
  try {
    info = await readImageInfo(image);
    phash = await computePhash(image);
    pixels = await pixelSample(image);
  } catch (err) {
    return reject("download_failed", { note: `decode: ${(err as Error).message}` });
  }

  const sha256 = createHash("sha256").update(image).digest("hex");
  // Taken-down images (same bytes, or a near-identical perceptual hash) never come back, whatever the source or id.
  if (repo.isBlocked && (await repo.isBlocked(sha256, phash))) {
    return reject("blocked_image", { phash, sha256, width: info.width, height: info.height });
  }

  const duplicateOf = await repo.findSimilar(phash);
  if (duplicateOf) return reject("duplicate_phash", { phash, duplicateOf, width: info.width, height: info.height });
  if (!passesQuality(info)) return reject("below_min_resolution", { phash, width: info.width, height: info.height });

  // ---- A (free): palette, metrics, colour tags. Also the blank-image gate.
  const pix = analyzePixels(pixels, cfg, { width: info.width, height: info.height });
  if (pix.blank) return reject("blank_or_blurry", { phash, width: info.width, height: info.height });

  // ---- B (free): source metadata -> dictionary ids + layer-B columns
  const meta = tagsFromMetadata(hintsFrom(c), tax);

  // ---- C1 (tiny AI): discipline + quality + safety. Always runs for seeds: the feed is public, so moderation is mandatory.
  let triage;
  try {
    triage = await ai.triage({ jpeg: await visionJpeg(image, 256), title: c.title });
  } catch (err) {
    if (err instanceof AiOutputError) return reject("ai_invalid_output", { phash, width: info.width, height: info.height, note: err.message });
    throw err;
  }
  let usage = triage.usage;
  if (triage.safetyFlag) {
    return reject("moderation_blocked", { phash, width: info.width, height: info.height, note: "safety flag" });
  }
  if (triage.quality < cfg.QUALITY_REJECT) {
    return reject("low_quality", { phash, width: info.width, height: info.height, note: `quality ${triage.quality}` });
  }

  // ---- C2 (deep AI): ask ONLY for groups not already settled by A/B, for the detected domains + cross-cutting
  const early: Tag[] = [...(pix.tags as Tag[]), ...(meta.tags as Tag[])];
  const domains = [...new Set([...triage.domains, ...detectDomains(meta.tags, tax)])];
  const groups = groupsToAsk(domains, mergeTags([early], tax, { minConf: cfg.TAG_MIN_CONF }).tagsJson, tax, cfg);
  let deepTags: Tag[] = [];
  let keywords: string[] = [];
  let level = 1;
  if (groups.length) {
    try {
      const deep = await ai.deep({ jpeg: await visionJpeg(image, 512), title: c.title, groups });
      deepTags = deep.tags;
      keywords = deep.keywords;
      usage = addUsage(usage, deep.usage);
      level = 2;
    } catch (err) {
      if (!(err instanceof AiOutputError)) throw err;
      // Bad C2 JSON: keep what A/B/C1 settled; the item lands in review below instead of being thrown away.
    }
  }
  if (usage) c.sourceMeta = { ...c.sourceMeta, ai_usage: usage };

  // ---- merge + publish rules
  const { tagsJson, tagsIds } = mergeTags([early, deepTags], tax, { minConf: cfg.TAG_MIN_CONF });
  const labels = (ids: string[]) => ids.map((id) => tax.termById.get(id)?.en?.[0]).filter((s): s is string => !!s);
  const openKeywords = [...new Set([...labels(tagsJson.filter((t: Tag) => t.conf >= cfg.TAG_MIN_CONF).map((t: Tag) => t.id)), ...keywords])].slice(0, 24);
  const style = labels(tagsJson.filter((t: Tag) => t.facet === "sty.design_style" && t.conf >= cfg.TAG_MIN_CONF).map((t: Tag) => t.id))[0] ?? "";

  const [renditions, blurhash] = await Promise.all([webpRenditions(image), computeBlurhash(image)]);
  const paths = { sm: renditionPath(c, "sm"), md: renditionPath(c, "md"), lg: renditionPath(c, "lg") };

  const passportComplete = isPassportComplete({
    title: c.title, source_url: c.sourceUrl, attribution: c.attribution, license: c.license,
    width: info.width, height: info.height, blurhash, phash,
    image_sm_path: paths.sm, image_md_path: paths.md, image_lg_path: paths.lg, palette: pix.palette,
  });
  const decision = publishDecision({ quality: triage.quality, safetyFlag: false, tagsJson, passportComplete }, cfg);
  if (decision.status === "rejected") return reject("low_quality", { phash, width: info.width, height: info.height, note: decision.reason });

  await Promise.all((Object.keys(paths) as RenditionSize[]).map((size) => repo.uploadRendition(paths[size], renditions[size])));
  const row: PublishRow = {
    candidate: c,
    category: ctx.category,
    phash,
    width: info.width,
    height: info.height,
    blurhash,
    paths,
    status: decision.status === "published" ? "published" : "review",
    passport: {
      tagsJson,
      tagsIds,
      palette: pix.palette,
      metrics: pix.metrics,
      quality: triage.quality,
      enrichLevel: level,
      statusReason: decision.reason,
      layerB: meta.layerB,
      altText: altTextFromTags(tagsJson, tax),
      openKeywords,
      style,
      colors: pix.palette.map((p: { hex: string }) => p.hex),
    },
  };
  row.sha256 = sha256;
  await repo.publish(row);
  return decision.status === "published"
    ? { status: "published", sourceId: c.sourceId }
    : { status: "review", sourceId: c.sourceId, reason: decision.reason };
}
