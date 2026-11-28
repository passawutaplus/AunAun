import { useCallback, useRef, useState } from "react";
import type { Draft } from "./model";

const STEPS = 50;
/** Typing in the same field within this time counts as one step (mock). */
const TYPING_MS = 1200;

type State = { draft: Draft; past: Draft[]; future: Draft[] };

/** The work on screen with undo/redo (mock snap/save/undo/redo). */
export function useDraftHistory(initial: () => Draft) {
  const [s, setS] = useState<State>(() => ({ draft: initial(), past: [], future: [] }));
  const last = useRef<{ key: string | null; t: number }>({ key: null, t: 0 });

  /** `typing`: a field key; changes to the same field in a row are merged into one step. */
  const update = useCallback((fn: (d: Draft) => Draft, typing?: string) => {
    const now = Date.now();
    const merge = !!typing && last.current.key === typing && now - last.current.t < TYPING_MS;
    last.current = { key: typing ?? null, t: now };
    setS((cur) => {
      const next = fn(cur.draft);
      if (next === cur.draft) return cur;
      return { draft: next, past: merge ? cur.past : [...cur.past, cur.draft].slice(-STEPS), future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    last.current = { key: null, t: 0 };
    setS((cur) => (cur.past.length ? { draft: cur.past[cur.past.length - 1], past: cur.past.slice(0, -1), future: [...cur.future, cur.draft] } : cur));
  }, []);

  const redo = useCallback(() => {
    last.current = { key: null, t: 0 };
    setS((cur) => (cur.future.length ? { draft: cur.future[cur.future.length - 1], past: [...cur.past, cur.draft], future: cur.future.slice(0, -1) } : cur));
  }, []);

  /** A new starting point without history (a loaded work, "ลงงานต่อ"). */
  const reset = useCallback((d: Draft) => {
    last.current = { key: null, t: 0 };
    setS({ draft: d, past: [], future: [] });
  }, []);

  return { draft: s.draft, update, undo, redo, reset, canUndo: s.past.length > 0, canRedo: s.future.length > 0 };
}
