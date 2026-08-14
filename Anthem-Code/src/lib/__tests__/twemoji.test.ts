import { describe, expect, it } from "vitest";
import {
  insertEmojiAtSelection,
  insertTextAt,
  isCommentEmojiToken,
  splitCommentEmojiParts,
  twemojiCode,
  twemojiSvgUrl,
} from "@/lib/twemoji";

describe("twemojiCode", () => {
  it("maps a smiley to the svg filename without FE0F", () => {
    expect(twemojiCode("😀")).toBe("1f600");
    expect(twemojiCode("❤️")).toBe("2764");
  });

  it("pins a versioned jsDelivr URL", () => {
    expect(twemojiSvgUrl("😀")).toContain("jdecked/twemoji@v16.0.1");
    expect(twemojiSvgUrl("😀")).toMatch(/\/1f600\.svg$/);
  });
});

describe("splitCommentEmojiParts", () => {
  it("keeps Thai text and isolates emoji", () => {
    expect(splitCommentEmojiParts("ชอบ😀มาก")).toEqual(["ชอบ", "😀", "มาก"]);
    expect(isCommentEmojiToken("😀")).toBe(true);
    expect(isCommentEmojiToken("ชอบ")).toBe(false);
  });
});

describe("insertTextAt", () => {
  it("inserts at the caret and respects max length", () => {
    expect(insertTextAt("ab", "😀", 1)).toBe("a😀b");
    const el = { selectionStart: 2, selectionEnd: 2 } as HTMLTextAreaElement;
    expect(insertEmojiAtSelection("hi", "😀", el, 4)?.text).toBe("hi😀");
    expect(insertEmojiAtSelection("hi", "😀", el, 3)).toBeNull();
  });
});
