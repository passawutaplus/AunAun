import { CC0_URL, userAgent } from "../config";
import { fetchJson, RateLimiter } from "../http";
import type { Candidate, FetchBatchResult, SourceAdapter } from "./types";

const API = "https://api.artic.edu/api/v1/artworks/search";
const DEFAULT_IIIF = "https://www.artic.edu/iiif/2";
const INSTITUTION = "The Art Institute of Chicago";
const INSTITUTION_URL = "https://www.artic.edu/";
/** AIC search returns 403 once from + size exceeds 1,000. */
const MAX_SEARCH_WINDOW = 1000;
/** Largest width AIC serves for public-domain IIIF images. */
const LARGE_WIDTH = 1686;
const FIELDS = [
  "id",
  "title",
  "image_id",
  "artist_title",
  "artist_display",
  "date_display",
  "credit_line",
  "is_public_domain",
  "thumbnail",
  "classification_title",
  "medium_display",
  "style_title",
  "place_of_origin",
  "dimensions",
  "main_reference_number",
  "department_title",
  "artwork_type_title",
].join(",");

export type AicArtwork = {
  id: number;
  title?: string | null;
  image_id?: string | null;
  artist_title?: string | null;
  artist_display?: string | null;
  date_display?: string | null;
  credit_line?: string | null;
  is_public_domain?: boolean;
  thumbnail?: { width?: number; height?: number; alt_text?: string | null } | null;
  classification_title?: string | null;
  medium_display?: string | null;
  style_title?: string | null;
  place_of_origin?: string | null;
  dimensions?: string | null;
  main_reference_number?: string | null;
  department_title?: string | null;
  artwork_type_title?: string | null;
};

type AicSearchResponse = {
  pagination: { total: number; offset: number; limit: number };
  data: AicArtwork[];
  config?: { iiif_url?: string };
};

/** AIC publishes no hard limit; keep it gentle. */
const limiter = new RateLimiter(400);

export function buildAicAttribution(parts: { artist: string; title: string; date: string }): string {
  const lead = [parts.artist, parts.title].filter(Boolean).join(". ");
  const withDate = parts.date ? `${lead}, ${parts.date}` : lead;
  return withDate ? `${withDate}. ${INSTITUTION}.` : `${INSTITUTION}.`;
}

export function aicImageUrl(art: AicArtwork, iiifBase = DEFAULT_IIIF): string {
  if (!art.image_id) return "";
  const width = (art.thumbnail?.width ?? 0) >= LARGE_WIDTH ? LARGE_WIDTH : 843;
  return `${iiifBase.replace(/\/$/, "")}/${art.image_id}/full/${width},/0/default.jpg`;
}

export function isUsableAicArtwork(art: AicArtwork): boolean {
  return art.is_public_domain === true && Boolean(art.image_id);
}

export function normalizeAicArtwork(art: AicArtwork, iiifBase = DEFAULT_IIIF): Candidate {
  const title = (art.title || "").trim() || "Untitled";
  const artist = (art.artist_title || "").trim();
  const date = (art.date_display || "").trim();
  const creditLine = (art.credit_line || "").trim();
  const objectUrl = `https://www.artic.edu/artworks/${art.id}`;

  return {
    source: "aic",
    sourceId: String(art.id),
    sourceUrl: objectUrl,
    originalImageUrl: aicImageUrl(art, iiifBase),
    title,
    license: art.is_public_domain === true ? "cc0" : "restricted",
    licenseUrl: art.is_public_domain === true ? CC0_URL : null,
    attribution: buildAicAttribution({ artist, title, date }),
    attributionJson: {
      artist,
      title,
      date,
      credit_line: creditLine,
      institution: INSTITUTION,
      institution_url: INSTITUTION_URL,
      object_url: objectUrl,
    },
    sourceMeta: {
      classification: art.classification_title ?? null,
      medium: art.medium_display ?? null,
      style: art.style_title ?? null,
      artist_display: art.artist_display ?? null,
      object_name: art.artwork_type_title ?? null,
      dimensions: art.dimensions ?? null,
      accession_number: art.main_reference_number ?? null,
      department: art.department_title ?? null,
      geography: art.place_of_origin ?? null,
      alt_text: art.thumbnail?.alt_text ?? null,
      full_width: art.thumbnail?.width ?? null,
      full_height: art.thumbnail?.height ?? null,
    },
  };
}

export class ArtInstituteAdapter implements SourceAdapter {
  readonly id = "aic" as const;

  async fetchBatch(query: string, cursor: number, size: number): Promise<FetchBatchResult> {
    const limit = Math.min(size, 100, MAX_SEARCH_WINDOW - cursor);
    if (limit <= 0) return { candidates: [], nextCursor: null, total: 0, scanned: 0, skipped: 0 };

    const url =
      `${API}?q=${encodeURIComponent(query)}` +
      `&query[term][is_public_domain]=true&fields=${FIELDS}&from=${cursor}&size=${limit}`;
    const res = await fetchJson<AicSearchResponse>(url, {
      limiter,
      headers: { "AIC-User-Agent": userAgent() },
    });

    const iiif = res.config?.iiif_url || DEFAULT_IIIF;
    const candidates: Candidate[] = [];
    let skipped = 0;
    for (const art of res.data ?? []) {
      if (isUsableAicArtwork(art)) candidates.push(normalizeAicArtwork(art, iiif));
      else skipped++;
    }

    const scanned = res.data?.length ?? 0;
    const next = cursor + scanned;
    const reachable = Math.min(res.pagination?.total ?? 0, MAX_SEARCH_WINDOW);
    return {
      candidates,
      nextCursor: scanned > 0 && next < reachable ? next : null,
      total: res.pagination?.total ?? 0,
      scanned,
      skipped,
    };
  }
}
