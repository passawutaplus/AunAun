/** Layer-A colour groups are computed by code; they must not satisfy the "enough meaningful tags" rule on their own. */
export const COLOR_FACETS = new Set(["mood.hue", "mood.tone"]);

export const semanticConfidentCount = (tagsJson, minConf) => tagsJson.filter(t => t.conf >= minConf && !COLOR_FACETS.has(t.facet)).length;


/**
 * Publish rules (phase 05.H). Pure.
 *   quality >= QUALITY_PUBLISH AND no safety flag AND passport complete AND licence ok AND >= MIN_CONFIDENT_TAGS -> published
 *   QUALITY_REJECT <= quality < QUALITY_PUBLISH, a safety flag, or too few tags                                      -> review
 *   quality < QUALITY_REJECT                                                                                         -> rejected (row kept)
 * Always returns a status_reason. The DB CHECK still re-enforces licence + minimum tags + quality.
 */
export function publishDecision(input, cfg) {
  const { quality, safetyFlag = false, tagsJson = [], licenseOk = true, passportComplete = true } = input;
  const confident = semanticConfidentCount(tagsJson, cfg.TAG_MIN_CONF);
  if (!licenseOk) return { status: "rejected", reason: "license_not_allowed" };
  if (typeof quality === "number" && quality < cfg.QUALITY_REJECT) return { status: "rejected", reason: `quality ${quality} below ${cfg.QUALITY_REJECT}` };
  if (safetyFlag) return { status: "review", reason: "safety flag needs a human" };
  if (typeof quality !== "number") return { status: "review", reason: "no quality score yet" };
  if (quality < cfg.QUALITY_PUBLISH) return { status: "review", reason: `quality ${quality} below ${cfg.QUALITY_PUBLISH}` };
  if (!passportComplete) return { status: "review", reason: "passport incomplete" };
  if (confident < cfg.MIN_CONFIDENT_TAGS) return { status: "review", reason: `only ${confident} confident non-colour tags (need ${cfg.MIN_CONFIDENT_TAGS})` };
  return { status: "published", reason: "ok" };
}

/** Passport complete = every field the DB CHECK and the viewer need. */
export function isPassportComplete(row) {
  return Boolean(
    row.title && row.source_url && /^https:\/\//.test(row.source_url) && row.attribution && row.license &&
    row.width && row.height && row.blurhash && row.phash && row.image_sm_path && row.image_md_path && row.image_lg_path &&
    Array.isArray(row.palette) && row.palette.length,
  );
}
