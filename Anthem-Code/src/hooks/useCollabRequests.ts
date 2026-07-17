import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { isOptionalQueryError } from "@/lib/supabaseErrors";
import type { TablesInsert, Database } from "@/integrations/supabase/types";

export type CollabStatus = Database["public"]["Enums"]["collab_status"];

export const useCreateCollabRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TablesInsert<"collab_requests">) => {
      const { data, error } = await supabase.from("collab_requests").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collab-requests"] });
    },
  });
};

export const useReceivedCollabRequests = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["collab-requests", "received", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collab_requests")
        .select("*")
        .eq("recipient_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) {
        if (isOptionalQueryError(error)) return [];
        throw error;
      }
      return data ?? [];
    },
  });
};

export const useUpdateCollabStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CollabStatus }) => {
      const { error } = await supabase.from("collab_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collab-requests"] });
    },
  });
};

/** Requester (sender) cancels collab mid-way with reason. */
export const useCancelCollabRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      requestId: string;
      reason: string;
      note?: string | null;
    }) => {
      const { error } = await supabase
        .from("collab_requests")
        .update({
          status: "cancelled",
          cancel_reason: input.reason,
          cancel_note: input.note?.trim() || null,
        } as never)
        .eq("id", input.requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collab-requests"] });
      qc.invalidateQueries({ queryKey: ["chat-collab-meta"] });
    },
  });
};
