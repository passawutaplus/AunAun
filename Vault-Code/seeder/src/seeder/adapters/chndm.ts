import { MAX_DOWNLOAD_BYTES } from "../config";
import { fetchBuffer, RateLimiter } from "../http";
import { isUsableSiRow, normalizeSiRow, type SiRow } from "./si";
import type { Candidate, FetchBatchResult, SourceAdapter } from "./types";

/**
 * Cooper Hewitt, Smithsonian Design Museum via the Smithsonian Open Access bulk dump on AWS
 * (registry.opendata.aws/smithsonian-open-access). No API key; same EDAN records as the `si` API.
 * The dump has no search, so each batch scans line-delimited JSON files and filters by the query locally.
 */
const BULK = "https://smithsonian-open-access.s3-us-west-2.amazonaws.com/metadata/edan/chndm";
/** Files are sharded by hash prefix 00..ff. */
const FILE_COUNT = 256;
/** Cursor = fileIndex * LINE_SPAN + line within that file. */
const LINE_SPAN = 1_000_000;
/** Files scanned per batch at most, so a rare query can't make one batch read the whole dump. */
const MAX_FILES_PER_BATCH = 4;

const limiter = new RateLimiter(200);
const cache = new Map<number, string[]>();

async function fileLines(index: number): Promise<string[]> {
  const hit = cache.get(index);
  if (hit) return hit;
  const name = index.toString(16).padStart(2, "0");
  const body = await fetchBuffer(`${BULK}/${name}.txt`, MAX_DOWNLOAD_BYTES, { limiter });
  const lines = body.toString("utf8").split("\n").filter(Boolean);
  if (cache.size >= 4) cache.delete(cache.keys().next().value as number);
  cache.set(index, lines);
  return lines;
}

function searchText(row: SiRow): string {
  const d = row.content?.descriptiveNonRepeating;
  const free = row.content?.freetext ?? {};
  const parts = [d?.title?.content, row.title];
  for (const field of ["objectType", "physicalDescription", "topic", "setName", "name", "notes"]) {
    for (const t of free[field] ?? []) parts.push(t.content);
  }
  const indexed = (row.content as { indexedStructured?: Record<string, unknown> } | undefined)?.indexedStructured ?? {};
  for (const field of ["object_type", "topic"]) {
    const list = indexed[field];
    if (Array.isArray(list)) parts.push(...list.filter((v): v is string => typeof v === "string"));
  }
  return parts.filter(Boolean).join(" ").toLowerCase();
}

/** Every query word must appear (prefix match, so "chair" also hits "chairs"). */
export function matchesQuery(row: SiRow, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = searchText(row);
  return words.every((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(text));
}

export function normalizeChndmRow(row: SiRow): Candidate {
  return { ...normalizeSiRow(row), source: "chndm" };
}

export class CooperHewittAdapter implements SourceAdapter {
  readonly id = "chndm" as const;

  async fetchBatch(query: string, cursor: number, size: number): Promise<FetchBatchResult> {
    let file = Math.floor(cursor / LINE_SPAN);
    let line = cursor % LINE_SPAN;
    const candidates: Candidate[] = [];
    let scanned = 0;
    let skipped = 0;

    for (let files = 0; file < FILE_COUNT && files < MAX_FILES_PER_BATCH; files++) {
      const lines = await fileLines(file);
      for (; line < lines.length; line++) {
        let row: SiRow;
        try {
          row = JSON.parse(lines[line]) as SiRow;
        } catch {
          continue;
        }
        if (!matchesQuery(row, query)) continue;
        scanned++;
        if (isUsableSiRow(row)) candidates.push(normalizeChndmRow(row));
        else skipped++;
        if (candidates.length >= size) {
          line++;
          const next = file * LINE_SPAN + line;
          return { candidates, nextCursor: next, total: 0, scanned, skipped };
        }
      }
      file++;
      line = 0;
    }

    const nextCursor = file < FILE_COUNT ? file * LINE_SPAN : null;
    return { candidates, nextCursor, total: 0, scanned, skipped };
  }
}
