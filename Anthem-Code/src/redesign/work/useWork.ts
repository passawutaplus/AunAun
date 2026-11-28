import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getCommentSmiles, getWork, getWorkCatalog, getWorkImageLikes, getWorkLike, getWorkOwner } from "@/server/queries/work";
import { getShowcaseRows, type ShowcaseRow } from "@/server/queries/showcase";
import { recordWorkView, setCommentSmiled, setImageLiked, setWorkLiked } from "@/server/mutations/work";
import { workMedia, workText } from "./workContent";

/** One work, its owner and what the page derives from it (pictures, words). */
export function useWork(id: string | undefined) {
  const work = useQuery({ queryKey: ["sc-work", id], queryFn: () => getWork(id!), enabled: !!id, staleTime: 60_000 });
  const ownerId = work.data?.owner_id ?? undefined;
  const owner = useQuery({
    queryKey: ["sc-work-owner", ownerId],
    queryFn: () => getWorkOwner(ownerId!),
    enabled: !!ownerId,
    staleTime: 5 * 60_000,
  });
  const media = useMemo(() => (work.data ? workMedia(work.data) : []), [work.data]);
  const text = useMemo(() => (work.data ? workText(work.data) : ""), [work.data]);

  useEffect(() => {
    if (id && work.data) void recordWorkView(id).catch(() => undefined);
  }, [id, work.data]);

  return { work, owner, media, text };
}

/** Other works of the same person, newest first (More from). */
export function useOwnerWorks(ownerId: string | null | undefined, excludeId: string | undefined) {
  return useQuery({
    queryKey: ["sc-owner-works", ownerId, excludeId],
    enabled: !!ownerId && !!excludeId,
    staleTime: 5 * 60_000,
    queryFn: (): Promise<ShowcaseRow[]> => getShowcaseRows({ ownerIds: [ownerId!], excludeIds: [excludeId!] }, 0, 3),
  });
}

/** The public catalog that holds the work, and the covers of its other works. */
export function useWorkCatalog(projectId: string | undefined) {
  const catalog = useQuery({
    queryKey: ["sc-work-catalog", projectId],
    enabled: !!projectId,
    staleTime: 5 * 60_000,
    queryFn: () => getWorkCatalog(projectId!),
  });
  const ids = catalog.data?.projectIds.slice(0, 2) ?? [];
  const items = useQuery({
    queryKey: ["sc-work-catalog-items", ids],
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const rows = await getShowcaseRows({ ids }, 0, ids.length - 1);
      return ids.map((x) => rows.find((r) => r.id === x)).filter((r): r is ShowcaseRow => !!r);
    },
  });
  return { catalog: catalog.data ?? null, items: items.data ?? [] };
}

type LikeMap = Record<string, { likes: number; liked: boolean }>;
type LikeState = { perImage: boolean; map: LikeMap };

/**
 * Likes on the pictures of a work. Before the per-picture table exists (owner SQL not run yet),
 * the work's own like shows on its first picture only.
 */
export function useImageLikes(projectId: string | undefined, firstUrl: string | undefined) {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const key = useMemo(() => ["sc-work-image-likes", projectId, uid ?? ""], [projectId, uid]);

  const { data } = useQuery({
    queryKey: key,
    // the first picture carries the work's own like in the fallback mode, so wait for it
    enabled: !!projectId && !!firstUrl,
    queryFn: async (): Promise<LikeState> => {
      const rows = await getWorkImageLikes(projectId!);
      if (rows) return { perImage: true, map: Object.fromEntries(rows.map((r) => [r.image_url, { likes: r.likes, liked: r.liked }])) };
      return { perImage: false, map: firstUrl ? { [firstUrl]: await getWorkLike(projectId!) } : {} };
    },
  });

  const { mutate } = useMutation({
    mutationFn: ({ url, like, perImage }: { url: string; like: boolean; perImage: boolean }) =>
      perImage ? setImageLiked(uid!, projectId!, url, like) : setWorkLiked(uid!, projectId!, like),
    onMutate: async ({ url, like }) => {
      await qc.cancelQueries({ queryKey: key });
      const before = qc.getQueryData<LikeState>(key);
      qc.setQueryData<LikeState>(key, (old) => {
        if (!old) return old;
        const cur = old.map[url] ?? { likes: 0, liked: false };
        return { ...old, map: { ...old.map, [url]: { likes: Math.max(0, cur.likes + (like ? 1 : -1)), liked: like } } };
      });
      return { before };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.before),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: ["project-like-count", projectId] });
      void qc.invalidateQueries({ queryKey: ["project-liked", projectId, uid] });
    },
  });

  /** null = this picture has no like button (old single-like mode, pictures after the first). */
  const likeFor = useCallback(
    (url: string, index: number) => {
      if (!data) return null;
      if (!data.perImage && index > 0) return null;
      return data.map[url] ?? { likes: 0, liked: false };
    },
    [data],
  );

  const toggle = useCallback(
    (url: string) => {
      if (!uid || !data) return false;
      const cur = data.map[url];
      mutate({ url, like: !cur?.liked, perImage: data.perImage });
      return true;
    },
    [uid, data, mutate],
  );

  return { likeFor, toggle, signedIn: !!uid };
}

/** Smiles on comments: which ones the signed-in person smiled at. `available` is false before the table exists. */
export function useCommentSmiles(projectId: string | undefined, commentIds: readonly string[]) {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const idsKey = [...commentIds].sort().join(",");
  const key = useMemo(() => ["sc-comment-smiles", projectId, idsKey], [projectId, idsKey]);

  const { data } = useQuery({
    queryKey: key,
    enabled: !!projectId,
    queryFn: () => getCommentSmiles(commentIds),
  });

  const mine = useMemo(() => new Set((data ?? []).filter((r) => r.user_id === uid).map((r) => r.comment_id)), [data, uid]);

  const { mutate } = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => setCommentSmiled(uid!, id, on),
    onMutate: async ({ id, on }) => {
      await qc.cancelQueries({ queryKey: key });
      const before = qc.getQueryData<Array<{ comment_id: string; user_id: string }> | null>(key);
      qc.setQueryData<Array<{ comment_id: string; user_id: string }> | null>(key, (old) => {
        const rows = (old ?? []).filter((r) => !(r.comment_id === id && r.user_id === uid));
        return on ? [...rows, { comment_id: id, user_id: uid! }] : rows;
      });
      return { before };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.before),
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  });

  const toggle = useCallback(
    (id: string) => {
      if (!uid) return false;
      mutate({ id, on: !mine.has(id) });
      return true;
    },
    [uid, mine, mutate],
  );

  return { available: data !== null && data !== undefined, mine, toggle };
}
