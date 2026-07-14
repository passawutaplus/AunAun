import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type HiringRow = Database["public"]["Tables"]["hiring_requests"]["Row"];
export type HiringStatusDB = Database["public"]["Enums"]["hire_status"];

export const useHiringRequests = (freelancerId: string | undefined) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["hiring_requests", freelancerId],
    enabled: !!freelancerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hiring_requests")
        .select("*")
        .eq("freelancer_id", freelancerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as HiringRow[];
    },
  });

  useEffect(() => {
    if (!freelancerId) return;
    const ch = supabase
      .channel("hiring-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hiring_requests", filter: `freelancer_id=eq.${freelancerId}` },
        () => qc.invalidateQueries({ queryKey: ["hiring_requests", freelancerId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [freelancerId, qc]);

  return query;
};

export const useCreateHireRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Database["public"]["Tables"]["hiring_requests"]["Insert"]) => {
      const { data, error } = await supabase
        .from("hiring_requests")
        .insert({ ...payload, target_type: "freelancer" } as never)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hiring_requests"] }),
  });
};

export const useCreateStudioHireRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      studio_id: string;
      client_id: string;
      project_title: string;
      client_name: string;
      email: string;
      phone?: string | null;
      budget_amount?: number | null;
      deadline?: string | null;
      message?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("hiring_requests")
        .insert({
          ...payload,
          target_type: "studio",
          freelancer_id: null,
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (_id, vars) => {
      qc.invalidateQueries({ queryKey: ["hiring_requests"] });
      qc.invalidateQueries({ queryKey: ["studio_hiring_requests", vars.studio_id] });
    },
  });
};

export const useStudioHiringRequests = (studioId: string | undefined) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["studio_hiring_requests", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hiring_requests")
        .select("*")
        .eq("studio_id", studioId!)
        .eq("target_type", "studio")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as HiringRow[];
    },
  });

  useEffect(() => {
    if (!studioId) return;
    const ch = supabase
      .channel(`studio-hire-${studioId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "anthem",
          table: "hiring_requests",
          filter: `studio_id=eq.${studioId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["studio_hiring_requests", studioId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [studioId, qc]);

  return query;
};

export const useUpdateHireStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: HiringStatusDB }) => {
      const { error } = await supabase.from("hiring_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hiring_requests"] }),
  });
};

/** Clone a hire request to another freelancer (forward). Multiple people OK — one submit each. */
export const useForwardHireRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      request: HiringRow;
      toUserId: string;
      note?: string | null;
      /** Client-facing reject reason id (same as decline reasons). */
      rejectReason?: string | null;
      /** Optional note stored on original request (often client reason text). */
      rejectNote?: string | null;
    }) => {
      const src = input.request;
      if (input.toUserId === src.freelancer_id) {
        throw new Error("ส่งต่อให้ตัวเองไม่ได้");
      }
      if (input.toUserId === src.client_id) {
        throw new Error("ส่งต่อให้ผู้จ้างไม่ได้");
      }

      const { data: dup } = await supabase
        .from("hiring_requests")
        .select("id")
        .eq("forwarded_from_request_id", src.id)
        .eq("freelancer_id", input.toUserId)
        .maybeSingle();
      if (dup?.id) {
        throw new Error("ส่งต่องานนี้ให้คนนี้ไปแล้ว");
      }

      const friendNote = input.note?.trim() || null;

      const { data: created, error: createErr } = await supabase
        .from("hiring_requests")
        .insert({
          freelancer_id: input.toUserId,
          client_id: src.client_id,
          target_type: "freelancer",
          project_id: src.project_id,
          project_title: src.project_title,
          client_name: src.client_name,
          email: src.email,
          phone: src.phone,
          budget_amount: src.budget_amount,
          budget_min: (src as { budget_min?: number | null }).budget_min ?? null,
          budget_max: (src as { budget_max?: number | null }).budget_max ?? null,
          deadline: src.deadline,
          message: src.message,
          job_type: (src as { job_type?: string | null }).job_type ?? null,
          job_type_other: (src as { job_type_other?: string | null }).job_type_other ?? null,
          attachment_urls: src.attachment_urls,
          forwarded_from_request_id: src.id,
          forward_note: friendNote,
          status: "ใหม่",
        } as never)
        .select("id")
        .single();
      if (createErr) throw createErr;

      const alreadyForwarded = !!(src as { forwarded_to_user_id?: string | null }).forwarded_to_user_id;
      const srcPatch: Record<string, unknown> = {
        forwarded_to_user_id: input.toUserId,
      };
      if (!alreadyForwarded && src.status !== "ปฏิเสธ" && src.status !== "ปิดแล้ว") {
        srcPatch.status = "ปฏิเสธ";
        srcPatch.reject_reason = input.rejectReason ?? "forwarded";
        srcPatch.reject_note = input.rejectNote ?? null;
      }

      const { error: updErr } = await supabase
        .from("hiring_requests")
        .update(srcPatch as never)
        .eq("id", src.id);
      if (updErr) throw updErr;

      try {
        await supabase.rpc("notify_hire_forwarded" as never, {
          p_to_user_id: input.toUserId,
          p_new_request_id: created.id,
          p_note: friendNote,
          p_project_title: src.project_title ?? null,
        } as never);
      } catch {
        /* notification is best-effort */
      }

      return {
        newRequestId: created.id as string,
        toUserId: input.toUserId,
        fromRequestId: src.id,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hiring_requests"] });
      qc.invalidateQueries({ queryKey: ["notif-hire"] });
    },
  });
};
