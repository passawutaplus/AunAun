import { describe, expect, it } from "vitest";
import { isNetworkFailure, toReportable } from "@/lib/errorMonitoring";

describe("error monitoring", () => {
  it("treats dropped connections as network failures", () => {
    // Shape Supabase returns when Safari loses the request (Sentry JAVASCRIPT-REACT-A).
    expect(isNetworkFailure({ code: "", details: "", hint: "", message: "TypeError: Load failed (x.supabase.co)" })).toBe(true);
    expect(isNetworkFailure(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkFailure(new TypeError("NetworkError when attempting to fetch resource."))).toBe(true);
    expect(isNetworkFailure({ code: "42501", message: "permission denied for table works" })).toBe(false);
    expect(isNetworkFailure(new Error("Failed to fetch dynamically imported module"))).toBe(true);
    expect(isNetworkFailure(null)).toBe(false);
  });

  it("turns a Supabase error object into an Error with its message", () => {
    const out = toReportable({ code: "42501", details: null, hint: null, message: "permission denied" });
    expect(out).toBeInstanceOf(Error);
    expect((out as Error).message).toBe("permission denied");
  });

  it("leaves real errors and non-objects alone", () => {
    const err = new Error("boom");
    expect(toReportable(err)).toBe(err);
    expect(toReportable("text")).toBe("text");
    expect(toReportable({ foo: 1 })).toEqual({ foo: 1 });
  });
});
