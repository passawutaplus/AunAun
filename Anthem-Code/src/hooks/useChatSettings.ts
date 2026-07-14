import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getProfilesByIds } from "@/server/queries/profiles";

export type ChatSettings = {
  user_id: string;
  hire_auto_reply_enabled: boolean;
  hire_auto_reply_text: string;
  hire_auto_reply_image_url: string | null;
  hire_auto_reply_link_url: string | null;
  collab_auto_reply_enabled: boolean;
  collab_auto_reply_text: string;
  collab_auto_reply_image_url: string | null;
  collab_auto_reply_link_url: string | null;
  updated_at?: string;
};

export type ChatSettingsPatch = Partial<
  Omit<ChatSettings, "user_id" | "updated_at">
>;

const EMPTY: Omit<ChatSettings, "user_id" | "updated_at"> = {
  hire_auto_reply_enabled: false,
  hire_auto_reply_text: "",
  hire_auto_reply_image_url: null,
  hire_auto_reply_link_url: null,
  collab_auto_reply_enabled: false,
  collab_auto_reply_text: "",
  collab_auto_reply_image_url: null,
  collab_auto_reply_link_url: null,
};

export function useChatSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["chat-settings", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ChatSettings> => {
      const { data, error } = await supabase
        .from("chat_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return { user_id: user!.id, ...EMPTY };
      }
      return data as ChatSettings;
    },
  });
}

export function useSaveChatSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ChatSettingsPatch) => {
      if (!user?.id) throw new Error("ต้องเข้าสู่ระบบ");
      const row = {
        user_id: user.id,
        ...patch,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("chat_settings")
        .upsert(row as never, { onConflict: "user_id" })
        .select("*")
        .single();
      if (error) throw error;
      return data as ChatSettings;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["chat-settings", user?.id] });
    },
  });
}

export type BlockedChatUser = {
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  blockedAt: string;
};

export function useBlockedChatUsers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["blocked-chat-users", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<BlockedChatUser[]> => {
      const { data, error } = await supabase
        .from("user_blocks")
        .select("blocked_id, created_at")
        .eq("blocker_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];
      const ids = rows.map((r) => r.blocked_id as string);
      const profiles = await getProfilesByIds(ids);
      const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
      return rows.map((r) => {
        const id = r.blocked_id as string;
        const p = byId[id];
        return {
          userId: id,
          displayName: p?.display_name || p?.username || "ผู้ใช้",
          username: p?.username ?? null,
          avatarUrl: p?.avatar_url ?? null,
          blockedAt: r.created_at as string,
        };
      });
    },
  });
}
