import { useCallback, useRef, useState } from "react";
import type { FlexGridLayout } from "@/lib/flexGridLayout";

const MAX_HISTORY = 50;

function cloneLayout(layout: FlexGridLayout): FlexGridLayout {
  return structuredClone(layout);
}

/**
 * Undo/redo stack for Flex Grid canvas edits.
 * Call `beginGesture()` once at the start of a drag/resize so intermediate
 * moves are not recorded as separate steps.
 */
export function useFlexGridHistory(
  layout: FlexGridLayout,
  setLayout: (next: FlexGridLayout | ((prev: FlexGridLayout) => FlexGridLayout)) => void,
) {
  const pastRef = useRef<FlexGridLayout[]>([]);
  const futureRef = useRef<FlexGridLayout[]>([]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const gestureOpenRef = useRef(false);
  const [version, setVersion] = useState(0);

  const bump = () => setVersion((v) => v + 1);

  const beginGesture = useCallback(() => {
    if (gestureOpenRef.current) return;
    pastRef.current.push(cloneLayout(layoutRef.current));
    if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
    futureRef.current = [];
    gestureOpenRef.current = true;
    bump();
  }, []);

  const endGesture = useCallback(() => {
    gestureOpenRef.current = false;
  }, []);

  const commit = useCallback(
    (next: FlexGridLayout | ((prev: FlexGridLayout) => FlexGridLayout)) => {
      const prev = layoutRef.current;
      const resolved = typeof next === "function" ? next(prev) : next;
      if (resolved === prev) return;
      if (!gestureOpenRef.current) {
        pastRef.current.push(cloneLayout(prev));
        if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
        futureRef.current = [];
      }
      setLayout(resolved);
      bump();
    },
    [setLayout],
  );

  /** Live updates during an open gesture (no extra history entries). */
  const patch = useCallback(
    (next: FlexGridLayout | ((prev: FlexGridLayout) => FlexGridLayout)) => {
      setLayout(next);
    },
    [setLayout],
  );

  const undo = useCallback(() => {
    gestureOpenRef.current = false;
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(cloneLayout(layoutRef.current));
    setLayout(prev);
    bump();
  }, [setLayout]);

  const redo = useCallback(() => {
    gestureOpenRef.current = false;
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(cloneLayout(layoutRef.current));
    setLayout(next);
    bump();
  }, [setLayout]);

  const resetHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    gestureOpenRef.current = false;
    bump();
  }, []);

  void version;

  return {
    commit,
    patch,
    beginGesture,
    endGesture,
    undo,
    redo,
    resetHistory,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
