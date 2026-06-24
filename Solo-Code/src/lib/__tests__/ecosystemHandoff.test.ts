import { describe, expect, it } from "vitest";
import {
  buildStudioQuotationHandoffFromParams,
  decodeStudioMembersParam,
  encodeStudioMembersParam,
  parseAnthemDashboardParams,
  parseStudioDashboardParams,
} from "@/lib/ecosystemHandoff";

describe("parseStudioDashboardParams", () => {
  it("returns false when handoff is not studio", () => {
    expect(parseStudioDashboardParams("?from=anthem&tab=finance")).toEqual({
      fromStudio: false,
    });
  });

  it("parses studio deep-link params", () => {
    const members = encodeStudioMembersParam([
      { userId: "u1", displayName: "Lead" },
      { displayName: "Member 2" },
    ]);
    const search = `?from=anthem&handoff=studio&studio_id=s1&studio_name=Nest+Creative&project_title=Rebrand&client_name=ABC&members_b64=${encodeURIComponent(members)}`;
    const parsed = parseStudioDashboardParams(search);
    expect(parsed.fromStudio).toBe(true);
    if (!parsed.fromStudio) return;
    expect(parsed.studioId).toBe("s1");
    expect(parsed.studioName).toBe("Nest Creative");
    expect(parsed.projectTitle).toBe("Rebrand");
    expect(parsed.members).toHaveLength(2);
  });

  it("builds handoff payload with idempotency note", () => {
    const payload = buildStudioQuotationHandoffFromParams({
      fromStudio: true,
      studioId: "s1",
      studioName: "Nest",
      requestId: "req-1",
      projectTitle: "Website",
      clientName: "Client",
      clientEmail: "client@example.com",
      clientPhone: "0812345678",
    });
    expect(payload?.studioId).toBe("s1");
    expect(payload?.notes).toContain("studio_request:req-1");
    expect(payload?.clientEmail).toBe("client@example.com");
    expect(payload?.clientPhone).toBe("0812345678");
  });
});

describe("parseAnthemDashboardParams", () => {
  it("ignores studio handoff URLs", () => {
    expect(parseAnthemDashboardParams("?from=anthem&handoff=studio&studio_id=s1")).toEqual({
      fromAnthem: false,
    });
  });
});

describe("encodeStudioMembersParam", () => {
  it("round-trips members", () => {
    const members = [{ userId: "a", displayName: "โซโล", revenuePercent: 50 }];
    const encoded = encodeStudioMembersParam(members);
    expect(decodeStudioMembersParam(encoded)).toEqual(members);
  });
});
