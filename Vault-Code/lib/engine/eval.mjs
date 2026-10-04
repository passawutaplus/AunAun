import { parseQuery } from "./parser.mjs";

/** Runs the sample sentences through the parser; returns per-query hits and overall recall of expected ids. */
export function evalQueries(queries, tax, cfg) {
  const rows = queries.map(({ q, include = [], exclude = [], hex = [] }) => {
    const parsed = parseQuery(q, tax, cfg);
    const got = new Set(parsed.include.map(t => t.id));
    const missing = include.filter(id => !got.has(id));
    const wrongExclude = exclude.filter(id => !parsed.exclude.includes(id));
    const leaked = exclude.filter(id => got.has(id));
    const hexMissing = hex.filter(h => !parsed.colorIntent.hex.includes(h));
    const ok = !missing.length && !wrongExclude.length && !leaked.length && !hexMissing.length;
    return { q, ok, missing, wrongExclude, leaked, hexMissing, extra: [...got].filter(id => !include.includes(id)) };
  });
  const expected = queries.reduce((n, x) => n + x.include.length + x.exclude.length + (x.hex || []).length, 0);
  const failedItems = rows.reduce((n, r) => n + r.missing.length + r.wrongExclude.length + r.hexMissing.length, 0);
  return { rows, passed: rows.filter(r => r.ok).length, total: rows.length, recall: expected ? 1 - failedItems / expected : 1 };
}
