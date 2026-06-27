import type { CommunityCommentTree } from "@/hooks/useCommunityPosts";

export type CommunityCommentSort = "new" | "top";

function replyTime(c: { created_at?: string }) {
  return new Date(c.created_at ?? 0).getTime();
}

function sortRepliesChronological(nodes: CommunityCommentTree[]) {
  nodes.sort((a, b) => replyTime(a.comment) - replyTime(b.comment));
  nodes.forEach((n) => sortRepliesChronological(n.replies));
}

/** Sort root comments; replies stay chronological. */
export function sortCommunityCommentTree(
  tree: CommunityCommentTree[],
  sort: CommunityCommentSort,
): CommunityCommentTree[] {
  const copy = tree.map((n) => ({
    comment: n.comment,
    replies: n.replies.map((r) => ({
      comment: r.comment,
      replies: [...r.replies],
    })),
  }));

  if (sort === "top") {
    copy.sort((a, b) => {
      const likeDiff = (b.comment.like_count ?? 0) - (a.comment.like_count ?? 0);
      if (likeDiff !== 0) return likeDiff;
      return replyTime(a.comment) - replyTime(b.comment);
    });
  } else {
    copy.sort((a, b) => replyTime(a.comment) - replyTime(b.comment));
  }

  copy.forEach((n) => sortRepliesChronological(n.replies));
  return copy;
}
