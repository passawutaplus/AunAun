import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackProductEvent } from "@/lib/productEvents";

export type CollabTaskStatus = "todo" | "doing" | "done";
export type CollabTaskPriority = 0 | 1 | 2;

export const COLLAB_TASK_PRIORITIES: { value: CollabTaskPriority; label: string; dot: string; chip: string }[] = [
  { value: 0, label: "ปกติ", dot: "bg-emerald-500", chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  { value: 1, label: "ด่วน", dot: "bg-amber-400", chip: "bg-amber-400/20 text-amber-700 dark:text-amber-300" },
  { value: 2, label: "ด่วนมาก", dot: "bg-red-500", chip: "bg-red-500/15 text-red-700 dark:text-red-400" },
];

export type CollabTask = {
  id: string;
  conversation_id: string;
  title: string;
  status: CollabTaskStatus;
  assignee_id: string | null;
  due_date: string | null;
  /** 0 ปกติ · 1 ด่วน · 2 ด่วนมาก */
  priority: CollabTaskPriority;
  note: string;
  links: string[];
  position: number;
  created_by: string;
  created_at: string;
};

export const COLLAB_TASK_COLUMNS: { status: CollabTaskStatus; label: string }[] = [
  { status: "todo", label: "To do" },
  { status: "doing", label: "Doing" },
  { status: "done", label: "Done" },
];

/** Starter checklist for a new collaboration — everyone can edit or delete it. */
export const COLLAB_STARTER_TASKS = ["ตกลง Brief และขอบเขตงาน", "แชร์ไฟล์ / ภาพอ้างอิง", "ส่งงานร่างให้ดู", "ส่งงานจริง"];

// shared schema table (routed in tableRouting); not in generated types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tasksTable = (): any => (supabase as unknown as { from: (t: string) => unknown }).from("collab_tasks");

const key = (conversationId: string | undefined) => ["collab-tasks", conversationId];

export function useCollabTasks(conversationId: string | undefined) {
  return useQuery({
    queryKey: key(conversationId),
    enabled: !!conversationId,
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async (): Promise<CollabTask[]> => {
      const { data, error } = await tasksTable()
        .select("id, conversation_id, title, status, assignee_id, due_date, priority, note, links, position, created_by, created_at")
        .eq("conversation_id", conversationId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CollabTask[];
    },
  });
}

export function useCollabTaskActions(conversationId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: key(conversationId) });
  const onError = (e: unknown) => toast.error(e instanceof Error ? e.message : "บันทึกงานไม่สำเร็จ");

  const add = useMutation({
    mutationFn: async (titles: string[]) => {
      const rows = titles
        .map((t) => t.trim().slice(0, 200))
        .filter(Boolean)
        .map((title, i) => ({ conversation_id: conversationId, title, position: Date.now() / 1000 + i }));
      if (!rows.length) return;
      const { error } = await tasksTable().insert(rows as never);
      if (error) throw error;
      void trackProductEvent("task_create", { conversation_id: conversationId, count: rows.length }, { debounceMs: 0 });
    },
    onSuccess: invalidate,
    onError,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<CollabTask, "title" | "status" | "assignee_id" | "due_date" | "priority" | "position" | "note" | "links">> }) => {
      const { error } = await tasksTable().update(patch as never).eq("id", id);
      if (error) throw error;
    },
    // Moving a card should feel instant.
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: key(conversationId) });
      const prev = qc.getQueryData<CollabTask[]>(key(conversationId));
      qc.setQueryData<CollabTask[]>(key(conversationId), (cur = []) => cur.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key(conversationId), ctx.prev);
      onError(e);
    },
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tasksTable().delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError,
  });

  return { add, update, remove };
}
