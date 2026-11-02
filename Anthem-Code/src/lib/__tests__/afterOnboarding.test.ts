import { beforeEach, describe, expect, it } from "vitest";
import { rememberAfterOnboarding, takeAfterOnboarding } from "../afterOnboarding";

describe("afterOnboarding", () => {
  beforeEach(() => sessionStorage.clear());

  it("returns where sign-up interrupted the member, once", () => {
    rememberAfterOnboarding("/portfolio/new");
    expect(takeAfterOnboarding()).toBe("/portfolio/new");
    expect(takeAfterOnboarding()).toBeNull();
  });

  it("keeps the query string", () => {
    rememberAfterOnboarding("/dashboard/exhibition/new?from=hero");
    expect(takeAfterOnboarding()).toBe("/dashboard/exhibition/new?from=hero");
  });

  it("ignores home, auth pages and outside URLs", () => {
    rememberAfterOnboarding("/");
    expect(takeAfterOnboarding()).toBeNull();
    rememberAfterOnboarding("/auth?redirect=%2F");
    expect(takeAfterOnboarding()).toBeNull();
    rememberAfterOnboarding("https://evil.example.com/");
    expect(takeAfterOnboarding()).toBeNull();
    rememberAfterOnboarding("//evil.example.com");
    expect(takeAfterOnboarding()).toBeNull();
  });

  it("refuses a tampered stored value", () => {
    sessionStorage.setItem("samecor:after-onboarding", "https://evil.example.com/");
    expect(takeAfterOnboarding()).toBeNull();
  });
});
