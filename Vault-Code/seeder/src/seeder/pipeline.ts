import type { Candidate } from "./adapters/types";
import { DOWNLOAD_TIMEOUT_MS, MAX_DOWNLOAD_BYTES, type RenditionSize } from "./config";
import { fetchBuffer, HttpError, TooLargeError } from "./http";
import { computeBlurhash, passesQuality, readImageInfo, visionJpeg, webpRenditions } from "./images";
import { licenseGate, type RejectReason } from "./license";
import { computePhash } from "./phash";
import type { SeederRepo } from "./repo";
import { analyzeImage, VisionOutputError, type VisionInput, type VisionResult } from "./vision";

export type ItemOutcome =
  | { status: "published"; sourceId: string }
  | { status: "rejected"; sourceId: string; reason: RejectReason };

export type PipelineDeps = {
  repo: SeederRepo;
  download?: (url: string) => Promise<Buffer>;
  vision?: (input: VisionInput) => Promise<VisionResult>;
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

/**
 * normalize -> license gate -> pHash dedupe -> quality -> moderation + AI tags -> WebP + blurhash -> upsert.
 * Rejections are written as rows; transient failures (network, 5xx, 429, AI API errors) throw so Inngest retries.
 */
export async function processCandidate(c: Candidate, ctx: PipelineContext, deps: PipelineDeps): Promise<ItemOutcome> {
  const { repo } = deps;
  const download = deps.download ?? defaultDownload;
  const vision = deps.vision ?? ((input: VisionInput) => analyzeImage(input));

  const reject = async (reason: RejectReason, extra?: Parameters<SeederRepo["recordRejected"]>[3]): Promise<ItemOutcome> => {
    await repo.recordRejected(c, ctx.category, reason, extra);
    return { status: "rejected", sourceId: c.sourceId, reason };
  };

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
  try {
    info = await readImageInfo(image);
    phash = await computePhash(image);
  } catch (err) {
    return reject("download_failed", { note: `decode: ${(err as Error).message}` });
  }

  const duplicateOf = await repo.findSimilar(phash);
  if (duplicateOf) return reject("duplicate_phash", { phash, duplicateOf, width: info.width, height: info.height });

  if (!passesQuality(info)) return reject("below_min_resolution", { phash, width: info.width, height: info.height });

  let ai: VisionResult;
  try {
    ai = await vision({ jpeg: await visionJpeg(image), title: c.title, categories: ctx.categories, hintCategory: ctx.category });
  } catch (err) {
    if (err instanceof VisionOutputError) return reject("ai_invalid_output", { phash, width: info.width, height: info.height, note: err.message });
    throw err;
  }
  if (!ai.safe) {
    return reject("moderation_blocked", { phash, width: info.width, height: info.height, note: ai.unsafe_reason ?? "unsafe" });
  }

  const [renditions, blurhash] = await Promise.all([webpRenditions(image), computeBlurhash(image)]);
  const paths = { sm: renditionPath(c, "sm"), md: renditionPath(c, "md"), lg: renditionPath(c, "lg") };
  await Promise.all((Object.keys(paths) as RenditionSize[]).map((size) => repo.uploadRendition(paths[size], renditions[size])));

  await repo.publish({
    candidate: c,
    category: ctx.category,
    phash,
    width: info.width,
    height: info.height,
    blurhash,
    paths,
    ai: { category: ai.category, tags: ai.tags, style: ai.style, colors: ai.colors },
  });
  return { status: "published", sourceId: c.sourceId };
}
