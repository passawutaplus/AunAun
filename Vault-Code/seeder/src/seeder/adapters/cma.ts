import { CC0_URL } from "../config";
import { fetchJson, RateLimiter } from "../http";
import type { Candidate, FetchBatchResult, SourceAdapter } from "./types";

const API = "https://openaccess-api.clevelandart.org/api/artworks/";
const INSTITUTION = "The Cleveland Museum of Art";
const INSTITUTION_URL = "https://www.clevelandart.org/";

type CmaImage = { url?: string | null; width?: string | number | null; height?: string | number | null };

export type CmaArtwork = {
  id: number;
  accession_number?: string | null;
  share_license_status?: string | null;
  title?: string | null;
  url?: string | null;
  creation_date?: string | null;
  creditline?: string | null;
  type?: string | null;
  technique?: string | null;
  department?: string | null;
  collection?: string | null;
  culture?: string[] | null;
  measurements?: string | null;
  creators?: { description?: string | null; role?: string | null }[] | null;
  images?: { web?: CmaImage | null; print?: CmaImage | null } | null;
};

type CmaSearchResponse = { info: { total: number }; data: CmaArtwork[] };

/** CMA publishes no hard limit; keep it gentle. */
const limiter = new RateLimiter(300);

function clean(value: string | undefined | null): string | null {
  const text = (value || "").trim();
  return text ? text.slice(0, 400) : null;
}

export function buildCmaAttribution(parts: { title: string; artist: string; date: string; creditLine: string }): string {
  const head = [parts.title, parts.artist, parts.date].filter(Boolean).join(", ");
  const credit = [INSTITUTION, parts.creditLine].filter(Boolean).join(", ");
  return head ? `${head}. ${credit}.` : `${credit}.`;
}

/** Print rendition (~3000px JPEG); web rendition is usually below the 1000px quality floor. */
export function cmaImageUrl(art: CmaArtwork): string {
  const url = (art.images?.print?.url || "").trim();
  return /^https:\/\//.test(url) ? url : "";
}

export function isUsableCmaArtwork(art: CmaArtwork): boolean {
  return (art.share_license_status || "").toUpperCase() === "CC0" && Boolean(cmaImageUrl(art));
}

export function normalizeCmaArtwork(art: CmaArtwork): Candidate {
  const title = (art.title || "").trim() || "Untitled";
  const artist = (art.creators ?? []).map((c) => (c.description || "").trim()).filter(Boolean).join("; ");
  const date = (art.creation_date || "").trim();
  const creditLine = (art.creditline || "").trim().replace(/\.+$/, "");
  const objectUrl = (art.url || `https://www.clevelandart.org/art/${art.accession_number ?? art.id}`).replace(
    /^http:/,
    "https:",
  );
  const cc0 = (art.share_license_status || "").toUpperCase() === "CC0";

  return {
    source: "cma",
    sourceId: String(art.id),
    sourceUrl: objectUrl,
    originalImageUrl: cmaImageUrl(art),
    title,
    license: cc0 ? "cc0" : "restricted",
    licenseUrl: cc0 ? CC0_URL : null,
    attribution: buildCmaAttribution({ title, artist, date, creditLine }),
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
      department: clean(art.department),
      classification: clean(art.type),
      medium: clean(art.technique),
      culture: clean((art.culture ?? []).join("; ")),
      collection: clean(art.collection),
      dimensions: clean(art.measurements),
      accession_number: clean(art.accession_number),
      full_width: Number(art.images?.print?.width) || null,
      full_height: Number(art.images?.print?.height) || null,
    },
  };
}

export class ClevelandArtAdapter implements SourceAdapter {
  readonly id = "cma" as const;

  async fetchBatch(query: string, cursor: number, size: number): Promise<FetchBatchResult> {
    const limit = Math.min(size, 100);
    const params = new URLSearchParams({
      q: query,
      cc0: "1",
      has_image: "1",
      skip: String(cursor),
      limit: String(limit),
    });
    const res = await fetchJson<CmaSearchResponse>(`${API}?${params}`, { limiter });

    const candidates: Candidate[] = [];
    let skipped = 0;
    for (const art of res.data ?? []) {
      if (isUsableCmaArtwork(art)) candidates.push(normalizeCmaArtwork(art));
      else skipped++;
    }

    const scanned = res.data?.length ?? 0;
    const next = cursor + scanned;
    const total = res.info?.total ?? 0;
    return { candidates, nextCursor: scanned > 0 && next < total ? next : null, total, scanned, skipped };
  }
}
