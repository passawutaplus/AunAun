import { describe, expect, it } from "vitest";
import { omiseModeFromKey, safeBearerMatches } from "../../api/_helpers.js";

const req = (authorization) => ({ headers: authorization === undefined ? {} : { authorization } });

describe("safeBearerMatches (cron auth)", () => {
  it("accepts the exact bearer secret", () => {
    expect(safeBearerMatches(req("Bearer s3cret"), "s3cret")).toBe(true);
  });

  it("rejects wrong, shorter, longer, empty and missing credentials without throwing", () => {
    expect(safeBearerMatches(req("Bearer s3cre"), "s3cret")).toBe(false);
    expect(safeBearerMatches(req("Bearer s3cretX"), "s3cret")).toBe(false);
    expect(safeBearerMatches(req("s3cret"), "s3cret")).toBe(false); // no "Bearer " prefix
    expect(safeBearerMatches(req(""), "s3cret")).toBe(false);
    expect(safeBearerMatches(req(undefined), "s3cret")).toBe(false);
    expect(safeBearerMatches({}, "s3cret")).toBe(false);
  });

  it("fails closed when the secret is not configured", () => {
    expect(safeBearerMatches(req("Bearer "), "")).toBe(false);
    expect(safeBearerMatches(req("Bearer undefined"), undefined)).toBe(false);
  });
});

describe("omiseModeFromKey", () => {
  it("test key is test mode, with or without OMISE_MODE=test", () => {
    expect(omiseModeFromKey("skey_test_abc", "")).toEqual({ mode: "test" });
    expect(omiseModeFromKey("skey_test_abc", "test")).toEqual({ mode: "test" });
  });

  it("live key needs OMISE_MODE=live explicitly (a forgotten flag must not silently run live as test)", () => {
    expect(omiseModeFromKey("skey_live_abc", "live")).toEqual({ mode: "live" });
    expect(omiseModeFromKey("skey_live_abc", "")).toEqual({ error: "omise_mode_mismatch" });
    expect(omiseModeFromKey("skey_live_abc", "test")).toEqual({ error: "omise_mode_mismatch" });
  });

  it("a test key with OMISE_MODE=live is a misconfiguration", () => {
    expect(omiseModeFromKey("skey_test_abc", "live")).toEqual({ error: "omise_mode_mismatch" });
  });

  it("unrecognised keys fail closed", () => {
    expect(omiseModeFromKey("", "test")).toEqual({ error: "omise_key_unrecognized" });
    expect(omiseModeFromKey("pkey_test_abc", "test")).toEqual({ error: "omise_key_unrecognized" });
    expect(omiseModeFromKey(undefined, undefined)).toEqual({ error: "omise_key_unrecognized" });
  });
});
