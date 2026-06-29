import { useCallback, useEffect, useRef, useState } from "react";
import { projectDraftSchema, type ProjectDraftInput } from "@/lib/validators";
import {
  clearPortfolioEditorLocal,
  loadPortfolioEditorLocal,
  portfolioEditorHasContent,
  savePortfolioEditorLocal,
  type PortfolioEditorSnapshot,
} from "@/lib/portfolioEditorStorage";

export type PortfolioAutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

type EditorState = {
  title: string;
  subtitle: string;
  description: string;
  category: string;
  cover_url: string;
  gallery_urls: string[];
  video_urls: string[];
  tools: string[];
  tags: string[];
  linked_community_post_ids?: string[];
};

type Options = {
  userId: string | undefined;
  projectId: string | null;
  state: EditorState;
  enabled?: boolean;
  debounceMs?: number;
  saveDraft: {
    mutateAsync: (payload: ProjectDraftInput & { projectId: string | null }) => Promise<{ id: string }>;
    isPending: boolean;
  };
  onProjectId: (id: string) => void;
};

export function usePortfolioAutosave({
  userId,
  projectId,
  state,
  enabled = true,
  debounceMs = 3000,
  saveDraft,
  onProjectId,
}: Options) {
  const [status, setStatus] = useState<PortfolioAutosaveStatus>("idle");
  const baselineRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  const snapshot = useCallback((): PortfolioEditorSnapshot => {
    return {
      ...state,
      projectId,
      savedAt: Date.now(),
    };
  }, [state, projectId]);

  const serialize = useCallback((s: EditorState) => JSON.stringify(s), []);

  const isDirty = enabled && serialize(state) !== baselineRef.current;

  const persistLocal = useCallback(() => {
    if (!userId) return;
    if (!portfolioEditorHasContent(state)) {
      clearPortfolioEditorLocal(userId);
      return;
    }
    savePortfolioEditorLocal(userId, snapshot());
  }, [userId, state, snapshot]);

  const flushSave = useCallback(async (): Promise<boolean> => {
    if (!userId || !enabled) return true;
    if (!portfolioEditorHasContent(state)) return true;
    if (savingRef.current) return false;

    const parsed = projectDraftSchema.safeParse(state);
    if (!parsed.success) return false;

    savingRef.current = true;
    setStatus("saving");
    try {
      const { id } = await saveDraft.mutateAsync({ ...parsed.data, projectId });
      onProjectId(id);
      baselineRef.current = serialize(state);
      savePortfolioEditorLocal(userId, { ...snapshot(), projectId: id, savedAt: Date.now() });
      setStatus("saved");
      return true;
    } catch {
      setStatus("error");
      return false;
    } finally {
      savingRef.current = false;
    }
  }, [userId, enabled, state, projectId, saveDraft, onProjectId, serialize, snapshot]);

  const markBaseline = useCallback(() => {
    baselineRef.current = serialize(state);
    setStatus("idle");
  }, [state, serialize]);

  useEffect(() => {
    if (!userId || !enabled) return;
    persistLocal();
    if (!portfolioEditorHasContent(state)) {
      setStatus("idle");
      return;
    }
    if (serialize(state) === baselineRef.current) return;

    setStatus("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flushSave();
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [userId, enabled, state, debounceMs, flushSave, persistLocal, serialize]);

  useEffect(() => {
    if (!userId || !enabled) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [userId, enabled, isDirty]);

  return {
    status,
    isDirty,
    flushSave,
    markBaseline,
    loadLocal: () => (userId ? loadPortfolioEditorLocal(userId) : null),
    clearLocal: () => {
      if (userId) clearPortfolioEditorLocal(userId);
    },
  };
}
