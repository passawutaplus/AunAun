import * as React from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useCreateInhouseTask,
  useInhouseTasks,
  useUpdateInhouseTask,
} from "@/hooks/inhouse/useInhouseTasks";
import type { InhouseOrg, InhouseTask, InhouseWorkspace } from "@/lib/inhouse/types";
import { toast } from "sonner";

interface Props {
  org: InhouseOrg;
  workspace: InhouseWorkspace;
}

export function InhouseTodosTab({ org, workspace }: Props) {
  const { data: tasks = [], isLoading } = useInhouseTasks(workspace.id);
  const createTask = useCreateInhouseTask(org.id);
  const updateTask = useUpdateInhouseTask(org.id);
  const [newTitle, setNewTitle] = React.useState("");

  const openTasks = tasks.filter((t) => t.column_key !== "done");
  const grouped = groupByAssignee(openTasks);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      await createTask.mutateAsync({
        workspaceId: workspace.id,
        title: newTitle.trim(),
        columnKey: "todo",
      });
      setNewTitle("");
    } catch {
      toast.error("เพิ่มไม่สำเร็จ");
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await updateTask.mutateAsync({
        id,
        workspaceId: workspace.id,
        patch: { column_key: "done" },
        eventType: "task_completed",
      });
    } catch {
      toast.error("อัปเดตไม่สำเร็จ");
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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">To Do List</h2>
        <p className="text-sm text-muted-foreground">{openTasks.length} รายการที่ยังไม่เสร็จ</p>
      </div>

      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="เพิ่มงานด่วน..."
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={createTask.isPending}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {Object.entries(grouped).map(([label, items]) => (
        <div key={label} className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
          <div className="space-y-1">
            {items.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
              >
                <Checkbox checked={false} onCheckedChange={() => handleComplete(task.id)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{task.title}</p>
                  {task.due_date && (
                    <p className="text-xs text-muted-foreground">ครบ {task.due_date}</p>
                  )}
                </div>
                {task.assignee && (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.assignee.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[9px]">
                      {(task.assignee.display_name ?? "?").slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleComplete(task.id)}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {openTasks.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          ไม่มีงานค้าง — เพิ่มรายการด้านบน
        </p>
      )}
    </div>
  );
}

function groupByAssignee(tasks: InhouseTask[]) {
  const map: Record<string, InhouseTask[]> = {};
  for (const t of tasks ?? []) {
    const label = t.assignee?.display_name ?? "ยังไม่มอบหมาย";
    if (!map[label]) map[label] = [];
    map[label]!.push(t);
  }
  return map;
}
