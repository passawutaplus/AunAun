import { describe, expect, it } from "vitest";
import { rankProjectsForSearch, type SearchableProject } from "../projectSearchRank";

const projects: SearchableProject[] = [
  { title: "Logo for a cafe", owner: "Mina", category: "Graphic / Branding", tags: ["identity"], tools: ["Illustrator"] },
  { title: "Motion reel", owner: "Arm", category: "Motion / Animation", tags: ["after effects"], description: "title sequence" },
  { title: "Ceramic bowls", owner: "Dao", category: "Craft / Handmade", tags: ["clay"] },
  { title: "Street portraits", owner: "Nut", category: "Photography", tags: ["photo"] },
];

describe("rankProjectsForSearch", () => {
  it("returns only direct hits when the query matches", () => {
    const result = rankProjectsForSearch(projects, "logo");
    expect(result.relaxed).toBe(false);
    expect(result.items.map((item) => item.title)).toEqual(["Logo for a cafe"]);
  });

  it("keeps a one-letter typo as a direct hit", () => {
    const result = rankProjectsForSearch(projects, "logoo");
    expect(result.relaxed).toBe(false);
    expect(result.items.map((item) => item.title)).toContain("Logo for a cafe");
  });

  it("falls back to the closest projects instead of an empty list", () => {
    const result = rankProjectsForSearch(projects, "qqqqzzzz-not-a-word");
    expect(result.relaxed).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.length).toBeLessThanOrEqual(projects.length);
  });

  it("returns the full list for an empty query", () => {
    const result = rankProjectsForSearch(projects, "  ");
    expect(result.relaxed).toBe(false);
    expect(result.items).toEqual(projects);
  });
});
