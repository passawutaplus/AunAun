import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type InspireBoard = Tables<"inspire_boards"> & {
  is_default?: boolean | null;
};
export type InspireItem = Tables<"inspire_items"> & {
  pinned_at?: string | null;
};

export type InspireBoardWithCovers = InspireBoard & {
  covers: string[];
};

export type InspireRecentItem = Pick<
  InspireItem,
  "id" | "board_id" | "project_id" | "image_url" | "added_at"
> & {
  pinned_at?: string | null;
  board_name?: string;
  /** All boards this image currently sits on (for filter + chips). */
  board_ids?: string[];
};

export function isInspireItemPinned(
  item: Pick<{ pinned_at?: string | null }, "pinned_at"> | null | undefined,
): boolean {
  return !!item?.pinned_at;
}

/** Pinned first (newest pin), then by added_at. */
export function compareInspireItemsByPinThenDate(
  a: Pick<InspireRecentItem, "pinned_at" | "added_at">,
  b: Pick<InspireRecentItem, "pinned_at" | "added_at">,
  sortMode: "newest" | "oldest" = "newest",
): number {
  const aPin = a.pinned_at ? Date.parse(a.pinned_at) || 1 : 0;
  const bPin = b.pinned_at ? Date.parse(b.pinned_at) || 1 : 0;
  if (aPin !== bPin) return bPin - aPin;
  const ta = Date.parse(a.added_at ?? "") || 0;
  const tb = Date.parse(b.added_at ?? "") || 0;
  return sortMode === "oldest" ? ta - tb : tb - ta;
}

/** Display name for the system central library board. */
export const INSPIRE_LIBRARY_BOARD_NAME = "คลังรวม";

export function isDefaultInspireBoard(
  board: Pick<InspireBoard, "is_default"> | null | undefined,
): boolean {
  return !!board?.is_default;
}

const fetchBoardCovers = async (boardIds: string[]): Promise<Record<string, string[]>> => {
  if (!boardIds.length) return {};
  try {
    const { data, error } = await supabase
      .from("inspire_items")
      .select("board_id, image_url, added_at")
      .in("board_id", boardIds)
      .order("added_at", { ascending: false });
    if (error) return {};
    const map: Record<string, string[]> = {};
    for (const row of data ?? []) {
      const arr = map[row.board_id] ?? (map[row.board_id] = []);
      if (arr.length >= 4) continue;
      const url = (row.image_url ?? "").trim();
      if (url && !arr.includes(url)) arr.push(url);
    }
    return map;
  } catch {
    return {};
  }
};

function isDuplicateInspireError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "23505" ||
    `${error.message ?? ""}`.toLowerCase().includes("duplicate") ||
    `${error.message ?? ""}`.includes("inspire_items_board_image_uidx")
  );
}

async function refreshBoardMeta(boardId: string, coverUrl?: string) {
  const { count } = await supabase
    .from("inspire_items")
    .select("id", { count: "exact", head: true })
    .eq("board_id", boardId);

  let nextCover = coverUrl;
  if (!nextCover) {
    const { data: latest } = await supabase
      .from("inspire_items")
      .select("image_url")
      .eq("board_id", boardId)
      .order("added_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    nextCover = latest?.image_url ?? "";
  }

  await supabase
    .from("inspire_boards")
    .update({
      item_count: count ?? 0,
      cover_url: nextCover ?? "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", boardId);
}

async function insertInspireItem(opts: {
  boardId: string;
  projectId: string;
  imageUrl: string;
}): Promise<"added" | "duplicate"> {
  const { boardId, projectId, imageUrl } = opts;
  const { data: existing } = await supabase
    .from("inspire_items")
    .select("id")
    .eq("board_id", boardId)
    .eq("image_url", imageUrl)
    .maybeSingle();
  if (existing) return "duplicate";

  const { error } = await supabase
    .from("inspire_items")
    .insert({ board_id: boardId, project_id: projectId, image_url: imageUrl });
  if (isDuplicateInspireError(error)) return "duplicate";
  if (error) throw error;

  await refreshBoardMeta(boardId, imageUrl);
  return "added";
}

/** Ensure the user has a system central library board. */
export async function ensureDefaultInspireLibrary(userId: string): Promise<InspireBoard> {
  const { data: existing, error: existingErr } = await supabase
    .from("inspire_boards")
    .select("*")
    .eq("owner_id", userId)
    .eq("is_default", true)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (existing) return existing as InspireBoard;

  const { data, error } = await supabase
    .from("inspire_boards")
    .insert({
      owner_id: userId,
      name: INSPIRE_LIBRARY_BOARD_NAME,
      is_default: true,
    } as never)
    .select()
    .single();

  if (error) {
    // Race: another tab created it — fetch again.
    if (isDuplicateInspireError(error) || error.code === "23505") {
      const { data: again, error: againErr } = await supabase
        .from("inspire_boards")
        .select("*")
        .eq("owner_id", userId)
        .eq("is_default", true)
        .maybeSingle();
      if (againErr) throw againErr;
      if (again) return again as InspireBoard;
    }
    throw error;
  }
  return data as InspireBoard;
}

/** Keep a default library board ready while browsing /inspire. */
export function useEnsureInspireLibrary(userId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      try {
        await ensureDefaultInspireLibrary(userId);
        if (!cancelled) {
          qc.invalidateQueries({ queryKey: ["inspire-boards", userId] });
        }
      } catch {
        /* ignore — UI can still work once user saves */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, qc]);
}

export const useInspireBoards = (userId: string | undefined) =>
  useQuery({
    queryKey: ["inspire-boards", userId],
    enabled: !!userId,
    queryFn: async (): Promise<InspireBoardWithCovers[]> => {
      const { data, error } = await supabase
        .from("inspire_boards")
        .select("*")
        .eq("owner_id", userId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const boards = (data ?? []) as InspireBoard[];
      const coverMap = await fetchBoardCovers(boards.map((b) => b.id));
      return boards.map((b) => {
        const covers = coverMap[b.id] ?? [];
        if (!covers.length && b.cover_url) covers.push(b.cover_url);
        return { ...b, covers };
      });
    },
  });

/**
 * Central library feed: unique images across the user's inspire items
 * (newest first). Prefer the library-board row when the same image appears
 * on multiple boards.
 */
export const useRecentInspireItems = (userId: string | undefined, limit = 120) =>
  useQuery({
    queryKey: ["inspire-recent-items", userId, limit],
    enabled: !!userId,
    queryFn: async (): Promise<InspireRecentItem[]> => {
      const { data: boards, error: boardErr } = await supabase
        .from("inspire_boards")
        .select("id, name, is_default")
        .eq("owner_id", userId!);
      if (boardErr) throw boardErr;
      const boardList = (boards ?? []) as Pick<InspireBoard, "id" | "name" | "is_default">[];
      if (!boardList.length) return [];
      const nameById = new Map(boardList.map((b) => [b.id, b.name]));
      const defaultId = boardList.find((b) => b.is_default)?.id;
      const { data, error } = await supabase
        .from("inspire_items")
        .select("id, board_id, project_id, image_url, added_at, pinned_at")
        .in(
          "board_id",
          boardList.map((b) => b.id),
        )
        .order("added_at", { ascending: false })
        .limit(Math.max(limit * 4, 200));
      if (error) throw error;

      const byUrl = new Map<string, InspireRecentItem>();
      const memberships = new Map<string, Set<string>>();
      for (const row of data ?? []) {
        const url = (row.image_url ?? "").trim();
        if (!url) continue;
        const set = memberships.get(url) ?? new Set<string>();
        set.add(row.board_id);
        memberships.set(url, set);

        const mapped: InspireRecentItem = {
          ...(row as InspireRecentItem),
          board_name: nameById.get(row.board_id),
        };
        const prev = byUrl.get(url);
        if (!prev) {
          byUrl.set(url, mapped);
          continue;
        }
        const prevPinned = isInspireItemPinned(prev);
        const nextPinned = isInspireItemPinned(mapped);
        if (nextPinned && !prevPinned) {
          byUrl.set(url, mapped);
          continue;
        }
        if (prevPinned && !nextPinned) continue;
        // Prefer the central library row when present.
        if (defaultId && row.board_id === defaultId && prev.board_id !== defaultId) {
          byUrl.set(url, mapped);
        }
      }

      return [...byUrl.values()]
        .map((item) => ({
          ...item,
          board_ids: [...(memberships.get(item.image_url) ?? [item.board_id])],
        }))
        .sort((a, b) => compareInspireItemsByPinThenDate(a, b, "newest"))
        .slice(0, limit);
    },
  });

/** Board IDs that already contain this exact image URL (for the current user). */
export const useInspireBoardIdsForImage = (
  userId: string | undefined,
  imageUrl: string | undefined,
  enabled = true,
) =>
  useQuery({
    queryKey: ["inspire-boards-for-image", userId, imageUrl],
    enabled: enabled && !!userId && !!imageUrl,
    queryFn: async (): Promise<string[]> => {
      const { data: boards, error: boardErr } = await supabase
        .from("inspire_boards")
        .select("id")
        .eq("owner_id", userId!);
      if (boardErr) throw boardErr;
      const boardIds = (boards ?? []).map((b: { id: string }) => b.id);
      if (!boardIds.length) return [];

      const { data, error } = await supabase
        .from("inspire_items")
        .select("board_id")
        .eq("image_url", imageUrl!)
        .in("board_id", boardIds);
      if (error) throw error;
      return [...new Set((data ?? []).map((r: { board_id: string }) => r.board_id))];
    },
  });

export const useCreateInspireBoard = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!userId) throw new Error("ต้องเข้าสู่ระบบก่อน");
      await ensureDefaultInspireLibrary(userId);
      const { data, error } = await supabase
        .from("inspire_boards")
        .insert({ owner_id: userId, name, is_default: false } as never)
        .select()
        .single();
      if (error) throw error;
      return data as InspireBoard;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspire-boards", userId] });
      qc.invalidateQueries({ queryKey: ["inspire-recent-items", userId] });
    },
  });
};

export const useUpdateInspireBoard = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("กรุณาตั้งชื่อบอร์ด");
      const { error } = await supabase
        .from("inspire_boards")
        .update({ name: trimmed, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("is_default", false);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["inspire-boards", userId] });
      qc.invalidateQueries({ queryKey: ["inspire-board", vars.id] });
      qc.invalidateQueries({ queryKey: ["inspire-recent-items", userId] });
    },
  });
};

export const useAddToInspireBoard = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      boardId,
      projectId,
      imageUrl,
    }: {
      boardId: string;
      projectId: string;
      imageUrl: string;
    }): Promise<"added" | "duplicate"> => insertInspireItem({ boardId, projectId, imageUrl }),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: ["inspire-boards", userId] });
      qc.invalidateQueries({ queryKey: ["inspire-items", vars.boardId] });
      qc.invalidateQueries({ queryKey: ["inspire-board", vars.boardId] });
      qc.invalidateQueries({ queryKey: ["inspire-boards-for-image", userId, vars.imageUrl] });
      qc.invalidateQueries({ queryKey: ["inspire-recent-items", userId] });
    },
  });
};

/**
 * Save to the central library first, then optionally into extra boards
 * (same image can live on library + folders).
 */
export const useSaveToInspire = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      imageUrl,
      boardIds = [],
    }: {
      projectId: string;
      imageUrl: string;
      boardIds?: string[];
    }): Promise<{ library: "added" | "duplicate"; boards: Record<string, "added" | "duplicate"> }> => {
      if (!userId) throw new Error("ต้องเข้าสู่ระบบก่อน");
      const library = await ensureDefaultInspireLibrary(userId);
      const libraryResult = await insertInspireItem({
        boardId: library.id,
        projectId,
        imageUrl,
      });

      const boards: Record<string, "added" | "duplicate"> = {};
      const extras = [...new Set(boardIds.filter((id) => id && id !== library.id))];
      for (const boardId of extras) {
        boards[boardId] = await insertInspireItem({ boardId, projectId, imageUrl });
      }
      return { library: libraryResult, boards };
    },
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: ["inspire-boards", userId] });
      qc.invalidateQueries({ queryKey: ["inspire-recent-items", userId] });
      qc.invalidateQueries({ queryKey: ["inspire-boards-for-image", userId, vars.imageUrl] });
      for (const boardId of vars.boardIds ?? []) {
        qc.invalidateQueries({ queryKey: ["inspire-items", boardId] });
        qc.invalidateQueries({ queryKey: ["inspire-board", boardId] });
      }
    },
  });
};

export const useInspireBoard = (boardId: string | undefined) =>
  useQuery({
    queryKey: ["inspire-board", boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspire_boards")
        .select("*")
        .eq("id", boardId!)
        .maybeSingle();
      if (error) throw error;
      return data as InspireBoard | null;
    },
  });

export const useInspireBoardItems = (boardId: string | undefined) =>
  useQuery({
    queryKey: ["inspire-items", boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspire_items")
        .select("*")
        .eq("board_id", boardId!)
        .order("added_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as InspireItem[];
      return rows.sort((a, b) => compareInspireItemsByPinThenDate(a, b, "newest"));
    },
  });

export const useToggleInspireItemPin = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      boardId,
      pinned,
    }: {
      itemId: string;
      boardId: string;
      pinned: boolean;
    }) => {
      const { error } = await supabase
        .from("inspire_items")
        .update({
          pinned_at: pinned ? new Date().toISOString() : null,
        } as never)
        .eq("id", itemId);
      if (error) throw error;
      return { itemId, boardId, pinned };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["inspire-items", result.boardId] });
      qc.invalidateQueries({ queryKey: ["inspire-board", result.boardId] });
      qc.invalidateQueries({ queryKey: ["inspire-boards", userId] });
      qc.invalidateQueries({ queryKey: ["inspire-recent-items", userId] });
    },
  });
};
export const useRemoveFromInspireBoard = (boardId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("inspire_items").delete().eq("id", itemId);
      if (error) throw error;
      if (!boardId) return;
      await refreshBoardMeta(boardId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspire-items", boardId] });
      qc.invalidateQueries({ queryKey: ["inspire-board", boardId] });
      qc.invalidateQueries({ queryKey: ["inspire-boards"] });
      qc.invalidateQueries({ queryKey: ["inspire-recent-items"] });
    },
  });
};

export const useDeleteInspireBoard = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (boardId: string) => {
      const { data: board, error: boardErr } = await supabase
        .from("inspire_boards")
        .select("id, is_default")
        .eq("id", boardId)
        .maybeSingle();
      if (boardErr) throw boardErr;
      if ((board as InspireBoard | null)?.is_default) {
        throw new Error("ไม่สามารถลบคลังรวมได้");
      }

      const { error: itemsErr } = await supabase.from("inspire_items").delete().eq("board_id", boardId);
      if (itemsErr) throw itemsErr;
      const { error } = await supabase.from("inspire_boards").delete().eq("id", boardId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspire-boards", userId] });
      qc.invalidateQueries({ queryKey: ["inspire-recent-items", userId] });
    },
  });
};
