import { describe, expect, it } from "vitest";
import {
  classifyCategory,
  deriveTitle,
  postHeadline,
  resolveComposerTitle,
  titlesMatch,
  DEFAULT_COMMUNITY_TITLE,
} from "./classifyCommunityPost";

describe("deriveTitle", () => {
  it("uses first non-empty line", () => {
    expect(deriveTitle("หัวข้อแรก\nเนื้อหาต่อ")).toBe("หัวข้อแรก");
  });

  it("truncates long lines to 120 chars", () => {
    const long = "ก".repeat(150);
    expect(deriveTitle(long).length).toBe(120);
  });

  it("falls back when too short", () => {
    expect(deriveTitle("ab")).toBe(DEFAULT_COMMUNITY_TITLE);
    expect(deriveTitle("")).toBe(DEFAULT_COMMUNITY_TITLE);
  });
});

describe("titlesMatch", () => {
  it("matches derived title", () => {
    expect(titlesMatch("สวัสดีชุมชน", "สวัสดีชุมชน\nรายละเอียด")).toBe(true);
  });
});

describe("resolveComposerTitle", () => {
  it("prefers manual title", () => {
    expect(resolveComposerTitle("หัวข้อพิเศษ", "เนื้อหาอื่น")).toBe("หัวข้อพิเศษ");
  });

  it("falls back to derived title", () => {
    expect(resolveComposerTitle("", "สวัสดีชุมชน")).toBe("สวัสดีชุมชน");
  });
});

describe("postHeadline", () => {
  it("shows custom title when different from derived", () => {
    expect(postHeadline("หัวข้อพิเศษ", "เนื้อหาอื่น")).toBe("หัวข้อพิเศษ");
  });

  it("shows body excerpt when title is auto-derived", () => {
    expect(postHeadline("สวัสดีชุมชน", "สวัสดีชุมชน\nรายละเอียด")).toBe("สวัสดีชุมชน");
  });
});

describe("classifyCategory", () => {
  it("classifies Figma tools as Web/UI", () => {
    expect(
      classifyCategory({ body: "แชร์ workflow", tools: ["Figma"] }),
    ).toBe("Web/UI");
  });

  it("classifies video tools and hasVideo as Video", () => {
    expect(
      classifyCategory({ body: "คลิปใหม่", tools: ["Premiere"], hasVideo: true }),
    ).toBe("Video");
  });

  it("defaults to Graphic", () => {
    expect(classifyCategory({ body: "hello world post" })).toBe("Graphic");
  });

  it("uses Thai keywords", () => {
    expect(classifyCategory({ body: "วิธีตัดต่อวิดีโอสั้น ๆ สำหรับ reels" })).toBe("Video");
  });
});
