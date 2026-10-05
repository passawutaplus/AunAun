import { readFileSync } from "node:fs";

/** Engine constants from config/engine.json (single source of truth). Node-side; the browser gets them from the API/bundle. */
const raw = JSON.parse(readFileSync(new URL("../../config/engine.json", import.meta.url), "utf8"));

const NUMERIC = ["QUALITY_PUBLISH", "QUALITY_REJECT", "TAG_MIN_CONF", "MIN_CONFIDENT_TAGS", "MIN_SCORE", "MIN_RESULTS", "MMR_LAMBDA", "PRICE_SOFT_MAX", "DOMAIN_MARGIN", "USER_AI_QUOTA_FREE", "USER_AI_QUOTA_PLUS", "PHASH_NEAR_DIST", "MIN_LONG_EDGE_PX", "KEEP_ALL_MIN_EDGE", "KEEP_ALL_MAX", "BATCH_MAX"];

export function validateEngineConfig(cfg) {
  const errors = [];
  for (const key of NUMERIC) if (typeof cfg[key] !== "number" || !Number.isFinite(cfg[key])) errors.push(`${key} must be a number`);
  if (!Array.isArray(cfg.LICENSE_ALLOWLIST) || !cfg.LICENSE_ALLOWLIST.length) errors.push("LICENSE_ALLOWLIST must be a non-empty array");
  if (cfg.LICENSE_ALLOWLIST?.some(l => /nc|nd/i.test(l))) errors.push("LICENSE_ALLOWLIST must never contain NC/ND licenses");
  if (cfg.QUALITY_REJECT >= cfg.QUALITY_PUBLISH) errors.push("QUALITY_REJECT must be below QUALITY_PUBLISH");
  if (typeof cfg.OCR_ENABLED !== "boolean") errors.push("OCR_ENABLED must be boolean");
  return errors;
}

const problems = validateEngineConfig(raw);
if (problems.length) throw new Error(`config/engine.json invalid: ${problems.join("; ")}`);

export const engineConfig = Object.freeze(raw);
export default engineConfig;
