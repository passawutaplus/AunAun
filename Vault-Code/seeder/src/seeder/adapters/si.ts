import { CC0_URL } from "../config";
import { fetchJson, RateLimiter } from "../http";
import type { Candidate, FetchBatchResult, SourceAdapter } from "./types";

const API = "https://api.si.edu/openaccess/api/v1.0/search";
const INSTITUTION = "Smithsonian Institution";
const INSTITUTION_URL = "https://www.si.edu/openaccess";
/** Long-edge request to the IDS delivery service; keeps downloads well under the size cap. */
const IMAGE_MAX_PX = 2400;

type SiText = { label?: string; content?: string };

type SiMedia = {
  type?: string;
  idsId?: string;
  usage?: { access?: string };
  resources?: { label?: string; width?: number; height?: number }[];
};

export type SiRow = {
  id: string;
  title?: string;
  unitCode?: string;
  content?: {
    descriptiveNonRepeating?: {
      record_ID?: string;
      record_link?: string;
      guid?: string;
      data_source?: string;
      title?: SiText;
      online_media?: { media?: SiMedia[] };
    };
    freetext?: Record<string, SiText[] | undefined>;
  };
};

type SiSearchResponse = { response: { rows: SiRow[]; rowCount: number } };

/** api.data.gov keys allow 1,000 req/h; DEMO_KEY far less. */
const limiter = new RateLimiter(1000);

function apiKey(): string {
  return process.env.SMITHSONIAN_API_KEY || "DEMO_KEY";
}

function first(row: SiRow, field: string, label?: RegExp): string {
  const list = row.content?.freetext?.[field] ?? [];
  const hit = label ? list.find((t) => label.test(t.label || "")) : list[0];
  return (hit?.content || "").trim();
}

function clean(value: string | undefined | null): string | null {
  const text = (value || "").trim();
  return text ? text.slice(0, 400) : null;
}

export function siCc0Image(row: SiRow): SiMedia | null {
  const media = row.content?.descriptiveNonRepeating?.online_media?.media ?? [];
  return media.find((m) => m.type === "Images" && m.usage?.access === "CC0" && Boolean(m.idsId)) ?? null;
}

export function siImageUrl(media: SiMedia): string {
  return `https://ids.si.edu/ids/deliveryService?id=${encodeURIComponent(media.idsId || "")}&max=${IMAGE_MAX_PX}`;
}

export function isUsableSiRow(row: SiRow): boolean {
  return siCc0Image(row) !== null && /^https?:\/\//.test(siObjectUrl(row));
}

export function siObjectUrl(row: SiRow): string {
  const d = row.content?.descriptiveNonRepeating;
  return (d?.record_link || d?.guid || "").trim().replace(/^http:/, "https:");
}

export function buildSiAttribution(parts: { title: string; artist: string; date: string; unit: string }): string {
  const head = [parts.title, parts.artist, parts.date].filter(Boolean).join(", ");
  const credit = [parts.unit, INSTITUTION].filter(Boolean).join(", ");
  return head ? `${head}. ${credit}.` : `${credit}.`;
}

export function normalizeSiRow(row: SiRow): Candidate {
  const d = row.content?.descriptiveNonRepeating;
  const media = siCc0Image(row);
  const title = (d?.title?.content || row.title || "").trim() || "Untitled";
  const artist = first(row, "name");
  const date = first(row, "date");
  const creditLine = first(row, "creditLine");
  const unit = (d?.data_source || first(row, "dataSource")).trim();
  const objectUrl = siObjectUrl(row);
  const full = media?.resources?.find((r) => r.width && r.height);

  return {
    source: "si",
    sourceId: d?.record_ID || row.id,
    sourceUrl: objectUrl,
    originalImageUrl: media ? siImageUrl(media) : "",
    title,
    license: media ? "cc0" : "restricted",
    licenseUrl: media ? CC0_URL : null,
    attribution: buildSiAttribution({ title, artist, date, unit }),
    attributionJson: {
      artist,
      title,
      date,
      credit_line: creditLine,
      institution: unit ? `${unit}, ${INSTITUTION}` : INSTITUTION,
      institution_url: INSTITUTION_URL,
      object_url: objectUrl,
    },
    sourceMeta: {
      object_name: clean(first(row, "objectType")),
      medium: clean(first(row, "physicalDescription", /medium/i) || first(row, "physicalDescription")),
      dimensions: clean(first(row, "physicalDescription", /dimension/i)),
      geography: clean(first(row, "place")),
      accession_number: clean(first(row, "identifier")),
      repository: clean(unit),
      full_width: full?.width ?? null,
      full_height: full?.height ?? null,
    },
  };
}

export class SmithsonianAdapter implements SourceAdapter {
  readonly id = "si" as const;

  async fetchBatch(query: string, cursor: number, size: number): Promise<FetchBatchResult> {
    const rows = Math.min(size, 100);
    const params = new URLSearchParams({
      q: `${query} AND online_media_type:Images AND media_usage:CC0`,
      start: String(cursor),
      rows: String(rows),
      api_key: apiKey(),
    });
    const res = await fetchJson<SiSearchResponse>(`${API}?${params}`, { limiter });

    const list = res.response?.rows ?? [];
    const candidates: Candidate[] = [];
    let skipped = 0;
    for (const row of list) {
      if (isUsableSiRow(row)) candidates.push(normalizeSiRow(row));
      else skipped++;
    }

    const total = res.response?.rowCount ?? 0;
    const next = cursor + list.length;
    return { candidates, nextCursor: list.length > 0 && next < total ? next : null, total, scanned: list.length, skipped };
  }
}
