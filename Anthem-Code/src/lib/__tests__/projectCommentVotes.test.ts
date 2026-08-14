import { describe, expect, it } from "vitest";
import { nextCommentVote, tallyCommentVotes } from "@/lib/projectCommentVotes";

describe("nextCommentVote", () => {
  it("toggles off when clicking the same vote", () => {
    expect(nextCommentVote(1, 1)).toBe(0);
    expect(nextCommentVote(-1, -1)).toBe(0);
  });

  it("switches or sets the other vote", () => {
    expect(nextCommentVote(0, 1)).toBe(1);
    expect(nextCommentVote(-1, 1)).toBe(1);
    expect(nextCommentVote(1, -1)).toBe(-1);
  });
});

describe("tallyCommentVotes", () => {
  it("counts likes, dislikes, and the current user", () => {
    const out = tallyCommentVotes(
      [
        { vote: 1, user_id: "a" },
        { vote: 1, user_id: "b" },
        { vote: -1, user_id: "c" },
      ],
      "a",
    );
    expect(out).toEqual({ likes: 2, dislikes: 1, mine: 1 });
  });
});
