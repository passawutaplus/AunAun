import { useCallback, useEffect, useRef, useState } from "react";
import {
  createStudioTodo,
  readStudioNote,
  readStudioTodos,
  reorderStudioTodos,
  writeStudioNote,
  writeStudioTodos,
  type StudioTodo,
} from "@/lib/studioHomeStorage";

export function useStudioNote(userId: string) {
  const [draft, setDraft] = useState(() => readStudioNote(userId));
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const lastSaved = useRef(draft);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const next = readStudioNote(userId);
    setDraft(next);
    lastSaved.current = next;
    setStatus("idle");
  }, [userId]);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const onChange = useCallback(
    (value: string) => {
      setDraft(value);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (value === lastSaved.current) return;
        setStatus("saving");
        writeStudioNote(userId, value);
        lastSaved.current = value;
        setStatus("saved");
        window.setTimeout(() => setStatus("idle"), 1400);
      }, 500);
    },
    [userId],
  );

  return { draft, status, onChange };
}

export function useStudioTodos(userId: string) {
  const [list, setList] = useState<StudioTodo[]>(() => readStudioTodos(userId));

  useEffect(() => {
    setList(readStudioTodos(userId));
  }, [userId]);

  const persist = useCallback(
    (next: StudioTodo[]) => {
      setList(next);
      writeStudioTodos(userId, next);
    },
    [userId],
  );

  const add = useCallback(
    (title: string) => {
      const todo = createStudioTodo(title);
      if (!todo.title) return;
      persist([todo, ...list]);
    },
    [list, persist],
  );

  const update = useCallback(
    (id: string, patch: Partial<Pick<StudioTodo, "title" | "done" | "priority">>) => {
      persist(list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
    [list, persist],
  );

  const reorder = useCallback(
    (activeId: string, overId: string) => {
      persist(reorderStudioTodos(list, activeId, overId));
    },
    [list, persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(list.filter((item) => item.id !== id));
    },
    [list, persist],
  );

  return { list, add, update, remove, reorder };
}
