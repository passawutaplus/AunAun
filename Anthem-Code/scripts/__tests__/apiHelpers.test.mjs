import { describe, expect, it } from "vitest";
import { safeBearerMatches } from "../../api/_helpers.js";

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
