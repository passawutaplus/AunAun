import { describe, expect, it } from "vitest";
import { CATEGORY_WORDS, hasWord } from "../../lib/categoryWords";
import { SC_CATEGORIES } from "../../lib/categories";
import { interestWords, rankOpenCalls } from "../forYou";
import * as weekly from "../../../../../Solo-Code/supabase/functions/weekly-digest/for-you";

// The weekly e-mail (edge function) keeps its own copy of the FOR YOU rules; it must rank like My Studio.
describe("weekly e-mail FOR YOU copy", () => {
  it("has the same categories and words", () => {
    expect([...weekly.SC_CATEGORIES]).toEqual([...SC_CATEGORIES]);
    expect(weekly.CATEGORY_WORDS).toEqual(CATEGORY_WORDS);
  });

  it("matches words the same way", () => {
    for (const [text, word] of [
      ["build a guide", "ui"],
      ["ux/ui design award", "ui"],
      ["ประกวดออกแบบโปสเตอร์รณรงค์", "โปสเตอร์"],
      ["3d render contest", "3d"],
    ] as const) {
      expect(weekly.hasWord(text, word)).toBe(hasWord(text, word));
    }
  });

  it("ranks open calls in the same order", () => {
    const works = [
      { status: "Published", sc_category: "Graphic", tags: ["poster", "#zine"], tools: ["Illustrator"] },
      { status: "Published", sc_category: "Character", tags: ["a:b"], tools: [] },
      { status: "Draft", sc_category: "Photography", tags: [], tools: [] },
    ];
    const cats = ["Branding", "Nope"];
    const call = (id: string, title: string, description: string, ends_on: string) => ({ id, title, description, insights: { steps: [id] }, ends_on });
    const calls = [
      call("photo", "Photo Contest 2026", "ประกวดภาพถ่าย", "2026-12-01"),
      call("poster", "ประกวดออกแบบโปสเตอร์", "graphic design for the city", "2026-12-20"),
      call("mascot", "ประกวดออกแบบ Mascot", "", "2026-11-30"),
      call("logo", "ประกวดออกแบบโลโก้", "", "2026-12-10"),
      call("music", "Music", "", "2026-12-05"),
    ];
    const mine = rankOpenCalls(calls, interestWords(works, cats)).map((c) => c.id);
    const theirs = weekly.rankOpenCalls(calls, weekly.interestWords(works, cats)).map((c) => c.id);
    expect(theirs).toEqual(mine);
    expect(weekly.interestWords(works, cats)).toEqual(interestWords(works, cats));
  });
});
