import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { fromTable } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { buildDesignerCards, DESIGNERS_PAGE, type DesignerCardData } from "@/hooks/useDesigners";
import {
  PROFILE_DESIGNER_SELECT,
  PROFILE_DESIGNER_SELECT_NO_ACTIVE,
} from "@/lib/dbSelects";
import { profilesPublicFrom } from "@/lib/profileAccess";
import { isOptionalQueryError, isSchemaMismatchError } from "@/lib/supabaseErrors";

/** Ids of designers the signed-in user hearted (one query, shared by every card). */
export const SAVED_DESIGNER_IDS_KEY = "designer-saves";
/** Cards for Portfolio → Designers. */
export const SAVED_DESIGNERS_KEY = "designer-saves-cards";
export const SAVED_DESIGNERS_PATH = "/portfolio?tab=designers";

/** Enough for a personal shortlist; the list is loaded in feed-sized chunks. */
const SAVED_DESIGNERS_MAX = 240;

type DesignerSaveRow = { designer_id: string; created_at: string };

export type SavedDesigner = DesignerCardData & { savedAt: string };

const saves = () => fromTable("designer_saves");

/** A missing table (migration not applied yet) reads as "nothing saved" instead of an error screen. */
const isMissingTable = (error: { message?: string; code?: string } | null) =>
  isOptionalQueryError(error) || isSchemaMismatchError(error);

const designerUserId = (d: DesignerCardData) =>
  (d.profile as { user_id?: string }).user_id ?? d.profile.id;

export const useSavedDesignerIds = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [SAVED_DESIGNER_IDS_KEY, user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await saves()
        .select("designer_id")
        .eq("user_id", user!.id)
        .limit(SAVED_DESIGNERS_MAX);
      if (error) {
        if (isMissingTable(error)) return new Set();
        throw error;
      }
      return new Set(((data ?? []) as { designer_id: string }[]).map((r) => r.designer_id));
    },
  });
};

async function fetchDesignerProfiles(ids: string[]): Promise<Tables<"profiles">[]> {
  const first = await profilesPublicFrom().select(PROFILE_DESIGNER_SELECT).in("user_id", ids);
  let data: unknown[] | null = first.data;
  let error = first.error;
  if (error && isMissingTable(error)) {
    const retry = await profilesPublicFrom().select(PROFILE_DESIGNER_SELECT_NO_ACTIVE).in("user_id", ids);
    data = retry.data;
    error = retry.error;
  }
  if (error) throw error;
  return (data ?? []) as Tables<"profiles">[];
}

/** Saved designers, newest save first. Designers who hid or deleted their profile drop out. */
export const useSavedDesigners = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [SAVED_DESIGNERS_KEY, user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<SavedDesigner[]> => {
      const { data, error } = await saves()
        .select("designer_id, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(SAVED_DESIGNERS_MAX);
      if (error) {
        if (isMissingTable(error)) return [];
        throw error;
      }
      const rows = (data ?? []) as DesignerSaveRow[];
      if (!rows.length) return [];

      const savedAt = new Map(rows.map((r) => [r.designer_id, r.created_at]));
      const ids = rows.map((r) => r.designer_id);
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += DESIGNERS_PAGE) chunks.push(ids.slice(i, i + DESIGNERS_PAGE));

      const cards = (
        await Promise.all(
          chunks.map(async (chunk) =>
            buildDesignerCards(await fetchDesignerProfiles(chunk), { keepWithoutWorks: true }),
          ),
        )
      ).flat();

      return cards
        .map((card) => ({ ...card, savedAt: savedAt.get(designerUserId(card)) ?? "" }))
        .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    },
  });
};

/** Heart / un-heart a designer. Optimistic, so the heart and the Portfolio list react at once. */
export const useToggleSavedDesigner = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const invalidate = () => {
    if (!user?.id) return;
    void qc.invalidateQueries({ queryKey: [SAVED_DESIGNER_IDS_KEY, user.id] });
    void qc.invalidateQueries({ queryKey: [SAVED_DESIGNERS_KEY, user.id] });
  };

  const insert = async (designerId: string) => {
    const { error } = await saves().insert({ user_id: user!.id, designer_id: designerId } as never);
    // Already saved (double tap / second tab) is fine.
    if (error && (error as { code?: string }).code !== "23505") throw error;
  };

  return useMutation({
    mutationFn: async ({ designerId, saved }: { designerId: string; saved: boolean; name?: string }) => {
      if (!user) throw new Error("unauth");
      if (designerId === user.id) throw new Error("self");
      if (saved) {
        const { error } = await saves().delete().eq("user_id", user.id).eq("designer_id", designerId);
        if (error) throw error;
      } else {
        await insert(designerId);
      }
    },
    onMutate: async ({ designerId, saved }) => {
      if (!user?.id) return;
      const idsKey = [SAVED_DESIGNER_IDS_KEY, user.id] as const;
      const listKey = [SAVED_DESIGNERS_KEY, user.id] as const;
      await qc.cancelQueries({ queryKey: idsKey });
      await qc.cancelQueries({ queryKey: listKey });
      const previousIds = qc.getQueryData<Set<string>>(idsKey);
      const previousList = qc.getQueryData<SavedDesigner[]>(listKey);
      const next = new Set(previousIds ?? []);
      if (saved) next.delete(designerId);
      else next.add(designerId);
      qc.setQueryData(idsKey, next);
      // Un-hearting on Portfolio → Designers: the card leaves at once instead of after a refetch.
      if (saved && previousList) {
        qc.setQueryData<SavedDesigner[]>(
          listKey,
          previousList.filter((d) => designerUserId(d) !== designerId),
        );
      }
      return { previousIds, previousList, idsKey, listKey };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previousIds) qc.setQueryData(ctx.idsKey, ctx.previousIds);
      if (ctx?.previousList) qc.setQueryData(ctx.listKey, ctx.previousList);
      if (err instanceof Error && err.message === "unauth") return;
      toast.error("บันทึกดีไซเนอร์ไม่สำเร็จ", { description: "ลองใหม่อีกครั้ง" });
    },
    onSuccess: (_data, { designerId, saved, name }) => {
      if (saved) {
        toast.success(name ? `เอา ${name} ออกจากดีไซเนอร์ที่บันทึกแล้ว` : "เอาออกจากดีไซเนอร์ที่บันทึกแล้ว", {
          action: {
            label: "เลิกทำ",
            onClick: () => {
              if (!user?.id) return;
              void insert(designerId)
                .catch(() => toast.error("เลิกทำไม่สำเร็จ"))
                .finally(invalidate);
            },
          },
        });
        return;
      }
      toast.success(name ? `บันทึก ${name} แล้ว` : "บันทึกดีไซเนอร์แล้ว", {
        description: "ดูรวมได้ที่ Portfolio → Designers",
        action: { label: "ดูทั้งหมด", onClick: () => navigate(SAVED_DESIGNERS_PATH) },
      });
    },
    onSettled: invalidate,
  });
};
