export const MIN_LONG_EDGE_PX = 1000;
export const PHASH_MAX_DISTANCE = 6;
export const MAX_DOWNLOAD_BYTES = 40 * 1024 * 1024;
export const DOWNLOAD_TIMEOUT_MS = 45_000;
export const API_TIMEOUT_MS = 20_000;

export const RENDITION_WIDTHS = { sm: 400, md: 800, lg: 1600 } as const;
export type RenditionSize = keyof typeof RENDITION_WIDTHS;

export const STORAGE_BUCKET = "discover-media";
/** Open licenses we may rehost and show publicly. NC/ND are excluded (commercial use + resized renditions). */
export const LICENSE_ALLOWLIST = ["cc0", "pdm", "cc-by", "cc-by-sa"] as const;
/** Licenses that legally require crediting the author with a license link. */
export const CREDIT_REQUIRED_LICENSES = ["cc-by", "cc-by-sa"] as const;
export const CC0_URL = "https://creativecommons.org/publicdomain/zero/1.0/";

/** Discover is guest-visible on the Vault home page, so artistic nudity is blocked too. */
export const BLOCK_ARTISTIC_NUDITY = true;

function intEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, raw));
}

export function batchSize(): number {
  return intEnv("SEEDER_BATCH_SIZE", 20, 1, 50);
}

export function maxBatchesPerRun(): number {
  return intEnv("SEEDER_MAX_BATCHES_PER_RUN", 10, 1, 100);
}

export function visionModel(): string {
  return process.env.SEEDER_VISION_MODEL || "claude-haiku-4-5";
}

export function userAgent(): string {
  const contact = process.env.SEEDER_CONTACT || "passawut.a.plus@gmail.com";
  return `AplusVaultDiscoverSeeder/0.1 (${contact})`;
}

/** USD per million tokens. Defaults are Claude Haiku 4.5 list price; override when SEEDER_VISION_MODEL changes. */
export function visionPricing(): { inPerM: number; outPerM: number } {
  const num = (name: string, fallback: number) => {
    const v = Number.parseFloat(process.env[name] ?? "");
    return Number.isFinite(v) && v >= 0 ? v : fallback;
  };
  return { inPerM: num("SEEDER_PRICE_IN_PER_M", 1), outPerM: num("SEEDER_PRICE_OUT_PER_M", 5) };
}

/** Monthly budget shown on the admin page (USD). Display only, nothing is enforced. */
export function monthlyBudgetUsd(): number {
  const v = Number.parseFloat(process.env.SEEDER_BUDGET_USD ?? "");
  return Number.isFinite(v) && v > 0 ? v : 5;
}
