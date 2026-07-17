import { describe, expect, it } from "vitest";
import { projectMatchesOpportunityFilter, scoreByViewAffinity } from "@/lib/viewAffinity";

describe("projectMatchesOpportunityFilter", () => {
  it("passes All", () => {
    expect(projectMatchesOpportunityFilter("All", [], [])).toBe(true);
  });

  it("matches project types", () => {
    expect(projectMatchesOpportunityFilter("paid_work", ["paid_work"], [])).toBe(true);
  });

  it("matches owner types", () => {
    expect(projectMatchesOpportunityFilter("internship", [], ["internship"])).toBe(true);
  });

  it("rejects when neither matches", () => {
    expect(projectMatchesOpportunityFilter("paid_work", ["show_work"], ["connection"])).toBe(false);
  });
});

describe("scoreByViewAffinity", () => {
  it("scores category and opportunity overlap", () => {
    const score = scoreByViewAffinity("UI/UX", ["paid_work"], {
      categories: { "UI/UX": 3 },
      opportunityTypes: { paid_work: 2 },
    });
    expect(score).toBe(3 * 2 + 2);
  });
});
