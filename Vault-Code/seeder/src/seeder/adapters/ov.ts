import { CC0_URL } from "../config";
import { fetchJson, RateLimiter } from "../http";
import type { Candidate, FetchBatchResult, SourceAdapter } from "./types";

const API = "https://api.openverse.org/v1/images/";
const PAGE_SIZE = 20; // anonymous max
/**
 * Curated institutions/projects. Openverse also indexes Flickr user uploads, whose license labels we can't vouch for:
 * add "flickr" to OPENVERSE_SOURCES only if you accept that risk (it cannot be limited to Flickr Commons here).
 */
const DEFAULT_SOURCES = "smk,waltersartmuseum,wellcome_collection,europeana,wikimedia,rijksmuseum,nypl,brooklynmuseum";
/** Openverse license codes -> our license keys. NC/ND codes are deliberately absent. */
const LICENSE_MAP: Record<string, string> = { cc0: "cc0", pdm: "pdm", by: "cc-by", "by-sa": "cc-by-sa" };
const LICENSE_LABEL: Record<string, string> = { cc0: "CC0", pdm: "Public Domain Mark", "cc-by": "CC BY", "cc-by-sa": "CC BY-SA" };
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
  license_version?: string | null;
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

/** Openverse license filter; OPENVERSE_LICENSES can narrow it (e.g. "cc0,pdm"). Unknown codes are dropped. */
function licenses(): string {
  const wanted = (process.env.OPENVERSE_LICENSES || Object.keys(LICENSE_MAP).join(","))
    .split(",")
    .map((l) => l.trim().toLowerCase())
    .filter((l) => l in LICENSE_MAP);
  return (wanted.length ? wanted : Object.keys(LICENSE_MAP)).join(",");
}

function ourLicense(img: OvImage): string | null {
  return LICENSE_MAP[(img.license || "").toLowerCase()] ?? null;
}

export function isUsableOvImage(img: OvImage): boolean {
  return (
    ourLicense(img) !== null &&
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
  const license = ourLicense(img) ?? (img.license || "unknown").toLowerCase();
  const version = (img.license_version || "").trim();
  const label = `${LICENSE_LABEL[license] ?? license.toUpperCase()}${version && license.startsWith("cc-by") ? ` ${version}` : ""}`;
  const licenseUrl = license === "cc0" ? CC0_URL : img.license_url || null;
  return {
    source: "ov",
    sourceId: img.id,
    sourceUrl: objectUrl,
    originalImageUrl: (img.url || "").trim(),
    title,
    license,
    licenseUrl,
    // Title, author, source and license: what CC BY / BY-SA ask a reuser to show.
    attribution: [`"${title}"`, artist && `by ${artist}`, `via ${institution} (Openverse)`, label].filter(Boolean).join(", ") + ".",
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
      license: licenses(),
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
