import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { respondProjectCollabInvite } from "@/lib/portfolioCollabInvites";
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
      qc.invalidateQueries({ queryKey: ["project"] });
      toast.success(vars.accept ? "ยอมรับคำเชิญร่วมงานแล้ว" : "ปฏิเสธคำเชิญแล้ว");
    },
    onError: (e: Error) => toast.error(e.message || "ดำเนินการไม่สำเร็จ"),
  });
}
