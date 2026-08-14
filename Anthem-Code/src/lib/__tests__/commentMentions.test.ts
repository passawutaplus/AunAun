import { describe, expect, it } from "vitest";
import {
  extractMentionHandles,
  extractMentionedProjectIds,
  formatProjectMention,
  insertMentionHandle,
  insertMentionProject,
  mentionQueryFromText,
  sliceMentionMatches,
} from "@/lib/commentMentions";

describe("mentionQueryFromText", () => {
  it("opens on bare @ and keeps Thai query", () => {
    expect(mentionQueryFromText("สวัสดี @")).toBe("");
    expect(mentionQueryFromText("สวัสดี @โลโก้")).toBe("โลโก้");
    expect(mentionQueryFromText("@si")).toBe("si");
  });

  it("closes after a space", () => {
    expect(mentionQueryFromText("hello @si ")).toBeNull();
    expect(mentionQueryFromText("no mention")).toBeNull();
  });
});

describe("insert mentions", () => {
  it("replaces the in-progress @ token with a handle", () => {
    expect(insertMentionHandle("ดูงานของ @si", "siriporn")).toBe("ดูงานของ @siriporn ");
  });

  it("inserts a project token with title and id", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(insertMentionProject("ดู @โล", "โลโก้ร้านกาแฟ", id)).toBe(
      `ดู ${formatProjectMention("โลโก้ร้านกาแฟ", id)} `,
    );
  });
});

describe("extract mentions", () => {
  it("collects handles and skips project tokens", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const text = `สวัสดี @mira ${formatProjectMention("โลโก้", id)} และ @mira อีก`;
    expect(extractMentionHandles(text)).toEqual(["mira"]);
    expect(extractMentionedProjectIds(text)).toEqual([id]);
  });
});

describe("sliceMentionMatches", () => {
  const people = ["a", "b", "c", "d"].map((handle) => ({ handle, name: handle }));

  it("shows 3 rows before the user types a name", () => {
    expect(sliceMentionMatches(people, "", (p, q) => p.handle.includes(q))).toHaveLength(3);
  });

  it("filters as the query grows", () => {
    const out = sliceMentionMatches(
      [
        { handle: "apple", name: "Apple" },
        { handle: "mango", name: "Mango" },
      ],
      "man",
      (p, q) => p.handle.includes(q) || p.name.toLowerCase().includes(q),
    );
    expect(out.map((p) => p.handle)).toEqual(["mango"]);
  });
});
