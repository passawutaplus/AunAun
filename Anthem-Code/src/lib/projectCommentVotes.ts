export type CommentVote = 1 | -1;

export type CommentVoteTally = {
  likes: number;
  dislikes: number;
  mine: CommentVote | 0;
};

export function nextCommentVote(current: CommentVote | 0, clicked: CommentVote): CommentVote | 0 {
  return current === clicked ? 0 : clicked;
}

export function tallyCommentVotes(
  rows: { vote: number; user_id: string }[],
  userId: string | undefined,
): CommentVoteTally {
  let likes = 0;
  let dislikes = 0;
  let mine: CommentVote | 0 = 0;
  for (const row of rows) {
    if (row.vote === 1) likes += 1;
    else if (row.vote === -1) dislikes += 1;
    if (userId && row.user_id === userId && (row.vote === 1 || row.vote === -1)) {
      mine = row.vote;
    }
  }
  return { likes, dislikes, mine };
}

const localKey = (commentId: string) => `aplus1:comment-votes:${commentId}`;

type LocalMap = Record<string, CommentVote>;

export function readLocalCommentVotes(commentId: string, userId: string | undefined): CommentVoteTally {
  if (typeof window === "undefined") return { likes: 0, dislikes: 0, mine: 0 };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(localKey(commentId)) ?? "{}") as LocalMap;
    return tallyCommentVotes(
      Object.entries(parsed).map(([uid, vote]) => ({ user_id: uid, vote })),
      userId,
    );
  } catch {
    return { likes: 0, dislikes: 0, mine: 0 };
  }
}

export function writeLocalCommentVote(commentId: string, userId: string, vote: CommentVote | 0): void {
  if (typeof window === "undefined") return;
  let parsed: LocalMap = {};
  try {
    parsed = JSON.parse(window.localStorage.getItem(localKey(commentId)) ?? "{}") as LocalMap;
  } catch {
    parsed = {};
  }
  if (vote === 0) delete parsed[userId];
  else parsed[userId] = vote;
  window.localStorage.setItem(localKey(commentId), JSON.stringify(parsed));
}
