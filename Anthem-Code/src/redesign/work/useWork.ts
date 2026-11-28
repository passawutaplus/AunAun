import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getCommentSmiles, getPictureRatios, getWork, getWorkCatalog, getWorkImageLikes, getWorkLike, getWorkOwner } from "@/server/queries/work";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { getShowcaseRows, type ShowcaseRow } from "@/server/queries/showcase";
import {
  blockPerson,
  recordWorkHistory,
  recordWorkView,
  sendReport,
  setCommentSmiled,
  setImageLiked,
  setWorkLiked,
  type WorkReportReason,
} from "@/server/mutations/work";
import { BLOCKED_USER_IDS_KEY } from "@/hooks/useBlockedUserIds";
import { isCategoryAllowed } from "@/lib/cookieConsent";
import { trackProductEvent } from "@/lib/productEvents";
import { recordProjectViewAffinity } from "@/lib/viewAffinity";
import { getHiddenProjectIds, getHiddenProjectIdsSnapshot, hideProjectId, subscribeHiddenProjects } from "@/lib/hiddenProjects";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { workMedia, workText } from "./workContent";

/** One work, its owner and what the page derives from it (pictures, words). */
export function useWork(id: string | undefined, opts: { countView?: boolean } = {}) {
  const countView = opts.countView ?? true;
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

  // A visit (old ProjectDetailPage): the view count for the owner (once per browser session), and — with the
  // analytics cookie allowed — the product event, the category taste on this device and, signed in, the
  // viewing history that For You learns from (anthem.project_views).
  const { user } = useAuth();
  const uid = user?.id;
  const loaded = !!work.data;
  const category = work.data?.category ?? work.data?.sc_category ?? null;
  useEffect(() => {
    if (!countView || !id || !loaded) return;
    void recordWorkView(id).catch(() => undefined);
    if (!isCategoryAllowed("analytics")) return;
    void trackProductEvent("project_view", { project_id: id }, { debounceMs: 5_000 });
    recordProjectViewAffinity({ category });
  }, [countView, id, loaded, category]);
  useEffect(() => {
    if (countView && id && loaded && uid && isCategoryAllowed("analytics")) void recordWorkHistory(uid, id).catch(() => undefined);
  }, [countView, id, loaded, uid]);

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

/** Works hidden on this device (old "ซ่อนผลงานนี้", same localStorage list as the old site). */
export function useHiddenWorks() {
  const hidden = useSyncExternalStore(subscribeHiddenProjects, getHiddenProjectIds, getHiddenProjectIdsSnapshot);
  return { hidden, hide: hideProjectId };
}

/** Block a person; everything that hides blocked people's works, comments and chats refreshes. */
export function useBlockPerson() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (other: string) => {
      if (!uid) throw new Error("ล็อกอินก่อนนะ");
      return blockPerson(uid, other);
    },
    onSuccess: () => {
      for (const key of [["user-blocks", uid], ["blocked-chat-users", uid], [BLOCKED_USER_IDS_KEY, uid], ["community-posts"]]) {
        void qc.invalidateQueries({ queryKey: key });
      }
    },
  });
}

/** The RPC's own messages start with a code ("DUPLICATE: …"); show the words only. */
export function reportErrorText(err: unknown): string {
  const raw = typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : "";
  const m = /^(RATE_LIMIT|DUPLICATE|AUTH|INVALID):\s*([\s\S]+)$/.exec(raw);
  return m ? m[2].trim() : mapWriteFlowError(err, "ส่งรายงานไม่สำเร็จ ลองใหม่อีกทีนะ");
}

export function useSendReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { targetType: "project" | "comment"; targetId: string; ownerId: string | null; reason: WorkReportReason; details: string }) =>
      sendReport(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["reports", "mine"] }),
  });
}

/**
 * The own ratio (width / height) of pictures from other works, so a grid shows them uncropped: the sizes
 * saved with the works first; a picture without one is measured from a small copy. `done` once every picture
 * has a ratio (0 = could not tell).
 */
export function usePictureRatios(items: ReadonlyArray<{ projectId: string; url: string }>) {
  const ids = useMemo(() => [...new Set(items.map((i) => i.projectId))].sort(), [items]);
  const saved = useQuery({
    queryKey: ["sc-picture-ratios", ids],
    enabled: ids.length > 0,
    staleTime: 10 * 60_000,
    queryFn: () => getPictureRatios(ids),
  });
  const [measured, setMeasured] = useState<Record<string, number>>({});
  const started = useRef(new Set<string>());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Without saved sizes (or when they cannot be read) every picture is measured.
  const failed = saved.isError;
  const known = useMemo(() => saved.data ?? (failed ? {} : null), [saved.data, failed]);
  useEffect(() => {
    if (!known) return;
    for (const { url } of items) {
      if (known[url] || started.current.has(url)) continue;
      started.current.add(url);
      const img = new Image();
      const put = (r: number) => alive.current && setMeasured((m) => ({ ...m, [url]: r }));
      img.onload = () => put(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0);
      img.onerror = () => put(0);
      img.src = proxiedImageUrl(url, 384);
    }
  }, [items, known]);

  const ratioOf = useCallback((url: string): number | undefined => known?.[url] || measured[url], [known, measured]);
  const done = !!known && items.every((i) => known[i.url] || i.url in measured);
  return { ratioOf, done: items.length === 0 || done };
}
