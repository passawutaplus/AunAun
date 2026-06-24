import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import type { InhouseChannel, InhouseMessage } from "@/lib/inhouse/types";

async function enrichMessages(messages: InhouseMessage[]): Promise<InhouseMessage[]> {
  const senderIds = [...new Set(messages.map((m) => m.sender_id))];
  if (senderIds.length === 0) return messages;
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .in("user_id", senderIds);
  const map = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  return messages.map((m) => ({
    ...m,
    sender: map.get(m.sender_id)
      ? {
          display_name: map.get(m.sender_id)!.display_name,
          avatar_url: map.get(m.sender_id)!.avatar_url,
        }
      : undefined,
  }));
}

export function useInhouseChannels(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["inhouse-channels", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inhouse_channels")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as InhouseChannel[];
    },
  });
}

export function useInhouseMessages(channelId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["inhouse-messages", channelId],
    enabled: !!channelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inhouse_messages")
        .select("*")
        .eq("channel_id", channelId!)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return enrichMessages((data ?? []) as InhouseMessage[]);
    },
  });

  useEffect(() => {
    if (!channelId) return;
    const ch = supabase
      .channel(`inhouse-msg-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "inhouse_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["inhouse-messages", channelId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [channelId, queryClient]);

  return query;
}

export function useSendInhouseMessage(orgId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (opts: { channelId: string; workspaceId: string; body: string }) => {
      const { data, error } = await supabase
        .from("inhouse_messages")
        .insert({
          channel_id: opts.channelId,
          sender_id: user!.id,
          body: opts.body.trim(),
        })
        .select("*")
        .single();
      if (error) throw error;

      await supabase.rpc("log_inhouse_activity", {
        _org_id: orgId,
        _workspace_id: opts.workspaceId,
        _event_type: "message_sent",
        _metadata: { channel_id: opts.channelId },
      });

      return data as InhouseMessage;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["inhouse-messages", vars.channelId] });
    },
  });
}
