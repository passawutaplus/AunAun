import { describe, expect, it } from "vitest";
import {
  blocksToTemplateModules,
  buildBlocksFromTemplateModules,
  buildCanvasTemplateBlocks,
  CANVAS_TEMPLATES,
  CANVAS_TEMPLATE_MAX,
  CANVAS_TEMPLATE_SEEDS,
  parseCanvasTemplateModules,
} from "../projectCanvasTemplates";
import { createContentBlock, createGridPlaceholder, createMediaPlaceholder } from "../projectContentBlocks";

describe("projectCanvasTemplates", () => {
  it("defines three starter seeds within the max cap", () => {
    expect(CANVAS_TEMPLATE_SEEDS).toHaveLength(3);
    expect(CANVAS_TEMPLATE_SEEDS.length).toBeLessThanOrEqual(CANVAS_TEMPLATE_MAX);
    expect(CANVAS_TEMPLATES.map((t) => t.id)).toEqual([
      "case_short",
      "gallery_heavy",
      "story_case",
    ]);
    for (const t of CANVAS_TEMPLATES) {
      expect(t.preview.length).toBe(t.moduleCount);
    }
  });

  it("builds case_short with expected module mix", () => {
    const blocks = buildCanvasTemplateBlocks("case_short");
    expect(blocks).toHaveLength(5);
    expect(blocks[0]?.type).toBe("heading");
    expect(blocks[1]?.type).toBe("image");
    expect(blocks[1]?.mediaLayout).toBe("single");
    expect(blocks[2]?.type).toBe("body");
    expect(blocks[3]?.mediaLayout).toBe("grid");
    expect(blocks[4]?.type).toBe("image_text");
  });

  it("builds gallery_heavy and story_case", () => {
    const gallery = buildCanvasTemplateBlocks("gallery_heavy");
    expect(gallery).toHaveLength(4);
    expect(gallery[1]?.mediaLayout).toBe("gallery");
    expect(gallery[2]?.gridLayout).toBe("four_quad");

    const story = buildCanvasTemplateBlocks("story_case");
    expect(story).toHaveLength(5);
    expect(story[0]?.type).toBe("heading_body");
    expect(story[4]?.type).toBe("heading_body");
  });

  it("round-trips structure from live blocks without media urls", () => {
    const modules = blocksToTemplateModules([
      createContentBlock("heading"),
      createMediaPlaceholder("image"),
      createGridPlaceholder("three_split", 3),
    ]);
    expect(modules).toEqual([
      { kind: "heading" },
      { kind: "image" },
      { kind: "grid", layout: "three_split" },
    ]);
    const rebuilt = buildBlocksFromTemplateModules(modules);
    expect(rebuilt).toHaveLength(3);
    expect(rebuilt[2]?.mediaLayout).toBe("grid");
    expect(rebuilt[1]?.url ?? "").toBe("");
  });

  it("parses modules jsonb safely", () => {
    expect(
      parseCanvasTemplateModules([
        { kind: "body" },
        { kind: "grid", layout: "four_quad" },
        { kind: "grid", layout: "nope" },
        { kind: "image_text", side: "text_left" },
      ]),
    ).toEqual([
      { kind: "body" },
      { kind: "grid", layout: "four_quad" },
      { kind: "image_text", side: "text_left" },
    ]);
  });
});
