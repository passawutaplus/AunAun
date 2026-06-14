import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { opsDb, supabase } from "@/integrations/supabase/db";

export type IssueComment = {
  id: string;
  issue_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export function useIssueComments(issueId: string | undefined) {
  return useQuery({
    queryKey: ["issue-comments", issueId],
    enabled: !!issueId,
    queryFn: async () => {
      const { data, error } = await opsDb
        .from("issue_comments")
        .select("*")
        .eq("issue_id", issueId!)
        .order("created_at", { ascending: true });
      if (error?.code === "PGRST205") return [] as IssueComment[];
      if (error) throw error;
      return (data ?? []) as IssueComment[];
    },
  });
}

export function useAddIssueComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ issueId, body }: { issueId: string; body: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("ไม่ได้ login");
      const trimmed = body.trim();
      if (!trimmed) throw new Error("กรุณาเขียนข้อความ");

      const { error } = await opsDb.from("issue_comments").insert({
        issue_id: issueId,
        author_id: user.user.id,
        body: trimmed,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["issue-comments", vars.issueId] });
    },
  });
}
