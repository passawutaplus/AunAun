import { describe, expect, it } from "vitest";
import { matchesHireInboxSearch } from "@/lib/hireInboxSearch";

describe("matchesHireInboxSearch", () => {
  it("matches client name and email", () => {
    expect(
      matchesHireInboxSearch({
        query: "msk",
        clientName: "msk.petch",
        email: "msk.petch@gmail.com",
      }),
    ).toBe(true);
    expect(
      matchesHireInboxSearch({
        query: "gmail.com",
        clientName: "msk.petch",
        email: "msk.petch@gmail.com",
      }),
    ).toBe(true);
    expect(
      matchesHireInboxSearch({
        query: "nobody",
        clientName: "msk.petch",
        email: "msk.petch@gmail.com",
      }),
    ).toBe(false);
  });

  it("matches order number ignoring dashes and hash", () => {
    expect(
      matchesHireInboxSearch({
        query: "98aa",
        clientName: "msk.petch",
        orderCode: "98AA235B",
        requestId: "98aa235b-1111-4000-8000-000000000001",
      }),
    ).toBe(true);
    expect(
      matchesHireInboxSearch({
        query: "ORD-2026-0001",
        clientName: "msk.petch",
        orderCode: "ORD-2026-0001",
      }),
    ).toBe(true);
    expect(
      matchesHireInboxSearch({
        query: "#ord20260001",
        clientName: "msk.petch",
        orderCode: "ORD-2026-0001",
      }),
    ).toBe(true);
  });

  it("returns all rows when the query is empty", () => {
    expect(matchesHireInboxSearch({ query: "  ", clientName: "a" })).toBe(true);
  });
});
