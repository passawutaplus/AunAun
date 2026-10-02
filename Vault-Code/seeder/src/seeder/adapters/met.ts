import { CC0_URL } from "../config";
import { fetchJson, HttpError, RateLimiter } from "../http";
import type { Candidate, FetchBatchResult, SourceAdapter } from "./types";

const API = "https://collectionapi.metmuseum.org/public/collection/v1";
const SEARCH_API = "https://collectionapi.metmuseum.org/public/collection/v1.1/search";
/** v1.1 search rejects offset + limit above 10,000. */
const MAX_SEARCH_WINDOW = 10_000;
const INSTITUTION = "The Metropolitan Museum of Art";
const INSTITUTION_CREDIT = "The Metropolitan Museum of Art, New York";
const INSTITUTION_URL = "https://www.metmuseum.org/";

type MetSearchResponse = { total: number; objectIDs: number[] | null };

export type MetObject = {
  objectID: number;
  isPublicDomain: boolean;
  primaryImage: string;
  primaryImageSmall?: string;
  title?: string;
  artistDisplayName?: string;
  objectDate?: string;
  creditLine?: string;
  objectURL?: string;
  department?: string;
  classification?: string;
  medium?: string;
  culture?: string;
  objectName?: string;
  dimensions?: string;
  accessionNumber?: string;
  period?: string;
  dynasty?: string;
  reign?: string;
  artistRole?: string;
  artistDisplayBio?: string;
  city?: string;
  state?: string;
  country?: string;
  region?: string;
  repository?: string;
  tags?: { term: string }[] | null;
};

function clean(value: string | undefined | null): string | null {
  const text = (value || "").trim();
  return text ? text.slice(0, 400) : null;
}

/** Fields shown under "About this object" in Discover; empty strings collapse to null. */
export function metObjectMeta(obj: MetObject): Record<string, unknown> {
  const place = [obj.city, obj.state, obj.country, obj.region].map((p) => (p || "").trim()).filter(Boolean);
  return {
    department: clean(obj.department),
    classification: clean(obj.classification),
    medium: clean(obj.medium),
    culture: clean(obj.culture),
    object_name: clean(obj.objectName),
    dimensions: clean(obj.dimensions),
    accession_number: clean(obj.accessionNumber),
    period: clean(obj.period),
    dynasty: clean(obj.dynasty),
    reign: clean(obj.reign),
    artist_role: clean(obj.artistRole),
    artist_bio: clean(obj.artistDisplayBio),
    geography: place.length ? [...new Set(place)].join(", ") : null,
    repository: clean(obj.repository),
    source_tags: (obj.tags ?? []).map((t) => t.term).slice(0, 20),
  };
}

/** The Met allows 80 req/s; stay well below. */
const limiter = new RateLimiter(150);

export function buildMetAttribution(parts: { title: string; artist: string; date: string; creditLine: string }): string {
  const head = [parts.title, parts.artist, parts.date].filter(Boolean).join(", ");
  const credit = [INSTITUTION_CREDIT, parts.creditLine].filter(Boolean).join(", ");
  return head ? `${head}. ${credit}.` : `${credit}.`;
}

export function isUsableMetObject(obj: MetObject): boolean {
  return obj.isPublicDomain === true && /^https:\/\//.test((obj.primaryImage || "").trim());
}

export function normalizeMetObject(obj: MetObject): Candidate {
  const title = (obj.title || "").trim() || "Untitled";
  const artist = (obj.artistDisplayName || "").trim();
  const date = (obj.objectDate || "").trim();
  const creditLine = (obj.creditLine || "").trim();
  const objectUrl = (obj.objectURL || `https://www.metmuseum.org/art/collection/search/${obj.objectID}`).replace(
    /^http:/,
    "https:",
  );

  return {
    source: "met",
    sourceId: String(obj.objectID),
    sourceUrl: objectUrl,
    originalImageUrl: (obj.primaryImage || "").trim(),
    title,
    license: obj.isPublicDomain === true ? "cc0" : "restricted",
    licenseUrl: obj.isPublicDomain === true ? CC0_URL : null,
    attribution: buildMetAttribution({ title, artist, date, creditLine }),
    attributionJson: {
      artist,
      title,
      date,
      credit_line: creditLine,
      institution: INSTITUTION,
      institution_url: INSTITUTION_URL,
      object_url: objectUrl,
    },
    sourceMeta: metObjectMeta(obj),
  };
}

export class MetMuseumAdapter implements SourceAdapter {
  readonly id = "met" as const;

  async search(query: string, offset: number, limit: number): Promise<MetSearchResponse> {
    const params = new URLSearchParams({
      hasImages: "true",
      isPublicDomain: "true",
      q: query,
      offset: String(offset),
      limit: String(limit),
    });
    return fetchJson<MetSearchResponse>(`${SEARCH_API}?${params}`, { limiter });
  }

  async fetchObject(id: number): Promise<MetObject | null> {
    try {
      return await fetchJson<MetObject>(`${API}/objects/${id}`, { limiter });
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) return null;
      throw err;
    }
  }

  async fetchBatch(query: string, cursor: number, size: number): Promise<FetchBatchResult> {
    const limit = Math.min(size, 500, MAX_SEARCH_WINDOW - cursor);
    if (limit <= 0) return { candidates: [], nextCursor: null, total: 0, scanned: 0, skipped: 0 };

    const res = await this.search(query, cursor, limit);
    const ids = res.objectIDs ?? [];
    const candidates: Candidate[] = [];
    let skipped = 0;
    for (const id of ids) {
      const obj = await this.fetchObject(id);
      // v1.1 search ignores isPublicDomain, so the check has to happen per object.
      if (obj && isUsableMetObject(obj)) candidates.push(normalizeMetObject(obj));
      else skipped++;
    }
    const next = cursor + ids.length;
    const reachable = Math.min(res.total, MAX_SEARCH_WINDOW);
    return {
      candidates,
      nextCursor: ids.length > 0 && next < reachable ? next : null,
      total: res.total,
      scanned: ids.length,
      skipped,
    };
  }
}
