import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { isOptionalQueryError, isSchemaMismatchError } from "@/lib/supabaseErrors";
import {
  CREATOR_SERVICES_SELECT,
  asCreatorServiceRows,
  fromCreatorServiceBookmarks,
  fromCreatorServices,
  type CreatorServiceBookmarkRow,
} from "@/lib/creatorServicesDb";
import { mapCreatorServiceRow } from "@/hooks/useCreatorServices";
import { assemblePackageFeedCards, fetchProfilesByOwnerIds, type PackageFeedCard } from "@/hooks/usePackageFeed";

const SAVED_IDS_KEY = "creator-service-bookmarks";
export const BOOKMARKED_PACKAGES_KEY = "creator-service-bookmarks-cards";

export const useSavedCreatorServiceIds = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [SAVED_IDS_KEY, user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await fromCreatorServiceBookmarks()
        .select("service_id")
        .eq("user_id", user!.id);
      if (error) {
        if (isOptionalQueryError(error) || isSchemaMismatchError(error)) return new Set();
        throw error;
      }
      return new Set(
        ((data ?? []) as CreatorServiceBookmarkRow[]).map((r) => r.service_id),
      );
    },
  });
};

export const useToggleCreatorServiceBookmark = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ serviceId, saved }: { serviceId: string; saved: boolean }) => {
      if (!user) throw new Error("unauth");
      if (saved) {
        const { error } = await fromCreatorServiceBookmarks()
          .delete()
          .eq("user_id", user.id)
          .eq("service_id", serviceId);
        if (error) throw error;
      } else {
        const { error } = await fromCreatorServiceBookmarks().insert({
          user_id: user.id,
          service_id: serviceId,
        });
        if (error) throw error;
      }
    },
    onMutate: async ({ serviceId, saved }) => {
      if (!user?.id) return;
      const key = [SAVED_IDS_KEY, user.id] as const;
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Set<string>>(key);
      const next = new Set(previous ?? []);
      if (saved) next.delete(serviceId);
      else next.add(serviceId);
      qc.setQueryData(key, next);
      return { previous, key };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous && ctx.key) qc.setQueryData(ctx.key, ctx.previous);
      if (err instanceof Error && err.message === "unauth") return;
      toast.error("บันทึกแพ็กเกจไม่สำเร็จ");
    },
    onSuccess: (_data, { saved }) => {
      toast.success(saved ? "เอาออกจากที่บันทึกแล้ว" : "บันทึกแพ็กเกจแล้ว", {
        description: saved ? undefined : "ดูได้ที่แท็บ Booking บนโปรไฟล์",
      });
    },
    onSettled: () => {
      if (user?.id) {
        qc.invalidateQueries({ queryKey: [SAVED_IDS_KEY, user.id] });
        qc.invalidateQueries({ queryKey: [BOOKMARKED_PACKAGES_KEY, user.id] });
      }
    },
  });
};

export const useBookmarkedPackages = (userId: string | undefined) =>
  useQuery({
    queryKey: [BOOKMARKED_PACKAGES_KEY, userId],
    enabled: !!userId,
    queryFn: async (): Promise<PackageFeedCard[]> => {
      const { data: saved, error } = await fromCreatorServiceBookmarks()
        .select("service_id, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) {
        if (isOptionalQueryError(error) || isSchemaMismatchError(error)) return [];
        throw error;
      }
      const ids = ((saved ?? []) as CreatorServiceBookmarkRow[]).map((r) => r.service_id);
      if (!ids.length) return [];

      const { data: serviceRows, error: serviceError } = await fromCreatorServices()
        .select(CREATOR_SERVICES_SELECT)
        .in("id", ids)
        .eq("status", "Published");
      if (serviceError) {
        if (isOptionalQueryError(serviceError) || isSchemaMismatchError(serviceError)) return [];
        throw serviceError;
      }

      const published = asCreatorServiceRows(serviceRows).map(mapCreatorServiceRow);
      const ownerIds = [...new Set(published.map((s) => s.owner_id).filter(Boolean))];
      const profiles = await fetchProfilesByOwnerIds(ownerIds);
      const cards = assemblePackageFeedCards(published, profiles);
      const order = new Map(ids.map((id, i) => [id, i]));
      return [...cards].sort(
        (a, b) => (order.get(a.service.id) ?? 0) - (order.get(b.service.id) ?? 0),
      );
    },
  });
