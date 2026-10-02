import type { Candidate } from "./adapters/types";
import { LICENSE_ALLOWLIST } from "./config";

export type RejectReason =
  | "license_not_allowed"
  | "missing_attribution"
  | "duplicate_phash"
  | "below_min_resolution"
  | "moderation_blocked"
  | "missing_image"
  | "download_failed"
  | "ai_invalid_output";

export type GateResult = { ok: true } | { ok: false; reason: RejectReason };

export function licenseGate(c: Candidate): GateResult {
  if (!(LICENSE_ALLOWLIST as readonly string[]).includes(c.license)) {
    return { ok: false, reason: "license_not_allowed" };
  }
  if (!c.attribution.trim() || !/^https:\/\//.test(c.sourceUrl)) {
    return { ok: false, reason: "missing_attribution" };
  }
  if (!/^https:\/\//.test(c.originalImageUrl)) {
    return { ok: false, reason: "missing_image" };
  }
  return { ok: true };
}
