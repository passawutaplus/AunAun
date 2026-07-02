import {
  isMissingOptionalCommunityColumnError,
  toCommunityActionError,
} from "@/lib/communityRateLimit";

type QueryRowsResult = PromiseLike<{ data: unknown[] | null; error: unknown }>;
type QueryMaybeSingleResult = PromiseLike<{ data: unknown | null; error: unknown }>;

/** Columns safe on DBs before area-post-enhancements + text-cover migrations. */
export const COMMUNITY_POST_SELECT_LEGACY =
  "id, author_id, post_kind, title, body, category, tags, tools, gallery_urls, video_urls, mentioned_project_ids, tagged_user_ids, media_aspect, question_topic, status, reply_count, like_count, view_count, created_at, updated_at";

export const COMMUNITY_POST_SELECT_FULL = `${COMMUNITY_POST_SELECT_LEGACY}, text_cover_theme, link_urls`;

async function runSelectFallback<T>(
  plans: Array<() => Promise<{ data: T; error: unknown }>>,
): Promise<T> {
  let lastErr: unknown;
  for (const run of plans) {
    const { data, error } = await run();
    if (!error) return data;
    if (isMissingOptionalCommunityColumnError(error)) {
      lastErr = error;
      continue;
    }
    throw toCommunityActionError(error);
  }
  throw toCommunityActionError(lastErr);
}

/** List/select community_posts with graceful fallback when optional columns are missing. */
export async function fetchCommunityPostRows(
  build: (select: string, excludeRepostsByColumn: boolean) => QueryRowsResult,
): Promise<Record<string, unknown>[]> {
  return runSelectFallback([
    async () => {
      const { data, error } = await build(COMMUNITY_POST_SELECT_FULL, true);
      return { data: (data ?? []) as Record<string, unknown>[], error };
    },
    async () => {
      const { data, error } = await build(COMMUNITY_POST_SELECT_LEGACY, true);
      return { data: (data ?? []) as Record<string, unknown>[], error };
    },
    async () => {
      const { data, error } = await build(COMMUNITY_POST_SELECT_LEGACY, false);
      return { data: (data ?? []) as Record<string, unknown>[], error };
    },
  ]);
}

export async function fetchCommunityPostMaybeSingle(
  build: (select: string) => QueryMaybeSingleResult,
): Promise<Record<string, unknown> | null> {
  return runSelectFallback([
    async () => {
      const { data, error } = await build(COMMUNITY_POST_SELECT_FULL);
      return { data: (data ?? null) as Record<string, unknown> | null, error };
    },
    async () => {
      const { data, error } = await build(COMMUNITY_POST_SELECT_LEGACY);
      return { data: (data ?? null) as Record<string, unknown> | null, error };
    },
  ]);
}
