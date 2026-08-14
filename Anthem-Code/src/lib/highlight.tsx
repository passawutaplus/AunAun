import React from "react";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const tokenize = (query: string): string[] =>
  query
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

/** Short excerpt around the first query match (for search result cards). */
export function extractSearchSnippet(
  text: string | null | undefined,
  query: string,
  radius = 42,
): string | null {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  const tokens = tokenize(query);
  if (!t || tokens.length === 0) return null;
  const lower = t.toLowerCase();
  let idx = -1;
  let len = 0;
  for (const token of tokens) {
    const i = lower.indexOf(token);
    if (i >= 0 && (idx < 0 || i < idx)) {
      idx = i;
      len = token.length;
    }
  }
  if (idx < 0) return null;
  const start = Math.max(0, idx - radius);
  const end = Math.min(t.length, idx + len + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < t.length ? "…" : "";
  return `${prefix}${t.slice(start, end)}${suffix}`;
}

export const highlight = (text: string | null | undefined, query: string): React.ReactNode => {
  const t = text ?? "";
  const tokens = tokenize(query);
  if (!t || tokens.length === 0) return t;
  const re = new RegExp(`(${tokens.map(escapeRe).join("|")})`, "gi");
  const parts = t.split(re);
  return parts.map((p, i) =>
    re.test(p) ? (
      <mark key={i} className="bg-primary/15 text-primary rounded px-0.5">
        {p}
      </mark>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    )
  );
};
