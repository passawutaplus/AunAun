import { describe, expect, it } from "vitest";
import {
  isThreeSplitGridLayout,
  parsePhotoGridLayout,
  photoGridSlotCount,
  threeSplitSlotCropSpec,
} from "../photoGridLayouts";

describe("photoGridLayouts", () => {
  it("parses grid layout", () => {
    expect(parsePhotoGridLayout("two_stack")).toBe("two_stack");
    expect(parsePhotoGridLayout("three_split")).toBe("three_split");
    expect(parsePhotoGridLayout("three_split_rev")).toBe("three_split_rev");
    expect(parsePhotoGridLayout("invalid")).toBe("four_quad");
  });

  it("returns slot counts", () => {
    expect(photoGridSlotCount("two_side")).toBe(2);
    expect(photoGridSlotCount("three_split")).toBe(3);
    expect(photoGridSlotCount("three_split_rev")).toBe(3);
    expect(photoGridSlotCount("four_quad")).toBe(4);
  });

  it("detects locked 3-up layouts", () => {
    expect(isThreeSplitGridLayout("three_split")).toBe(true);
    expect(isThreeSplitGridLayout("three_split_rev")).toBe(true);
    expect(isThreeSplitGridLayout("four_quad")).toBe(false);
  });

  it("locks tall slot to 1:2 and small slots to 1:1", () => {
    expect(threeSplitSlotCropSpec(0)).toEqual({ ratio: 1 / 2, exportW: 1080, exportH: 2160 });
    expect(threeSplitSlotCropSpec(1)).toEqual({ ratio: 1, exportW: 1080, exportH: 1080 });
    expect(threeSplitSlotCropSpec(2)).toEqual({ ratio: 1, exportW: 1080, exportH: 1080 });
  });
});
