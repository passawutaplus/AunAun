import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildCommentTree, type CommentNode } from "@/lib/commentTree";
import { isBenignQueryError, isSchemaMismatchError } from "@/lib/supabaseErrors";
import {
  useModerationState,
  useRecordProfanityStrike,
  prepareModeratedContent,
} from "@/hooks/useModeration";

export interface CommentWithProfile {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  depth: number;
  profile?: { display_name: string; avatar_url: string | null; username: string | null } | null;
}

export type CommentTree = CommentNode<CommentWithProfile>;

export const useProjectComments = (projectId: string | undefined) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["project-comments", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<CommentTree[]> => {
      const fullSelect =
        "id, project_id, user_id, content, created_at, parent_id, depth";
      const basicSelect = "id, project_id, user_id, content, created_at";

      let { data, error } = await supabase
        .from("project_comments")
        .select(fullSelect)
        .eq("project_id", projectId!)
        .order("created_at", { ascending: true });

      if (error && isSchemaMismatchError(error)) {
        const retry = await supabase
          .from("project_comments")
          .select(basicSelect)
          .eq("project_id", projectId!)
          .order("created_at", { ascending: true });
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        if (isBenignQueryError(error)) return [];
        throw error;
      }
      const rows = (data ?? []) as CommentWithProfile[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", ids);
      const map = new Map((profs ?? []).map((p) => [p.user_id, p]));
      const enriched = rows.map((r) => ({
        ...r,
        parent_id: r.parent_id ?? null,
        depth: r.depth ?? 0,
        profile: map.get(r.user_id) ?? null,
      }));
      return buildCommentTree(enriched);
    },
  });

  useEffect(() => {
    if (!projectId) return;
    const ch = supabase
      .channel(`comments-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "anthem", table: "project_comments", filter: `project_id=eq.${projectId}` },
        () => qc.invalidateQueries({ queryKey: ["project-comments", projectId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [projectId, qc]);

  return query;
};

export const useCreateComment = () => {
  const qc = useQueryClient();
  const { refetch: refetchMod } = useModerationState();
  const recordStrike = useRecordProfanityStrike();

  return useMutation({
    mutationFn: async (payload: {
      project_id: string;
      user_id: string;
      content: string;
      parent_id?: string | null;
      depth?: number;
    }) => {
      const checkCanPost = async () => {
        const { data } = await refetchMod();
        return data ?? { allowed: true, reason: null, banned_until: null, strikes: 0 };
      };
      const content = await prepareModeratedContent(
        payload.content,
        { context: "project_comment", maskOnProfanity: true },
        checkCanPost,
        (ctx) => recordStrike.mutateAsync(ctx),
      );
      if (!content) throw new Error("ไม่สามารถส่งคอมเมนต์ได้");

      const { error } = await supabase.from("project_comments").insert({
        project_id: payload.project_id,
        user_id: payload.user_id,
        content,
        parent_id: payload.parent_id ?? null,
        depth: payload.depth ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["project-comments", v.project_id] }),
  });
};

export const useDeleteComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; project_id: string }) => {
      const { error } = await supabase.from("project_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["project-comments", v.project_id] }),
  });
};
