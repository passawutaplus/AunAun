/** Batch rename tokens for Doc Lab exports: {client}, {project}, {date}, {n}, {name} */

export function slugSegment(value: string, maxLen = 40): string {
  const trimmed = value.trim();
  if (!trimmed) return "file";
  return (
    trimmed
      .replace(/\s+/g, "-")
      .replace(/[^\w\u0E00-\u0E7F.-]/g, "")
      .slice(0, maxLen) || "file"
  );
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildBatchFilename(opts: {
  pattern: string;
  client: string;
  project: string;
  date: string;
  index?: number;
  ext?: string;
  originalName?: string;
}): string {
  const {
    pattern,
    client,
    project,
    date,
    index = 0,
    ext = "pdf",
    originalName,
  } = opts;
  const base = originalName?.replace(/\.[^.]+$/, "") ?? "file";
  let name = pattern
    .replace(/\{client\}/gi, slugSegment(client))
    .replace(/\{project\}/gi, slugSegment(project))
    .replace(/\{date\}/gi, date || todayIsoDate())
    .replace(/\{n\}/gi, String(index + 1).padStart(2, "0"))
    .replace(/\{name\}/gi, slugSegment(base));
  const normalizedExt = ext.replace(/^\./, "").toLowerCase();
  if (!name.toLowerCase().endsWith(`.${normalizedExt}`)) {
    name = `${name}.${normalizedExt}`;
  }
  return name;
}

export const DEFAULT_BATCH_PATTERN = "{client}-{project}-{date}";
