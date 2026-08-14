import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import { isBenignQueryError } from "@/lib/supabaseErrors";
import {
  nextCommentVote,
  readLocalCommentVotes,
  tallyCommentVotes,
  writeLocalCommentVote,
  type CommentVote,
  type CommentVoteTally,
} from "@/lib/projectCommentVotes";

const emptyTally: CommentVoteTally = { likes: 0, dislikes: 0, mine: 0 };

async function fetchVotes(commentId: string, userId: string | undefined): Promise<CommentVoteTally> {
  const { data, error } = await supabase
    .from("project_comment_votes" as never)
    .select("vote, user_id")
    .eq("comment_id", commentId);
  if (error) {
    if (isBenignQueryError(error)) return readLocalCommentVotes(commentId, userId);
    return readLocalCommentVotes(commentId, userId);
  }
  return tallyCommentVotes((data ?? []) as { vote: number; user_id: string }[], userId);
}

export function useProjectCommentVote(commentId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["project-comment-votes", commentId, user?.id];

  const q = useQuery({
    queryKey: key,
    queryFn: () => fetchVotes(commentId, user?.id),
    initialData: () => readLocalCommentVotes(commentId, user?.id),
  });

  const mut = useMutation({
    mutationFn: async (clicked: CommentVote) => {
      if (!user) return;
      const current = (qc.getQueryData<CommentVoteTally>(key) ?? emptyTally).mine;
      const next = nextCommentVote(current, clicked);
      if (next === 0) {
        await supabase
          .from("project_comment_votes" as never)
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
        return;
      }
      const { error } = await supabase.from("project_comment_votes" as never).upsert(
        {
          comment_id: commentId,
          user_id: user.id,
          vote: next,
        } as never,
        { onConflict: "comment_id,user_id" },
      );
      if (error && !isBenignQueryError(error)) throw error;
    },
    onMutate: (clicked) => {
      if (!user) return;
      const prev = qc.getQueryData<CommentVoteTally>(key) ?? emptyTally;
      const next = nextCommentVote(prev.mine, clicked);
      writeLocalCommentVote(commentId, user.id, next);
      let likes = prev.likes;
      let dislikes = prev.dislikes;
      if (prev.mine === 1) likes -= 1;
      if (prev.mine === -1) dislikes -= 1;
      if (next === 1) likes += 1;
      if (next === -1) dislikes += 1;
      qc.setQueryData<CommentVoteTally>(key, {
        likes: Math.max(0, likes),
        dislikes: Math.max(0, dislikes),
        mine: next,
      });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["project-comment-votes", commentId] });
    },
  });

  return {
    likes: q.data?.likes ?? 0,
    dislikes: q.data?.dislikes ?? 0,
    mine: q.data?.mine ?? 0,
    setVote: (clicked: CommentVote) => {
      if (!user) {
        useAuthDialog.getState().openSignup();
        return;
      }
      mut.mutate(clicked);
    },
    isPending: mut.isPending,
  };
}
