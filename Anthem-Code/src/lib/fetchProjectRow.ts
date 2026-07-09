import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  PROJECT_DETAIL_SELECT,
  PROJECT_FEED_SELECT,
  PROJECT_LICENSE_EXTRA_SELECT,
  PROJECT_CONTEXT_SELECT,
  PROJECT_EXTERNAL_LINKS_SELECT,
  PROJECT_ASSETS_SELECT,
  PROJECT_CONTENT_SELECT,
} from "@/lib/dbSelects";
import { isSchemaMismatchError } from "@/lib/supabaseErrors";

const PROJECT_DETAIL_BASE =
  `${PROJECT_FEED_SELECT}, description, price_thb, subtitle, studio_id, credited_user_ids, updated_at, ${PROJECT_LICENSE_EXTRA_SELECT}`;

const PROJECT_DETAIL_WITH_LINKS =
  `${PROJECT_DETAIL_BASE}, linked_community_post_ids, collab_user_ids, video_urls`;

const PROJECT_DETAIL_WITH_CONTEXT =
  `${PROJECT_DETAIL_WITH_LINKS}, ${PROJECT_CONTEXT_SELECT}`;

const PROJECT_DETAIL_WITH_LINKS_AND_EXTERNAL =
  `${PROJECT_DETAIL_WITH_CONTEXT}, ${PROJECT_EXTERNAL_LINKS_SELECT}`;

const PROJECT_DETAIL_WITH_CONTENT =
  `${PROJECT_DETAIL_WITH_LINKS_AND_EXTERNAL}, ${PROJECT_ASSETS_SELECT}, ${PROJECT_CONTENT_SELECT}`;

const PROJECT_DETAIL_WITH_ASSETS =
  `${PROJECT_DETAIL_WITH_LINKS_AND_EXTERNAL}, ${PROJECT_ASSETS_SELECT}`;

/** Newest optional columns first — retry with lighter selects when DB migrations lag. */
export const PROJECT_DETAIL_SELECT_TIERS = [
  PROJECT_DETAIL_SELECT,
  PROJECT_DETAIL_WITH_CONTENT,
  PROJECT_DETAIL_WITH_ASSETS,
  PROJECT_DETAIL_WITH_LINKS_AND_EXTERNAL,
  PROJECT_DETAIL_WITH_CONTEXT,
  PROJECT_DETAIL_WITH_LINKS,
  PROJECT_DETAIL_BASE,
  `${PROJECT_FEED_SELECT}, description`,
  PROJECT_FEED_SELECT,
] as const;

export async function fetchProjectRow(id: string): Promise<Tables<"projects"> | null> {
  let lastError: { message?: string; code?: string } | null = null;

  for (const select of PROJECT_DETAIL_SELECT_TIERS) {
    const { data, error } = await supabase.from("projects").select(select).eq("id", id).maybeSingle();
    if (!error) return data as Tables<"projects"> | null;
    if (isSchemaMismatchError(error)) {
      lastError = error;
      continue;
    }
    throw error;
  }

  if (lastError) throw lastError;
  return null;
}

export async function fetchProjectRows(
  buildQuery: (select: string) => ReturnType<typeof supabase.from>,
): Promise<Tables<"projects">[]> {
  let lastError: { message?: string; code?: string } | null = null;

  for (const select of PROJECT_DETAIL_SELECT_TIERS) {
    const { data, error } = await buildQuery(select);
    if (!error) return (data ?? []) as Tables<"projects">[];
    if (isSchemaMismatchError(error)) {
      lastError = error;
      continue;
    }
    throw error;
  }

  if (lastError) throw lastError;
  return [];
}
