import type { Candidate } from "./adapters/types";
import { CREDIT_REQUIRED_LICENSES, LICENSE_ALLOWLIST } from "./config";

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
  if ((CREDIT_REQUIRED_LICENSES as readonly string[]).includes(c.license)) {
    // CC BY / BY-SA: author + license link are legal conditions, not nice-to-haves.
    if (!c.attributionJson.artist.trim() || !/^https:\/\//.test(c.licenseUrl ?? "")) {
      return { ok: false, reason: "missing_attribution" };
    }
  }
  if (!/^https:\/\//.test(c.originalImageUrl)) {
    return { ok: false, reason: "missing_image" };
  }
  return { ok: true };
}
