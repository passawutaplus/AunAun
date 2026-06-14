import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/db";

export type UserSearchRow = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  subscription_tier: string | null;
  created_at: string;
};

export type User360Data = {
  profile: {
    user_id: string;
    display_name: string | null;
    username: string | null;
    subscription_tier: string | null;
    created_at: string;
  };
  so1o: { quotations: number; open_tickets: number };
  an1hem: { projects: number; published: number; feedback: number };
  ecosystem: { cross_links: number; converted_links: number };
  recent_links: {
    id: string;
    source_app: string;
    source_page: string | null;
    created_at: string;
    converted: boolean;
  }[];
  recent_events: { event_type: string; created_at: string; target_type: string | null }[];
};

export function useUserSearch(query: string) {
  return useQuery({
    queryKey: ["user-search", query],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_search_users", {
        _query: query.trim(),
        _limit: 25,
      });
      if (error) throw error;
      return (data ?? []) as UserSearchRow[];
    },
    enabled: query.trim().length >= 0,
    staleTime: 15_000,
  });
}

export function useUser360(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-360", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.rpc("admin_user_360", { _user_id: userId });
      if (error) throw error;
      return data as User360Data | null;
    },
    enabled: !!userId,
    refetchInterval: 60_000,
  });
}
