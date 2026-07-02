import { describe, expect, it } from "vitest";
import { communityTagFeedUrl, tagsMatchFilter } from "@/lib/communityRoutes";

describe("communityRoutes", () => {
  it("builds tag feed url", () => {
    expect(communityTagFeedUrl("workflow")).toBe("/?mode=community&tag=workflow");
    expect(communityTagFeedUrl("#new-tag")).toBe("/?mode=community&tag=new-tag");
  });

  it("matches tags case-insensitively", () => {
    expect(tagsMatchFilter(["Workflow", "design"], "workflow")).toBe(true);
    expect(tagsMatchFilter(["design"], "workflow")).toBe(false);
  });
});
