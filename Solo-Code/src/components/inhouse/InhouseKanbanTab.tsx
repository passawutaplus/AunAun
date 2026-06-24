import * as React from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateInhouseTask,
  useDeleteInhouseTask,
  useInhouseTasks,
  useUpdateInhouseTask,
} from "@/hooks/inhouse/useInhouseTasks";
import { useInhouseOrgMembers } from "@/hooks/inhouse/useInhouseOrg";
import { tasksByColumn } from "@/hooks/inhouse/useInhouseMonitor";
import type { InhouseOrg, InhouseTask, InhouseWorkspace } from "@/lib/inhouse/types";
import { COLUMN_LABELS, DEFAULT_KANBAN_COLUMNS } from "@/lib/inhouse/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  org: InhouseOrg;
  workspace: InhouseWorkspace;
}

function TaskCard({ task, onDelete }: { task: InhouseTask; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("rounded-lg border bg-card p-3 shadow-sm", isDragging && "opacity-50")}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none text-muted-foreground"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {task.assignee && (
              <Avatar className="h-5 w-5">
                <AvatarImage src={task.assignee.avatar_url ?? undefined} />
                <AvatarFallback className="text-[9px]">
                  {(task.assignee.display_name ?? "?").slice(0, 1)}
                </AvatarFallback>
              </Avatar>
            )}
            {task.due_date && (
              <Badge variant="outline" className="text-[10px]">
                {task.due_date}
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] capitalize">
              {task.priority}
            </Badge>
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function KanbanColumn({
  columnKey,
  tasks,
  onDelete,
}: {
  columnKey: string;
  tasks: InhouseTask[];
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey });

  return (
    <div className="flex w-64 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-medium">{COLUMN_LABELS[columnKey] ?? columnKey}</h3>
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[200px] flex-1 flex-col gap-2 rounded-xl border border-dashed p-2 transition-colors",
          isOver && "border-primary/50 bg-primary/5",
        )}
      >
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onDelete={() => onDelete(task.id)} />
        ))}
      </div>
    </div>
  );
}

export function InhouseKanbanTab({ org, workspace }: Props) {
  const columns = workspace.settings?.columns ?? [...DEFAULT_KANBAN_COLUMNS];
  const { data: tasks = [], isLoading } = useInhouseTasks(workspace.id);
  const { data: members = [] } = useInhouseOrgMembers(org.id);
  const createTask = useCreateInhouseTask(org.id);
  const updateTask = useUpdateInhouseTask(org.id);
  const deleteTask = useDeleteInhouseTask(org.id);
  const [activeTask, setActiveTask] = React.useState<InhouseTask | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [assigneeId, setAssigneeId] = React.useState<string>("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const grouped = tasksByColumn(tasks, columns);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveTask(e.active.data.current?.task as InhouseTask);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveTask(null);
    const task = e.active.data.current?.task as InhouseTask | undefined;
    const overId = e.over?.id as string | undefined;
    if (!task || !overId || !columns.includes(overId) || task.column_key === overId) return;

    try {
      await updateTask.mutateAsync({
        id: task.id,
        workspaceId: workspace.id,
        patch: { column_key: overId },
        eventType: "task_moved",
      });
    } catch {
      toast.error("ย้าย task ไม่สำเร็จ");
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      await createTask.mutateAsync({
        workspaceId: workspace.id,
        title: title.trim(),
        assigneeId: assigneeId || null,
      });
      setTitle("");
      setAssigneeId("");
      setDialogOpen(false);
    } catch {
      toast.error("สร้าง task ไม่สำเร็จ");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Kanban</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Task ใหม่
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <KanbanColumn
              key={col}
              columnKey={col}
              tasks={grouped[col] ?? []}
              onDelete={async (id) => {
                try {
                  await deleteTask.mutateAsync({ id, workspaceId: workspace.id });
                } catch {
                  toast.error("ลบไม่สำเร็จ");
                }
              }}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <Card className="w-64 opacity-90 shadow-lg">
              <CardContent className="p-3 text-sm font-medium">{activeTask.title}</CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Task ใหม่</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>ชื่องาน</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ทำอะไร..."
              />
            </div>
            <div className="space-y-2">
              <Label>มอบหมายให้</Label>
              <Select
                value={assigneeId || "none"}
                onValueChange={(v) => setAssigneeId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสมาชิก" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่ระบุ</SelectItem>
                  {members
                    .filter((m) => m.status === "active")
                    .map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.profile?.display_name ?? m.profile?.email ?? m.user_id}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleCreate} disabled={createTask.isPending}>
              สร้าง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
