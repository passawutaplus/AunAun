import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fromTable } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ExploreKind } from "@/lib/exploreRoutes";

/** Stored lower-case and without "#", matching the DB trigger that notifies followers. */
export const exploreFollowValue = (value: string) => value.trim().replace(/^#+/, "").toLowerCase();

/** Follow a tag or a tool: new published works that use it arrive in the inbox. */
export function useExploreFollow(kind: ExploreKind | null, rawValue: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const value = exploreFollowValue(rawValue);
  const key = ["explore-follow", user?.id, kind, value];

  const status = useQuery({
    queryKey: key,
    enabled: !!user?.id && !!kind && !!value,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await fromTable("explore_follows")
        .select("value")
        .eq("user_id", user!.id)
        .eq("kind", kind!)
        .eq("value", value)
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });

  const toggle = useMutation({
    mutationFn: async (following: boolean) => {
      if (!user?.id || !kind) throw new Error("unauth");
      if (following) {
        const { error } = await fromTable("explore_follows")
          .delete()
          .eq("user_id", user.id)
          .eq("kind", kind)
          .eq("value", value);
        if (error) throw error;
      } else {
        const { error } = await fromTable("explore_follows").insert({ user_id: user.id, kind, value } as never);
        if (error && (error as { code?: string }).code !== "23505") throw error;
      }
    },
    onMutate: async (following) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<boolean>(key);
      qc.setQueryData(key, !following);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(key, ctx?.previous ?? false);
      toast.error("ทำรายการไม่สำเร็จ");
    },
    onSuccess: (_d, following) => {
      toast.success(following ? "เลิกติดตามแล้ว" : "ติดตามแล้ว — ผลงานใหม่จะแจ้งในกล่องข้อความ");
    },
  });

  return { following: !!status.data, toggle, signedIn: !!user?.id };
}
