import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, Flag, Link2, ListChecks, Loader2, Plus, Sparkles, StickyNote, Trash2, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import UserAvatar from "@/components/UserAvatar";
import {
  COLLAB_STARTER_TASKS,
  COLLAB_TASK_COLUMNS,
  COLLAB_TASK_PRIORITIES,
  useCollabTaskActions,
  useCollabTasks,
  type CollabTask,
  type CollabTaskPriority,
  type CollabTaskStatus,
} from "@/hooks/useCollabTasks";
import { useAuth } from "@/hooks/useAuth";
import { useSendMessage } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  /** 1:1 chat people (client / freelancer); group members are loaded from conversation_members. */
  participantIds?: (string | null | undefined)[];
  /** When the work is done: publish it as a shared project (collaborators tagged for you). */
  publishPath?: string | null;
};

type Member = { id: string; name: string; username: string | null; avatarUrl: string | null };

const NO_ASSIGNEE = "__none__";

/** "YYYY-MM-DD" ↔ local Date without timezone drift. */
const parseDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const toDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shortDay = (s: string) =>
  new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" }).format(parseDay(s));

function dueTone(due: string | null, status: CollabTaskStatus) {
  if (!due || status === "done") return "text-muted-foreground";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((parseDay(due).getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "text-destructive";
  if (days <= 1) return "text-warning";
  return "text-muted-foreground";
}

function useTaskMembers(conversationId: string, participantIds: (string | null | undefined)[], enabled: boolean) {
  const { user } = useAuth();
  const direct = participantIds.filter((x): x is string => !!x);
  return useQuery({
    queryKey: ["collab-task-members", conversationId, direct.join(",")],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<Member[]> => {
      const { data: rows } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conversationId);
      const ids = Array.from(new Set([...direct, ...(rows ?? []).map((r) => r.user_id as string)])).filter(Boolean);
      if (!ids.length) return [];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", ids);
      const byId = new Map((profiles ?? []).map((p) => [p.user_id as string, p]));
      return ids.map((id) => {
        const p = byId.get(id);
        const name = p?.display_name || p?.username || "ผู้ใช้";
        return {
          id,
          name: id === user?.id ? `${name} (คุณ)` : name,
          username: p?.username ?? null,
          avatarUrl: p?.avatar_url ?? null,
        };
      });
    },
  });
}

/** Collaboration workspace board: To do / Doing / Done for the people in this chat. */
export default function CollabTasksSheet({ open, onOpenChange, conversationId, participantIds = [], publishPath }: Props) {
  const { user } = useAuth();
  const { data: rawTasks = [], isLoading } = useCollabTasks(open ? conversationId : undefined);
  const tasks = useMemo(() => [...rawTasks].sort((a, b) => a.position - b.position), [rawTasks]);
  const sendMessage = useSendMessage();
  const [mineOnly, setMineOnly] = useState(false);
  const { data: members = [] } = useTaskMembers(conversationId, participantIds, open);
  const { add, update, remove } = useCollabTaskActions(conversationId);
  const [draft, setDraft] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const activeTask = tasks.find((t) => t.id === activeId) ?? null;
  const editingTask = tasks.find((t) => t.id === editingId) ?? null;

  // Small move threshold so a tap still opens the editor; touch waits a beat so the sheet can scroll.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    add.mutate([draft], { onSuccess: () => setDraft("") });
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  // Drop on a card = take its place in that column; drop on a column = go to the bottom.
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const task = tasks.find((t) => t.id === e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!task || !overId || overId === task.id) return;
    const overTask = tasks.find((t) => t.id === overId);
    const status = (overTask?.status ?? overId) as CollabTaskStatus;
    if (!COLLAB_TASK_COLUMNS.some((c) => c.status === status)) return;

    const column = tasks.filter((t) => t.status === status);
    let next: CollabTask[];
    if (task.status === status) {
      const from = column.findIndex((t) => t.id === task.id);
      const to = overTask ? column.findIndex((t) => t.id === overTask.id) : column.length - 1;
      if (from === to) return;
      next = arrayMove(column, from, to);
    } else {
      const at = overTask ? column.findIndex((t) => t.id === overTask.id) : column.length;
      next = [...column.slice(0, at), task, ...column.slice(at)];
    }
    const i = next.findIndex((t) => t.id === task.id);
    const prev = next[i - 1]?.position;
    const after = next[i + 1]?.position;
    const position =
      prev !== undefined && after !== undefined
        ? (prev + after) / 2
        : prev !== undefined
          ? prev + 1
          : after !== undefined
            ? after - 1
            : task.position;
    update.mutate({ id: task.id, patch: { status, position } });
  };

  const plainName = (id: string | null | undefined) => memberById.get(id ?? "")?.name.replace(/ \(คุณ\)$/, "");

  // Assigning someone posts a system line in the chat so they actually notice.
  const saveTask = (
    task: CollabTask,
    patch: Partial<Pick<CollabTask, "title" | "status" | "assignee_id" | "due_date" | "priority" | "note" | "links">>,
  ) => {
    update.mutate({ id: task.id, patch });
    const to = patch.assignee_id;
    if (!to || to === task.assignee_id) return;
    const me = plainName(user?.id) ?? "มีคน";
    const title = patch.title ?? task.title;
    sendMessage.mutate({
      conversationId,
      content: to === user?.id ? `${me} รับงาน “${title}”` : `${me} มอบงาน “${title}” ให้ ${plainName(to) ?? "ผู้ร่วมงาน"}`,
      messageType: "system",
    });
  };

  const visible = mineOnly ? tasks.filter((t) => t.assignee_id === user?.id) : tasks;
  const myOpenCount = tasks.filter((t) => t.assignee_id === user?.id && t.status !== "done").length;

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const allDone = total > 0 && done === total;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" aria-hidden />
            Tasks
            {total > 0 ? (
              <span className="text-sm font-normal text-muted-foreground tabular-nums">
                {done}/{total} เสร็จแล้ว
              </span>
            ) : null}
          </SheetTitle>
          <SheetDescription>ลากการ์ดเพื่อย้ายสถานะ · กดที่การ์ดเพื่อแก้ไข ใส่คนรับผิดชอบ และกำหนดส่ง</SheetDescription>
          {total > 0 ? (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(done / total) * 100}%` }} />
            </div>
          ) : null}
        </SheetHeader>

        {total > 0 ? (
          <div className="flex items-center gap-1.5" role="group" aria-label="แสดงงาน">
            {[
              { mine: false, label: "ทั้งหมด" },
              { mine: true, label: "งานของฉัน" },
            ].map((f) => (
              <button
                key={f.label}
                type="button"
                aria-pressed={mineOnly === f.mine}
                onClick={() => setMineOnly(f.mine)}
                className={cn(
                  "h-7 rounded-full px-3 text-xs font-medium transition-colors",
                  mineOnly === f.mine ? "bg-foreground text-background" : "bg-muted/70 text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
                {f.mine && myOpenCount > 0 ? <span className="ml-1 tabular-nums opacity-70">{myOpenCount}</span> : null}
              </button>
            ))}
          </div>
        ) : null}

        <form onSubmit={submit} className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 200))}
            placeholder="เพิ่มงาน เช่น ร่างโลโก้ 3 แบบ"
            aria-label="ชื่องานใหม่"
            className="h-10 rounded-full"
          />
          <Button type="submit" className="h-10 shrink-0 rounded-full gap-1" disabled={!draft.trim() || add.isPending}>
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
            เพิ่ม
          </Button>
        </form>

        {isLoading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-muted/40" />
        ) : total === 0 ? (
          <div className="space-y-3 rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">ยังไม่มีงาน — เริ่มจากรายการพื้นฐานก็ได้</p>
            <Button
              type="button"
              variant="outline"
              className="rounded-full gap-1.5"
              disabled={add.isPending}
              onClick={() => add.mutate(COLLAB_STARTER_TASKS)}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              ใช้รายการเริ่มต้น
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
            <div className="grid gap-3 md:grid-cols-3">
              {COLLAB_TASK_COLUMNS.map((col) => (
                <TaskColumn
                  key={col.status}
                  status={col.status}
                  label={col.label}
                  dragging={!!activeId}
                  tasks={visible.filter((t) => t.status === col.status)}
                  memberById={memberById}
                  onOpen={setEditingId}
                />
              ))}
            </div>
            <DragOverlay dropAnimation={null}>
              {activeTask ? <TaskCardFace task={activeTask} member={memberById.get(activeTask.assignee_id ?? "")} lifted /> : null}
            </DragOverlay>
          </DndContext>
        )}

        {allDone && publishPath ? (
          <div className="flex flex-col items-start gap-2 rounded-2xl border border-primary/40 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">งานเสร็จครบแล้ว ลงเป็นผลงานร่วมกัน — ทุกคนจะได้เครดิตบนโปรไฟล์</p>
            <Button asChild className="shrink-0 rounded-full">
              <Link to={publishPath}>ลงผลงานร่วมกัน</Link>
            </Button>
          </div>
        ) : null}

        <TaskEditDialog
          key={editingTask?.id ?? "none"}
          task={editingTask}
          members={members}
          onClose={() => setEditingId(null)}
          onSave={(patch) => {
            if (editingTask) saveTask(editingTask, patch);
            setEditingId(null);
          }}
          onDelete={() => {
            if (editingTask) remove.mutate(editingTask.id);
            setEditingId(null);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

function TaskColumn({
  status,
  label,
  tasks,
  dragging,
  memberById,
  onOpen,
}: {
  status: CollabTaskStatus;
  label: string;
  tasks: CollabTask[];
  dragging: boolean;
  memberById: Map<string, Member>;
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={cn(
        "min-h-32 space-y-2 rounded-2xl border border-transparent bg-muted/30 p-3 transition-colors",
        dragging && "border-dashed border-border",
        isOver && "border-primary/60 bg-primary/5",
      )}
    >
      <h3 className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        <span className="tabular-nums">{tasks.length}</span>
      </h3>
      {tasks.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground/70">{dragging ? "วางที่นี่" : "ว่าง"}</p>
      ) : (
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {tasks.map((t) => (
              <DraggableTask key={t.id} task={t} member={memberById.get(t.assignee_id ?? "")} onOpen={() => onOpen(t.id)} />
            ))}
          </ul>
        </SortableContext>
      )}
    </section>
  );
}

function DraggableTask({ task, member, onOpen }: { task: CollabTask; member?: Member; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === "Enter") onOpen();
      }}
      aria-label={`${task.title} — กดเพื่อแก้ไข, กด Space เพื่อลากย้าย`}
      className={cn("touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl", isDragging && "opacity-30")}
    >
      <TaskCardFace task={task} member={member} />
    </li>
  );
}

function TaskCardFace({ task, member, lifted }: { task: CollabTask; member?: Member; lifted?: boolean }) {
  const isDone = task.status === "done";
  const prio = COLLAB_TASK_PRIORITIES[task.priority ?? 0] ?? COLLAB_TASK_PRIORITIES[0];
  return (
    <div
      className={cn(
        "cursor-grab space-y-2 rounded-xl border border-border/60 bg-background p-3 text-sm shadow-sm transition-colors hover:border-border active:cursor-grabbing",
        isDone && "bg-muted/30",
        lifted && "rotate-1 cursor-grabbing shadow-sm ring-1 ring-primary/40",
      )}
    >
      <p className={cn("break-words font-medium leading-snug", isDone && "text-muted-foreground line-through decoration-muted-foreground/50")}>
        {task.title}
      </p>
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        {(task.links?.length ?? 0) > 0 || task.note?.trim() ? (
          <span className="order-last ml-auto flex shrink-0 items-center gap-1.5">
            {task.links?.length ? (
              <span className="flex items-center gap-0.5" title={`ลิงก์ ${task.links.length}`} aria-label={`มีลิงก์ ${task.links.length}`}>
                <Link2 className="h-3.5 w-3.5" aria-hidden />
                {task.links.length > 1 ? <span className="tabular-nums">{task.links.length}</span> : null}
              </span>
            ) : null}
            {task.note?.trim() ? <StickyNote className="h-3.5 w-3.5" aria-label="มีโน้ต" /> : null}
          </span>
        ) : null}
        {member ? (
          <>
            <UserAvatar src={member.avatarUrl} name={member.name} username={member.username} className="h-5 w-5" fallbackClassName="text-[9px]" />
            <span className="truncate">{member.name}</span>
          </>
        ) : (
          <>
            <UserRound className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">ยังไม่มีคนรับ</span>
          </>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
            isDone ? "bg-muted text-muted-foreground" : prio.chip,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", isDone ? "bg-muted-foreground/50" : prio.dot)} aria-hidden />
          {prio.label}
        </span>
        {task.due_date ? (
          <span className={cn("flex shrink-0 items-center gap-1 tabular-nums", dueTone(task.due_date, task.status))}>
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            {shortDay(task.due_date)}
          </span>
        ) : (
          <span className="text-muted-foreground">ไม่มีกำหนด</span>
        )}
      </div>
    </div>
  );
}

function TaskEditDialog({
  task,
  members,
  onClose,
  onSave,
  onDelete,
}: {
  task: CollabTask | null;
  members: Member[];
  onClose: () => void;
  onSave: (patch: Partial<Pick<CollabTask, "title" | "status" | "assignee_id" | "due_date" | "priority" | "note" | "links">>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [status, setStatus] = useState<CollabTaskStatus>(task?.status ?? "todo");
  const [assignee, setAssignee] = useState<string>(task?.assignee_id ?? NO_ASSIGNEE);
  const [due, setDue] = useState<string | null>(task?.due_date ?? null);
  const [priority, setPriority] = useState<CollabTaskPriority>(task?.priority ?? 0);
  const [note, setNote] = useState(task?.note ?? "");
  const [links, setLinks] = useState<string[]>(task?.links ?? []);
  const [linkDraft, setLinkDraft] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const addLink = () => {
    const raw = linkDraft.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      new URL(url);
    } catch {
      setLinkError("ลิงก์ไม่ถูกต้อง");
      return;
    }
    if (links.length >= 10) {
      setLinkError("ใส่ได้สูงสุด 10 ลิงก์");
      return;
    }
    setLinks((l) => (l.includes(url) ? l : [...l, url.slice(0, 500)]));
    setLinkDraft("");
  };
  const [dateOpen, setDateOpen] = useState(false);

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim().slice(0, 200),
      status,
      assignee_id: assignee === NO_ASSIGNEE ? null : assignee,
      due_date: due,
      priority,
      note: note.trim().slice(0, 2000),
      links,
    });
  };

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 200))}
            aria-label="ชื่องาน"
            className="h-10 rounded-xl"
            autoFocus
          />

          <div className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1" role="radiogroup" aria-label="สถานะ">
            {COLLAB_TASK_COLUMNS.map((c) => (
              <button
                key={c.status}
                type="button"
                role="radio"
                aria-checked={status === c.status}
                onClick={() => setStatus(c.status)}
                className={cn(
                  "rounded-full py-1.5 text-xs font-medium transition-colors",
                  status === c.status ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Flag className="h-3.5 w-3.5" aria-hidden /> ความสำคัญ
            </span>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="ความสำคัญ">
              {COLLAB_TASK_PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  role="radio"
                  aria-checked={priority === p.value}
                  onClick={() => setPriority(p.value)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-full border py-1.5 text-xs font-medium transition-colors",
                    priority === p.value
                      ? "border-foreground/40 bg-muted text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", p.dot)} aria-hidden />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserRound className="h-3.5 w-3.5" aria-hidden /> คนรับผิดชอบ
              </span>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ASSIGNEE}>ยังไม่ระบุ</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden /> กำหนดส่ง
              </span>
              <div className="flex gap-1">
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="h-10 flex-1 justify-start rounded-xl font-normal">
                      {due ? shortDay(due) : <span className="text-muted-foreground">ไม่กำหนด</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={due ? parseDay(due) : undefined}
                      onSelect={(d) => {
                        setDue(d ? toDay(d) : null);
                        setDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {due ? (
                  <Button type="button" size="icon" variant="ghost" className="h-10 w-10" onClick={() => setDue(null)} aria-label="ล้างกำหนดส่ง">
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                ) : null}
              </div>
              {due ? <p className="text-[11px] text-muted-foreground">จะแจ้งเตือนในแชทก่อนครบกำหนด 1 วัน</p> : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" aria-hidden /> ลิงก์
            </span>
            {links.map((l) => (
              <div key={l} className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5 text-sm">
                <a href={l} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-primary hover:underline">
                  {l.replace(/^https?:\/\//, "")}
                </a>
                <button type="button" onClick={() => setLinks((x) => x.filter((y) => y !== l))} aria-label={`ลบลิงก์ ${l}`} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={linkDraft}
                onChange={(e) => {
                  setLinkDraft(e.target.value);
                  setLinkError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLink();
                  }
                }}
                placeholder="วางลิงก์ แล้วกด Enter"
                aria-label="เพิ่มลิงก์"
                aria-invalid={!!linkError}
                className="h-9 rounded-xl"
              />
              <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-xl" onClick={addLink} aria-label="เพิ่มลิงก์">
                <Plus className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            {linkError ? <p className="text-xs text-destructive">{linkError}</p> : null}
          </div>

          <div className="space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <StickyNote className="h-3.5 w-3.5" aria-hidden /> โน้ต
            </span>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 2000))}
              rows={3}
              placeholder="รายละเอียดเพิ่มเติม ขนาดไฟล์ ข้อควรระวัง …"
              aria-label="โน้ต"
              className="resize-y rounded-xl"
            />
          </div>

          <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
            <Button type="button" variant="ghost" className="gap-1.5 text-muted-foreground hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" aria-hidden /> ลบงาน
            </Button>
            <Button type="submit" className="rounded-full" disabled={!title.trim()}>
              บันทึก
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
