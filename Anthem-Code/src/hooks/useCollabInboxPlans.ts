import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { sharedDb, supabase } from "@/integrations/supabase/client";
import { mapCollabRequestIdsWithPlans } from "@/lib/collabInboxPlans";
import { isOptionalQueryError } from "@/lib/supabaseErrors";
import { isUuid } from "@/lib/uuid";

/**
 * Batch lookup: collab request id → conversation id when a persisted plan exists.
 * Mock / non-UUID rows are skipped so we never query Supabase with demo ids.
 */
export function useCollabInboxPlanConversations(requestIds: string[]) {
  const ids = useMemo(
    () => [...new Set(requestIds.filter((id) => isUuid(id)))].sort(),
    [requestIds],
  );

  return useQuery({
    queryKey: ["collab-inbox-plans", ids],
    enabled: ids.length > 0,
    staleTime: 15_000,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data: convs, error: convErr } = await supabase
        .from("conversations")
        .select("id, request_id")
        .eq("kind", "collab")
        .in("request_id", ids);
      if (convErr) {
        if (isOptionalQueryError(convErr)) return {};
        throw convErr;
      }

      const conversations = (convs ?? []).map((row) => ({
        id: (row as { id: string }).id,
        request_id: (row as { request_id: string | null }).request_id,
      }));
      const convIds = conversations.map((c) => c.id).filter(Boolean);
      if (!convIds.length) return {};

      const { data: plans, error: planErr } = await sharedDb
        .from("collab_plans" as never)
        .select("conversation_id")
        .in("conversation_id", convIds);
      if (planErr) {
        const code = (planErr as { code?: string }).code;
        if (code === "PGRST205" || isOptionalQueryError(planErr)) return {};
        throw planErr;
      }

      const planIds = (plans ?? []).map(
        (row) => (row as { conversation_id: string }).conversation_id,
      );
      return mapCollabRequestIdsWithPlans(conversations, planIds);
    },
  });
}
