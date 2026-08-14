import { describe, expect, it } from "vitest";
import { filterCommentTree, type CommentNode } from "@/lib/commentTree";

describe("filterCommentTree", () => {
  const tree: CommentNode<{ id: string; user_id: string }>[] = [
    {
      comment: { id: "a", user_id: "1" },
      replies: [{ comment: { id: "a1", user_id: "2" }, replies: [] }],
    },
    { comment: { id: "b", user_id: "3" }, replies: [] },
  ];

  it("removes a hidden comment and its replies", () => {
    const out = filterCommentTree(tree, new Set(["a"]), new Set());
    expect(out.map((n) => n.comment.id)).toEqual(["b"]);
  });

  it("removes comments from blocked authors", () => {
    const out = filterCommentTree(tree, new Set(), new Set(["3"]));
    expect(out.map((n) => n.comment.id)).toEqual(["a"]);
  });
});
