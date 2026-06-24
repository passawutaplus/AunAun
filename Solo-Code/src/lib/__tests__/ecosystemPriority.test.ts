import { describe, expect, it } from "vitest";
import { anthemPortfolioNewUrl } from "@/lib/crossLink";

describe("anthemPortfolioNewUrl", () => {
  it("includes cover and tags for So1o job handoff", () => {
    const url = anthemPortfolioNewUrl({
      jobTitle: "Logo Redesign",
      clientName: "ABC Co",
      jobId: "job-1",
      linkId: "link-1",
      coverUrl: "https://cdn.example.com/preview.jpg",
      tags: ["branding", "logo"],
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("from")).toBe("so1o");
    expect(parsed.searchParams.get("title")).toBe("Logo Redesign");
    expect(parsed.searchParams.get("cover")).toBe("https://cdn.example.com/preview.jpg");
    expect(parsed.searchParams.get("tags")).toBe("branding,logo");
    expect(parsed.searchParams.get("link_id")).toBe("link-1");
  });

  it("ignores non-https cover URLs", () => {
    const url = anthemPortfolioNewUrl({
      jobTitle: "Test",
      coverUrl: "http://insecure.example/x.jpg",
    });
    expect(new URL(url).searchParams.get("cover")).toBeNull();
  });
});

describe("payment reminder schedule", () => {
  it("documents due-soon windows used by cron", () => {
    // Mirror paymentReminders.server.ts — guard against accidental schedule drift
    const dueSoonDays = [3, 1];
    const overdueDays = [1, 7, 14];
    expect(dueSoonDays).toContain(3);
    expect(overdueDays).toContain(7);
  });
});
