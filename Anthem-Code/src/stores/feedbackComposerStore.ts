import { create } from "zustand";
import type { FeedbackCommentPin, FeedbackKind } from "@/lib/feedbackTicket";

export type FeedbackComposerPhase = "idle" | "snip" | "compose";

export type FeedbackCapture = {
  id: string;
  dataUrl: string;
  comments: FeedbackCommentPin[];
};

export type FeedbackDraft = {
  title: string;
  rating: number | null;
  kind: FeedbackKind | null;
  message: string;
};

const emptyDraft = (): FeedbackDraft => ({
  title: "",
  rating: null,
  kind: null,
  message: "",
});

const newCaptureId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `cap-${Date.now()}-${Math.random().toString(16).slice(2)}`;

type FeedbackComposerState = {
  phase: FeedbackComposerPhase;
  captures: FeedbackCapture[];
  annotatingId: string | null;
  capturing: boolean;
  draft: FeedbackDraft;
  openForm: () => void;
  startSnip: () => void;
  cancelSnip: () => void;
  beginCompose: (imageDataUrl: string | null) => void;
  setCapturing: (capturing: boolean) => void;
  patchDraft: (partial: Partial<FeedbackDraft>) => void;
  openAnnotator: (id: string) => void;
  closeAnnotator: () => void;
  updateCapture: (id: string, dataUrl: string, comments: FeedbackCommentPin[]) => void;
  removeCapture: (id: string) => void;
  close: () => void;
};

export const useFeedbackComposer = create<FeedbackComposerState>((set) => ({
  phase: "idle",
  captures: [],
  annotatingId: null,
  capturing: false,
  draft: emptyDraft(),
  openForm: () =>
    set({
      phase: "compose",
      captures: [],
      annotatingId: null,
      capturing: false,
      draft: emptyDraft(),
    }),
  startSnip: () => set({ phase: "snip", capturing: false, annotatingId: null }),
  cancelSnip: () => set({ phase: "compose", capturing: false }),
  beginCompose: (imageDataUrl) =>
    set((s) => ({
      phase: "compose",
      capturing: false,
      annotatingId: null,
      captures: imageDataUrl
        ? [...s.captures, { id: newCaptureId(), dataUrl: imageDataUrl, comments: [] }]
        : s.captures,
    })),
  setCapturing: (capturing) => set({ capturing }),
  patchDraft: (partial) => set((s) => ({ draft: { ...s.draft, ...partial } })),
  openAnnotator: (id) => set({ annotatingId: id }),
  closeAnnotator: () => set({ annotatingId: null }),
  updateCapture: (id, dataUrl, comments) =>
    set((s) => ({
      captures: s.captures.map((c) => (c.id === id ? { ...c, dataUrl, comments } : c)),
    })),
  removeCapture: (id) =>
    set((s) => ({
      captures: s.captures.filter((c) => c.id !== id),
      annotatingId: s.annotatingId === id ? null : s.annotatingId,
    })),
  close: () =>
    set({
      phase: "idle",
      captures: [],
      annotatingId: null,
      capturing: false,
      draft: emptyDraft(),
    }),
}));
