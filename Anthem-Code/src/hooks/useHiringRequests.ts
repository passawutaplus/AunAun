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
