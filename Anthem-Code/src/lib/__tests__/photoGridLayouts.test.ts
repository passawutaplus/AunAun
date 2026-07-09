import { describe, expect, it } from "vitest";
import { parsePhotoGridLayout, photoGridSlotCount } from "../photoGridLayouts";

describe("photoGridLayouts", () => {
  it("parses grid layout", () => {
    expect(parsePhotoGridLayout("two_stack")).toBe("two_stack");
    expect(parsePhotoGridLayout("three_split")).toBe("three_split");
    expect(parsePhotoGridLayout("invalid")).toBe("four_quad");
  });

  it("returns slot counts", () => {
    expect(photoGridSlotCount("two_side")).toBe(2);
    expect(photoGridSlotCount("four_quad")).toBe(4);
  });
});
