import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { InboxPriority } from "@/lib/inboxPriority";
import { toast } from "sonner";

export function useSetInboxPriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      kind: "hire" | "collab";
      id: string;
      priority: InboxPriority;
    }) => {
      const table = input.kind === "hire" ? "hiring_requests" : "collab_requests";
      const { error } = await supabase
        .from(table)
        .update({ inbox_priority: input.priority } as never)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      if (vars.kind === "hire") {
        void qc.invalidateQueries({ queryKey: ["hiring_requests"] });
        void qc.invalidateQueries({ queryKey: ["studio_hiring_requests"] });
      } else {
        void qc.invalidateQueries({ queryKey: ["collab-requests"] });
      }
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "เปลี่ยนความสำคัญไม่สำเร็จ");
    },
  });
}
