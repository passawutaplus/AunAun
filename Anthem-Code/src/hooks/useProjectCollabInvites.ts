import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { respondProjectCollabInvite, type ProjectCollabInvite } from "@/lib/portfolioCollabInvites";
import { toast } from "sonner";

export function useRespondProjectCollabInvite() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { inviteId: string; accept: boolean }) => {
      if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
      await respondProjectCollabInvite(input.inviteId, input.accept);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["project-collab-invites"] });
      qc.invalidateQueries({ queryKey: ["my-collab-invite"] });
      qc.invalidateQueries({ queryKey: ["project"] });
      if (vars.accept) {
        toast.success("ยอมรับแล้ว", { description: "ชื่อคุณขึ้นในผลงานนี้แล้ว" });
      } else {
        toast.success("ปฏิเสธแล้ว", { description: "ผลงานยังเผยแพร่ได้ตามปกติ แต่จะไม่มีชื่อคุณ" });
      }
    },
    onError: (e: Error) => toast.error(e.message || "ดำเนินการไม่สำเร็จ"),
  });
}

/** The signed-in user's unanswered tag on one work (null when there is none). */
export function useMyPendingCollabInvite(projectId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-collab-invite", projectId, user?.id],
    enabled: !!projectId && !!user?.id,
    queryFn: async (): Promise<ProjectCollabInvite | null> => {
      const { data, error } = await supabase
        .from("project_collab_invites")
        .select("id, project_id, invited_user_id, invited_by, status, created_at, responded_at")
        .eq("project_id", projectId!)
        .eq("invited_user_id", user!.id)
        .eq("status", "pending")
        .maybeSingle();
      if (error) return null;
      return (data as ProjectCollabInvite | null) ?? null;
    },
  });
}
