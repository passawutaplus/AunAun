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

export const BOOKMARK_STATUSES = [
  { value: "interested", label: "สนใจ" },
  { value: "contacted", label: "ทักแล้ว" },
  { value: "waiting_quote", label: "รอราคา" },
  { value: "hired", label: "จ้างแล้ว" },
] as const;

export type BookmarkStatus = (typeof BOOKMARK_STATUSES)[number]["value"];

/** Private tracking the owner keeps on a saved package. */
export type BookmarkTracking = {
  status: BookmarkStatus;
  note: string;
  folder: string;
  savedAt: string;
};

const isBookmarkStatus = (v: unknown): v is BookmarkStatus => BOOKMARK_STATUSES.some((s) => s.value === v);

/** Saved packages split into the ones still open and the ones that are gone (closed, deleted, owner removed). */
export type BookmarkedPackages = {
  cards: PackageFeedCard[];
  /** Saved ids with no published package behind them any more. */
  unavailableIds: string[];
  /** Status / note / folder per saved service id. */
  tracking: Record<string, BookmarkTracking>;
};

const EMPTY_BOOKMARKED: BookmarkedPackages = { cards: [], unavailableIds: [], tracking: {} };

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
      const listKey = [BOOKMARKED_PACKAGES_KEY, user.id] as const;
      await qc.cancelQueries({ queryKey: key });
      await qc.cancelQueries({ queryKey: listKey });
      const previous = qc.getQueryData<Set<string>>(key);
      const previousList = qc.getQueryData<BookmarkedPackages>(listKey);
      const next = new Set(previous ?? []);
      if (saved) next.delete(serviceId);
      else next.add(serviceId);
      qc.setQueryData(key, next);
      // Un-saving on the Packages Saved page: the card leaves at once instead of after a refetch.
      if (saved && previousList) {
        qc.setQueryData<BookmarkedPackages>(listKey, {
          ...previousList,
          cards: previousList.cards.filter((c) => c.service.id !== serviceId),
          unavailableIds: previousList.unavailableIds.filter((id) => id !== serviceId),
        });
      }
      return { previous, key, previousList, listKey };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous && ctx.key) qc.setQueryData(ctx.key, ctx.previous);
      if (ctx?.previousList && ctx.listKey) qc.setQueryData(ctx.listKey, ctx.previousList);
      if (err instanceof Error && err.message === "unauth") return;
      toast.error("บันทึกแพ็กเกจไม่สำเร็จ");
    },
    onSuccess: (_data, { saved, serviceId }) => {
      if (saved) {
        toast.success("เอาออกจากที่บันทึกแล้ว", {
          action: {
            label: "เลิกทำ",
            onClick: () => {
              if (!user?.id) return;
              void (async () => {
                const { error } = await fromCreatorServiceBookmarks().insert({
                  user_id: user.id,
                  service_id: serviceId,
                });
                if (error) toast.error("เลิกทำไม่สำเร็จ");
                qc.invalidateQueries({ queryKey: [SAVED_IDS_KEY, user.id] });
                qc.invalidateQueries({ queryKey: [BOOKMARKED_PACKAGES_KEY, user.id] });
              })();
            },
          },
        });
        return;
      }
      toast.success("บันทึกแพ็กเกจแล้ว", {
        description: "ดูได้ที่แท็บ Packages Saved บนโปรไฟล์",
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

/** Drop several saved packages in one request (used to clear the ones that are no longer available). */
export const useRemoveCreatorServiceBookmarks = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (serviceIds: string[]) => {
      if (!user || !serviceIds.length) return;
      const { error } = await fromCreatorServiceBookmarks()
        .delete()
        .eq("user_id", user.id)
        .in("service_id", serviceIds);
      if (error) throw error;
    },
    onError: () => toast.error("เอาออกไม่สำเร็จ"),
    onSettled: () => {
      if (user?.id) {
        qc.invalidateQueries({ queryKey: [SAVED_IDS_KEY, user.id] });
        qc.invalidateQueries({ queryKey: [BOOKMARKED_PACKAGES_KEY, user.id] });
      }
    },
  });
};

/** Update the private status / note / folder of one saved package. */
export const useUpdateBookmarkTracking = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      serviceId,
      patch,
    }: {
      serviceId: string;
      patch: Partial<Pick<BookmarkTracking, "status" | "note" | "folder">>;
    }) => {
      if (!user) throw new Error("unauth");
      const { error } = await fromCreatorServiceBookmarks()
        .update(patch)
        .eq("user_id", user.id)
        .eq("service_id", serviceId);
      if (error) throw error;
    },
    onMutate: async ({ serviceId, patch }) => {
      if (!user?.id) return;
      const listKey = [BOOKMARKED_PACKAGES_KEY, user.id] as const;
      await qc.cancelQueries({ queryKey: listKey });
      const previous = qc.getQueryData<BookmarkedPackages>(listKey);
      if (previous?.tracking[serviceId]) {
        qc.setQueryData<BookmarkedPackages>(listKey, {
          ...previous,
          tracking: { ...previous.tracking, [serviceId]: { ...previous.tracking[serviceId], ...patch } },
        });
      }
      return { previous, listKey };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous && ctx.listKey) qc.setQueryData(ctx.listKey, ctx.previous);
      toast.error("บันทึกไม่สำเร็จ");
    },
    onSettled: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: [BOOKMARKED_PACKAGES_KEY, user.id] });
    },
  });
};

export const useBookmarkedPackages = (userId: string | undefined) =>
  useQuery({
    queryKey: [BOOKMARKED_PACKAGES_KEY, userId],
    enabled: !!userId,
    queryFn: async (): Promise<BookmarkedPackages> => {
      const { data: saved, error } = await fromCreatorServiceBookmarks()
        .select("service_id, created_at, status, note, folder")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) {
        if (isOptionalQueryError(error) || isSchemaMismatchError(error)) return EMPTY_BOOKMARKED;
        throw error;
      }
      const rows = (saved ?? []) as CreatorServiceBookmarkRow[];
      const ids = rows.map((r) => r.service_id);
      const tracking: Record<string, BookmarkTracking> = {};
      for (const r of rows) {
        tracking[r.service_id] = {
          status: isBookmarkStatus(r.status) ? r.status : "interested",
          note: r.note ?? "",
          folder: r.folder ?? "",
          savedAt: r.created_at ?? "",
        };
      }
      if (!ids.length) return EMPTY_BOOKMARKED;

      const { data: serviceRows, error: serviceError } = await fromCreatorServices()
        .select(CREATOR_SERVICES_SELECT)
        .in("id", ids)
        .eq("status", "Published");
      if (serviceError) {
        if (isOptionalQueryError(serviceError) || isSchemaMismatchError(serviceError)) return EMPTY_BOOKMARKED;
        throw serviceError;
      }

      const published = asCreatorServiceRows(serviceRows).map(mapCreatorServiceRow);
      const ownerIds = [...new Set(published.map((s) => s.owner_id).filter(Boolean))];
      const profiles = await fetchProfilesByOwnerIds(ownerIds);
      const cards = assemblePackageFeedCards(published, profiles);
      const order = new Map(ids.map((id, i) => [id, i]));
      const sorted = [...cards].sort(
        (a, b) => (order.get(a.service.id) ?? 0) - (order.get(b.service.id) ?? 0),
      );
      const shown = new Set(sorted.map((c) => c.service.id));
      return { cards: sorted, unavailableIds: ids.filter((id) => !shown.has(id)), tracking };
    },
  });
