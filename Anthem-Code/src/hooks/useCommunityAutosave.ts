import { useCallback, useEffect, useRef, useState } from "react";
import { communityPostDraftSchema } from "@/lib/validators";
import {
  clearComposerLocal,
  composerHasContent,
  loadComposerLocal,
  saveComposerLocal,
  type ComposerSnapshot,
} from "@/lib/communityComposerStorage";
import type { CommunityComposerPayload } from "@/hooks/useCommunityPosts";

export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

type ComposerState = {
  title: string;
  body: string;
  tags: string[];
  tools: string[];
  gallery_urls: string[];
  video_urls: string[];
};

type Options = {
  userId: string | undefined;
  draftId: string | null;
  state: ComposerState;
  enabled?: boolean;
  debounceMs?: number;
  saveDraft: {
    mutateAsync: (payload: CommunityComposerPayload) => Promise<{ id: string }>;
    isPending: boolean;
  };
  onDraftId: (id: string) => void;
};

export function useCommunityAutosave({
  userId,
  draftId,
  state,
  enabled = true,
  debounceMs = 3000,
  saveDraft,
  onDraftId,
}: Options) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const baselineRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  const snapshot = useCallback((): ComposerSnapshot => {
    return {
      title: state.title,
      body: state.body,
      tags: state.tags,
      tools: state.tools,
      gallery_urls: state.gallery_urls,
      video_urls: state.video_urls,
      draftId,
      savedAt: Date.now(),
    };
  }, [state, draftId]);

  const serialize = useCallback((s: ComposerState) => JSON.stringify(s), []);

  const isDirty = enabled && serialize(state) !== baselineRef.current;

  const persistLocal = useCallback(() => {
    if (!userId) return;
    if (!composerHasContent(state)) {
      clearComposerLocal(userId);
      return;
    }
    saveComposerLocal(userId, snapshot());
  }, [userId, state, snapshot]);

  const flushSave = useCallback(async (): Promise<boolean> => {
    if (!userId || !enabled) return true;
    if (!composerHasContent(state)) return true;
    if (savingRef.current) return false;

    const parsed = communityPostDraftSchema.safeParse({
      title: state.title,
      body: state.body,
      tags: state.tags,
      tools: state.tools,
      galleryUrls: state.gallery_urls,
      videoUrls: state.video_urls,
    });
    if (!parsed.success) return false;

    savingRef.current = true;
    setStatus("saving");
    try {
      const { id } = await saveDraft.mutateAsync({
        author_id: userId,
        title: state.title,
        body: state.body,
        tags: state.tags,
        tools: state.tools,
        gallery_urls: state.gallery_urls,
        video_urls: state.video_urls,
        draft_id: draftId,
      });
      onDraftId(id);
      baselineRef.current = serialize(state);
      saveComposerLocal(userId, { ...snapshot(), draftId: id, savedAt: Date.now() });
      setStatus("saved");
      return true;
    } catch {
      setStatus("error");
      return false;
    } finally {
      savingRef.current = false;
    }
  }, [userId, enabled, state, draftId, saveDraft, onDraftId, serialize, snapshot]);

  const markBaseline = useCallback(() => {
    baselineRef.current = serialize(state);
    setStatus("idle");
  }, [state, serialize]);

  useEffect(() => {
    if (!userId || !enabled) return;
    persistLocal();
    if (!composerHasContent(state)) {
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
    loadLocal: () => (userId ? loadComposerLocal(userId) : null),
    clearLocal: () => {
      if (userId) clearComposerLocal(userId);
    },
  };
}
