import { describe, expect, it } from "vitest";
import {
  COMMUNITY_QA_TAG,
  communityDisplayTags,
  hasCommunityQaBadge,
  isCommunityQaTag,
  toggleCommunityQaTag,
} from "./communityQaTag";

describe("communityQaTag", () => {
  it("detects Q&A tag variants", () => {
    expect(isCommunityQaTag("Q&A")).toBe(true);
    expect(isCommunityQaTag("qa")).toBe(true);
    expect(isCommunityQaTag("portfolio")).toBe(false);
  });

  it("toggles Q&A tag", () => {
    expect(toggleCommunityQaTag([])).toEqual([COMMUNITY_QA_TAG]);
    expect(toggleCommunityQaTag([COMMUNITY_QA_TAG])).toEqual([]);
  });

  it("hides Q&A from display hashtags", () => {
    expect(communityDisplayTags(["Q&A", "design"])).toEqual(["design"]);
    expect(hasCommunityQaBadge(["Q&A"])).toBe(true);
  });
});
