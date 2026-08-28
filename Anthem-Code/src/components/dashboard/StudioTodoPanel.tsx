import { useState } from "react";
import { Link } from "react-router-dom";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Briefcase, GripVertical, Handshake, ListTodo, MessageSquareQuote, Plus, Trash2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InboxPrioritySelect } from "@/components/inbox/InboxPrioritySelect";
import { useStudioTodos } from "@/hooks/useStudioHomeLocal";
import type { StudioTodo } from "@/lib/studioHomeStorage";
import { cn } from "@/lib/utils";

export type StudioQueueKind = "hire" | "collab" | "review";

export type StudioQueueItem = {
  to: string;
  label: string;
  count: number;
  kind: StudioQueueKind;
};

type Filter = "all" | "pending" | "done";

type Props = {
  userId: string;
  queue: StudioQueueItem[];
};

const GROUP_ICON: Record<Exclude<StudioQueueKind, "review">, LucideIcon> = {
  hire: Briefcase,
  collab: Handshake,
};

function QueueRow({ item, icon: Icon }: { item: StudioQueueItem; icon: LucideIcon }) {
  return (
    <Link
      to={item.to}
      className="flex min-h-[2.75rem] min-w-0 items-center justify-between gap-2 rounded-lg px-2.5 py-2 hover:bg-background/70"
    >
      <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium leading-snug text-foreground sm:text-sm">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0">{item.label}</span>
      </span>
      <span
        className={cn(
          "shrink-0 text-sm tabular-nums sm:text-base",
          item.count > 0 ? "text-primary" : "text-muted-foreground",
        )}
      >
        {item.count}
      </span>
    </Link>
  );
}

function QueueGroup({ kind, items }: { kind: "hire" | "collab"; items: StudioQueueItem[] }) {
  if (items.length === 0) return null;
  const Icon = GROUP_ICON[kind];
  return (
    <div className="rounded-xl bg-secondary/35 p-1">
      <ul>
        {items.map((item) => (
          <li key={`${item.to}-${item.label}`}>
            <QueueRow item={item} icon={Icon} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SortableTodoRow({
  item,
  onToggle,
  onPriority,
  onRemove,
}: {
  item: StudioTodo;
  onToggle: (done: boolean) => void;
  onPriority: (priority: StudioTodo["priority"]) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex flex-wrap items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-secondary/40 sm:flex-nowrap",
        isDragging && "z-10 bg-secondary/70 shadow-sm ring-1 ring-primary/30",
      )}
    >
      <button
        type="button"
        className="inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-secondary/70 hover:text-foreground active:cursor-grabbing"
        aria-label={`ลากเพื่อย้าย ${item.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Checkbox
        checked={item.done}
        onCheckedChange={(value) => onToggle(value === true)}
        aria-label={item.done ? `ยกเลิกเสร็จ ${item.title}` : `ทำเสร็จ ${item.title}`}
      />
      <span
        className={cn(
          "min-w-0 flex-1 text-sm",
          item.done ? "text-muted-foreground line-through" : "text-foreground",
        )}
      >
        {item.title}
      </span>
      <div className="shrink-0" onPointerDown={(e) => e.stopPropagation()}>
        <InboxPrioritySelect value={item.priority} onChange={onPriority} />
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        aria-label={`ลบ ${item.title}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function StudioTodoPanel({ userId, queue }: Props) {
  const { list, add, update, remove, reorder } = useStudioTodos(userId);
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const pending = list.filter((item) => !item.done);
  const done = list.filter((item) => item.done);
  const visible = filter === "pending" ? pending : filter === "done" ? done : list;
  const hireQueue = queue.filter((item) => item.kind === "hire");
  const collabQueue = queue.filter((item) => item.kind === "collab");
  const extraQueue = queue.filter((item) => item.kind === "review");
  const hasWorkQueue = hireQueue.length > 0 || collabQueue.length > 0 || extraQueue.length > 0;

  const submit = () => {
    add(title);
    setTitle("");
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorder(String(active.id), String(over.id));
  };

  return (
    <section className="flex h-full flex-col space-y-3 rounded-2xl glass-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
          <ListTodo className="h-4 w-4 text-muted-foreground" aria-hidden />
          To Do List
        </h2>
        {list.length > 0 ? (
          <p className="text-xs tabular-nums text-muted-foreground">
            {done.length}/{list.length} เสร็จ
          </p>
        ) : null}
      </div>

      {hasWorkQueue ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <QueueGroup kind="hire" items={hireQueue} />
            <QueueGroup kind="collab" items={collabQueue} />
          </div>
          {extraQueue.length > 0 ? (
            <div className="rounded-xl bg-secondary/35 p-1">
              <ul>
                {extraQueue.map((item) => (
                  <li key={`${item.to}-${item.label}`}>
                    <QueueRow item={item} icon={MessageSquareQuote} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {hasWorkQueue ? <div className="border-t border-border/70" role="separator" /> : null}

      <div className="flex gap-2">
        <label className="sr-only" htmlFor="studio-home-todo">
          เพิ่มรายการวันนี้
        </label>
        <Input
          id="studio-home-todo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="เพิ่มรายการ…"
          className="h-9 rounded-full bg-background/70"
        />
        <Button
          type="button"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full border-primary bg-transparent text-primary hover:bg-transparent hover:border-primary"
          variant="outline"
          onClick={submit}
          aria-label="เพิ่มรายการ"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {(
          [
            { id: "all", label: "ทั้งหมด" },
            { id: "pending", label: "ค้างอยู่" },
            { id: "done", label: "เสร็จแล้ว" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={cn(
              "rounded-full py-1.5 text-xs font-medium transition-colors",
              filter === tab.id
                ? "border border-primary/30 bg-primary/10 text-primary"
                : "border border-transparent bg-secondary/40 text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[8rem] flex-1 space-y-1">
        {visible.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">
            {filter === "done"
              ? "ยังไม่มีรายการที่เสร็จ"
              : filter === "pending"
                ? "ไม่มีงานค้างวันนี้"
                : "พิมพ์รายการแล้วกดเพิ่มได้เลย"}
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={visible.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              {visible.map((item) => (
                <SortableTodoRow
                  key={item.id}
                  item={item}
                  onToggle={(done) => update(item.id, { done })}
                  onPriority={(priority) => update(item.id, { priority })}
                  onRemove={() => remove(item.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </section>
  );
}
