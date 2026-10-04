/**
 * Golden-set report (phase 05.F): the owner labels ~50 images once; this compares predicted tags to the labels.
 * golden:    [{ id, expected: [tagId, ...] }]      (docs/golden/golden.json)
 * predicted: { [id]: [tagId, ...] }                 (e.g. tags_ids of the same images from discover_items)
 * Returns per-group precision/recall plus overall numbers. Pure.
 */
export function reportGolden(golden, predicted, tax) {
  const groups = new Map();
  const bump = (gid, key) => {
    if (!groups.has(gid)) groups.set(gid, { group: gid, tp: 0, fp: 0, fn: 0 });
    groups.get(gid)[key]++;
  };
  let missing = 0;
  for (const g of golden) {
    const got = predicted[g.id];
    if (!got) { missing++; continue; }
    const expected = new Set(g.expected);
    const actual = new Set(got.filter(id => tax.isKnown(id)));
    for (const id of actual) bump(tax.termById.get(id).group, expected.has(id) ? "tp" : "fp");
    for (const id of expected) if (tax.isKnown(id) && !actual.has(id)) bump(tax.termById.get(id).group, "fn");
  }
  const rows = [...groups.values()]
    .map(r => ({ ...r, precision: r.tp + r.fp ? r.tp / (r.tp + r.fp) : null, recall: r.tp + r.fn ? r.tp / (r.tp + r.fn) : null }))
    .sort((a, b) => a.group.localeCompare(b.group));
  const sum = k => rows.reduce((n, r) => n + r[k], 0);
  const tp = sum("tp"), fp = sum("fp"), fn = sum("fn");
  return { images: golden.length - missing, missing, rows, precision: tp + fp ? tp / (tp + fp) : null, recall: tp + fn ? tp / (tp + fn) : null };
}

export function formatReport(rep) {
  const pct = v => (v == null ? "  - " : `${Math.round(v * 100)}%`.padStart(4));
  const lines = [`images ${rep.images} (missing predictions: ${rep.missing})  precision ${pct(rep.precision)}  recall ${pct(rep.recall)}`, "group                     prec  rec   tp fp fn"];
  for (const r of rep.rows) lines.push(`${r.group.padEnd(25)} ${pct(r.precision)} ${pct(r.recall)}  ${String(r.tp).padStart(2)} ${String(r.fp).padStart(2)} ${String(r.fn).padStart(2)}`);
  return lines.join("\n");
}
