import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchCollabTagPermission,
  respondProjectCollabInvite,
  saveCollabTagPermission,
  withdrawProjectCollab,
  type CollabTagPermission,
  type ProjectCollabInvite,
} from "@/lib/portfolioCollabInvites";
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

/** Take your own name off a work (collaborator side). */
export function useWithdrawProjectCollab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => withdrawProjectCollab(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project"] });
      qc.invalidateQueries({ queryKey: ["my-collab-invite"] });
      toast.success("ถอนชื่อแล้ว", { description: "ชื่อคุณจะไม่ขึ้นในผลงานนี้ และเจ้าของผลงานได้รับแจ้งแล้ว" });
    },
    onError: () => toast.error("ถอนชื่อไม่สำเร็จ", { description: "ลองใหม่อีกครั้ง" }),
  });
}

/** "Who can tag me" setting. */
export function useCollabTagPermission() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["collab-tag-permission", user?.id];
  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: () => fetchCollabTagPermission(user!.id),
  });
  const save = useMutation({
    mutationFn: (allow: CollabTagPermission) => saveCollabTagPermission(user!.id, allow),
    onMutate: async (allow) => {
      const previous = qc.getQueryData<CollabTagPermission>(key);
      qc.setQueryData(key, allow);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
      toast.error("บันทึกไม่สำเร็จ");
    },
    onSuccess: (_d, allow) =>
      toast.success(allow === "nobody" ? "ปิดรับการแท็กแล้ว" : "เปิดให้คนที่ติดตามกันทั้งคู่แท็กได้"),
  });
  return { permission: query.data ?? "mutual", isLoading: query.isLoading, save };
}
