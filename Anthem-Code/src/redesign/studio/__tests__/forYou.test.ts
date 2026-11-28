import { describe, expect, it } from "vitest";
import { hasWord } from "../../lib/categoryWords";
import { interestWords, rankOpenCalls } from "../forYou";

const call = (id: string, title: string, description = "", ends_on = "2026-12-31") => ({ id, title, description, insights: null, ends_on });

describe("hasWord", () => {
  it("needs word edges for Latin words", () => {
    expect(hasWord("build a guide", "ui")).toBe(false);
    expect(hasWord("ux/ui design award", "ui")).toBe(true);
  });
  it("matches Thai anywhere", () => {
    expect(hasWord("ประกวดออกแบบโปสเตอร์รณรงค์", "โปสเตอร์")).toBe(true);
  });
});

describe("rankOpenCalls", () => {
  const graphicPerson = interestWords(
    [
      { status: "Published", sc_category: "Graphic", tags: ["poster"], tools: ["Illustrator"] },
      { status: "Published", sc_category: "Graphic", tags: [], tools: [] },
      { status: "Draft", sc_category: "Photography", tags: [], tools: [] },
    ],
    ["Branding"],
  );

  it("puts the person's kind of work first", () => {
    const ranked = rankOpenCalls(
      [
        call("photo", "Photo Contest 2026", "ประกวดภาพถ่าย", "2026-12-01"),
        call("poster", "ประกวดออกแบบโปสเตอร์", "graphic design for the city", "2026-12-20"),
        call("logo", "ประกวดออกแบบโลโก้", "", "2026-12-10"),
      ],
      graphicPerson,
    );
    expect(ranked.map((e) => e.id)).toEqual(["poster", "logo", "photo"]);
  });

  it("drafts do not count, and no fit means closing soonest first", () => {
    const ranked = rankOpenCalls([call("b", "Sound art", "", "2026-12-20"), call("a", "Music", "", "2026-12-05")], interestWords([], []));
    expect(ranked.map((e) => e.id)).toEqual(["a", "b"]);
  });
});
