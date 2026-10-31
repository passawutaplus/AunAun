import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { buildDesignerCards, DESIGNERS_PAGE, type DesignerCardData } from "@/hooks/useDesigners";
import {
  PROFILE_DESIGNER_SELECT,
  PROFILE_DESIGNER_SELECT_NO_ACTIVE,
} from "@/lib/dbSelects";
import { profilesPublicFrom } from "@/lib/profileAccess";
import { isOptionalQueryError, isSchemaMismatchError } from "@/lib/supabaseErrors";

/** Cards for Portfolio → Designers (everyone you follow). */
export const FOLLOWED_DESIGNERS_KEY = "followed-designers";
export const FOLLOWED_DESIGNERS_PATH = "/portfolio?tab=designers";

/** Plenty for one person's follow list; loaded in feed-sized chunks. */
const FOLLOWED_DESIGNERS_MAX = 240;

export type FollowedDesigner = DesignerCardData & {
  followedAt: string;
  /** They follow the signed-in user too (mutual follows can tag each other on works). */
  followsYou: boolean;
};

const designerUserId = (d: DesignerCardData) =>
  (d.profile as { user_id?: string }).user_id ?? d.profile.id;

async function fetchDesignerProfiles(ids: string[]): Promise<Tables<"profiles">[]> {
  const first = await profilesPublicFrom().select(PROFILE_DESIGNER_SELECT).in("user_id", ids);
  let data: unknown[] | null = first.data;
  let error = first.error;
  if (error && (isSchemaMismatchError(error) || isOptionalQueryError(error))) {
    const retry = await profilesPublicFrom().select(PROFILE_DESIGNER_SELECT_NO_ACTIVE).in("user_id", ids);
    data = retry.data;
    error = retry.error;
  }
  if (error) throw error;
  return (data ?? []) as Tables<"profiles">[];
}

/** Designers the signed-in user follows, newest follow first. Hidden or deleted profiles drop out. */
export const useFollowedDesigners = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [FOLLOWED_DESIGNERS_KEY, user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<FollowedDesigner[]> => {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id, created_at")
        .eq("follower_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(FOLLOWED_DESIGNERS_MAX);
      if (error) throw error;
      const rows = (data ?? []) as { following_id: string; created_at: string | null }[];
      if (!rows.length) return [];

      const followedAt = new Map(rows.map((r) => [r.following_id, r.created_at ?? ""]));
      const ids = rows.map((r) => r.following_id);
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += DESIGNERS_PAGE) chunks.push(ids.slice(i, i + DESIGNERS_PAGE));

      const [cardChunks, backChunks] = await Promise.all([
        Promise.all(
          chunks.map(async (chunk) =>
            buildDesignerCards(await fetchDesignerProfiles(chunk), { keepWithoutWorks: true }),
          ),
        ),
        Promise.all(
          chunks.map(async (chunk) => {
            const { data: back } = await supabase
              .from("follows")
              .select("follower_id")
              .eq("following_id", user!.id)
              .in("follower_id", chunk);
            return (back ?? []).map((r) => r.follower_id);
          }),
        ),
      ]);
      const followsBack = new Set(backChunks.flat());

      return cardChunks
        .flat()
        .map((card) => ({
          ...card,
          followedAt: followedAt.get(designerUserId(card)) ?? "",
          followsYou: followsBack.has(designerUserId(card)),
        }))
        .sort((a, b) => b.followedAt.localeCompare(a.followedAt));
    },
  });
};
