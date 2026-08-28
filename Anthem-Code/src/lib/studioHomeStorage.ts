import { parseInboxPriority, type InboxPriority } from "@/lib/inboxPriority";

export type StudioTodo = {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  priority: InboxPriority;
};

export function studioNoteStorageKey(userId: string): string {
  return `aplus1.studio.note.v1.${userId}`;
}

export function studioTodoStorageKey(userId: string): string {
  return `aplus1.studio.todos.v1.${userId}`;
}

export function readStudioNote(userId: string): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(studioNoteStorageKey(userId)) ?? "";
}

export function writeStudioNote(userId: string, content: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(studioNoteStorageKey(userId), content);
}

export function parseStudioTodos(raw: string | null): StudioTodo[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      if (typeof row.id !== "string" || typeof row.title !== "string") return [];
      return [
        {
          id: row.id,
          title: row.title,
          done: row.done === true,
          createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date(0).toISOString(),
          priority: parseInboxPriority(typeof row.priority === "string" ? row.priority : null),
        },
      ];
    });
  } catch {
    return [];
  }
}

export function readStudioTodos(userId: string): StudioTodo[] {
  if (typeof localStorage === "undefined") return [];
  return parseStudioTodos(localStorage.getItem(studioTodoStorageKey(userId)));
}

export function writeStudioTodos(userId: string, todos: StudioTodo[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(studioTodoStorageKey(userId), JSON.stringify(todos));
}

export function reorderStudioTodos(list: StudioTodo[], activeId: string, overId: string): StudioTodo[] {
  if (activeId === overId) return list;
  const oldIndex = list.findIndex((item) => item.id === activeId);
  const newIndex = list.findIndex((item) => item.id === overId);
  if (oldIndex < 0 || newIndex < 0) return list;
  const next = list.slice();
  const [moved] = next.splice(oldIndex, 1);
  if (!moved) return list;
  next.splice(newIndex, 0, moved);
  return next;
}

export function createStudioTodo(title: string, now = new Date()): StudioTodo {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `todo-${now.getTime()}`;
  return {
    id,
    title: title.trim(),
    done: false,
    createdAt: now.toISOString(),
    priority: "ปกติ",
  };
}
