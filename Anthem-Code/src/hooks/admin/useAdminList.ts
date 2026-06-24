import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdminListTable =
  | "profiles" | "studios" | "projects" | "job_posts" | "hiring_requests"
  | "collab_requests" | "conversations" | "project_comments" | "collections"
  | "admin_audit_log" | "gifts" | "inspire_boards" | "contracts";

export const adminListKey = (table: string, select = "*") => ["admin-list", table, select] as const;

export function useAdminList<T>(table: AdminListTable, select = "*", orderCol = "created_at", limit = 200) {
  return useQuery<T[]>({
    queryKey: adminListKey(table, select),
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select(select).order(orderCol, { ascending: false }).limit(limit);
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}
