export type SourceKey = "met" | "aic";

export type AttributionJson = {
  artist: string;
  title: string;
  date: string;
  credit_line: string;
  institution: string;
  institution_url: string;
  object_url: string;
};

/** Normalized record every adapter must produce. License is reported as-is; the license gate decides. */
export type Candidate = {
  source: SourceKey;
  sourceId: string;
  sourceUrl: string;
  originalImageUrl: string;
  title: string;
  license: string;
  licenseUrl: string | null;
  attribution: string;
  attributionJson: AttributionJson;
  sourceMeta: Record<string, unknown>;
};

export type FetchBatchResult = {
  candidates: Candidate[];
  /** Offset for the next batch, or null when the query is exhausted. */
  nextCursor: number | null;
  total: number;
  /** Source records looked at in this batch, including skipped ones. */
  scanned: number;
  /** Records dropped before the pipeline (not public domain / no image). Not stored as rows. */
  skipped: number;
};

export interface SourceAdapter {
  readonly id: SourceKey;
  fetchBatch(query: string, cursor: number, size: number): Promise<FetchBatchResult>;
}
