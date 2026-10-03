import { CC0_URL } from "../config";
import { fetchJson, RateLimiter } from "../http";
import type { Candidate, FetchBatchResult, SourceAdapter } from "./types";

const API = "https://api.openverse.org/v1/images/";
const PAGE_SIZE = 20; // anonymous max
/** Curated institutions only: Openverse also indexes Flickr/user uploads whose CC0 label we can't vouch for. */
const DEFAULT_SOURCES = "smk,waltersartmuseum,wellcome_collection,europeana,wikimedia";
/** Anonymous limit is 20/min and 200/day; stay well under the burst limit. */
const limiter = new RateLimiter(4000);

export type OvImage = {
  id: string;
  title?: string | null;
  url?: string | null;
  foreign_landing_url?: string | null;
  creator?: string | null;
  creator_url?: string | null;
  license?: string | null;
  license_url?: string | null;
  provider?: string | null;
  source?: string | null;
  width?: number | null;
  height?: number | null;
  mature?: boolean | null;
};

type OvResponse = { result_count: number; page_count: number; results: OvImage[] };

function sources(): string {
  return (process.env.OPENVERSE_SOURCES || DEFAULT_SOURCES).trim();
}

export function isUsableOvImage(img: OvImage): boolean {
  return (
    (img.license || "").toLowerCase() === "cc0" &&
    !img.mature &&
    /^https:\/\//.test(img.url || "") &&
    /^https:\/\//.test(img.foreign_landing_url || "")
  );
}

export function normalizeOvImage(img: OvImage): Candidate {
  const title = (img.title || "").trim().slice(0, 400) || "Untitled";
  const artist = (img.creator || "").trim().slice(0, 200);
  const institution = (img.source || img.provider || "Openverse").trim();
  const objectUrl = (img.foreign_landing_url || "").trim();
  const cc0 = (img.license || "").toLowerCase() === "cc0";
  return {
    source: "ov",
    sourceId: img.id,
    sourceUrl: objectUrl,
    originalImageUrl: (img.url || "").trim(),
    title,
    license: cc0 ? "cc0" : (img.license || "unknown").toLowerCase(),
    licenseUrl: cc0 ? CC0_URL : img.license_url || null,
    attribution: [title, artist, `via ${institution} (Openverse)`].filter(Boolean).join(", ") + ".",
    attributionJson: {
      artist,
      title,
      date: "",
      credit_line: "",
      institution,
      institution_url: img.creator_url || objectUrl,
      object_url: objectUrl,
    },
    sourceMeta: { provider: img.provider ?? null, ov_source: img.source ?? null, full_width: img.width ?? null, full_height: img.height ?? null },
  };
}

export class OpenverseAdapter implements SourceAdapter {
  readonly id = "ov" as const;

  async fetchBatch(query: string, cursor: number, _size: number): Promise<FetchBatchResult> {
    const page = Math.floor(cursor / PAGE_SIZE) + 1;
    const params = new URLSearchParams({
      q: query,
      license: "cc0",
      source: sources(),
      mature: "false",
      page: String(page),
      page_size: String(PAGE_SIZE),
    });
    const res = await fetchJson<OvResponse>(`${API}?${params}`, { limiter });

    const candidates: Candidate[] = [];
    let skipped = 0;
    for (const img of res.results ?? []) {
      if (isUsableOvImage(img)) candidates.push(normalizeOvImage(img));
      else skipped++;
    }
    const scanned = res.results?.length ?? 0;
    const next = (page - 1) * PAGE_SIZE + scanned;
    const total = res.result_count ?? 0;
    return { candidates, nextCursor: scanned > 0 && page < (res.page_count ?? 0) ? next : null, total, scanned, skipped };
  }
}
