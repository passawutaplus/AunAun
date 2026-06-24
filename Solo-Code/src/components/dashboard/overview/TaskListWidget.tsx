import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ListTodo, NotebookPen } from "lucide-react";
import { useDashboardTasks, type DashboardTask } from "@/store/dashboardTasks";
import { toast } from "sonner";

type Filter = "all" | "pending" | "done";

export function TaskListWidget() {
  const tasks = useDashboardTasks();
  const [newTitle, setNewTitle] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");

  const handleAdd = async () => {
    const t = newTitle.trim();
    if (!t) return;
    try {
      await tasks.add({ title: t });
      setNewTitle("");
    } catch {
      toast.error("เพิ่มไม่สำเร็จ");
    }
  };

  const pending = tasks.list.filter((t) => !t.done);
  const done = tasks.list.filter((t) => t.done);
  const total = tasks.list.length;
  const doneCount = done.length;

  const visible: DashboardTask[] =
    filter === "pending" ? pending : filter === "done" ? done : tasks.list;

  return (
    <Card className="rounded-xl border-border/60 shadow-soft h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="rounded-lg bg-muted text-muted-foreground p-1.5">
            <ListTodo className="h-3.5 w-3.5" />
          </span>
          Task ทั่วไป
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => {
            const el = document.getElementById("tasklist-input") as HTMLInputElement | null;
            el?.focus();
          }}
        >
          <Plus className="h-3 w-3" /> เพิ่ม
        </Button>
      </CardHeader>
      <CardContent className="flex-1 space-y-2.5 flex flex-col">
        {/* Filter pills */}
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              { k: "all", l: "ทั้งหมด" },
              { k: "pending", l: "ค้างอยู่" },
              { k: "done", l: "เสร็จแล้ว" },
            ] as { k: Filter; l: string }[]
          ).map((p) => (
            <button
              key={p.k}
              onClick={() => setFilter(p.k)}
              className={`text-[11px] font-medium rounded-lg py-1.5 transition-colors ${
                filter === p.k
                  ? "bg-primary-soft text-primary border border-primary/30"
                  : "bg-muted/40 text-muted-foreground border border-transparent hover:bg-muted"
              }`}
            >
              {p.l}
            </button>
          ))}
        </div>

        {/* Quick add */}
        <div className="flex gap-1.5">
          <Input
            id="tasklist-input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="เพิ่ม task ใหม่..."
            className="h-8 text-xs bg-background"
          />
          <Button size="icon" className="h-8 w-8 shrink-0" variant="outline" onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* List */}
        <div className="flex-1 space-y-1 min-h-0">
          {visible.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <NotebookPen className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
              <p className="text-[11px]">
                {filter === "done"
                  ? "ยังไม่มีงานที่เสร็จ"
                  : filter === "pending"
                    ? "ไม่มีงานค้าง 🎉"
                    : "ยังไม่มี task — กดเพิ่มได้เลย"}
              </p>
            </div>
          ) : (
            <>
              {filter === "all" && pending.length > 0 && (
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">
                  ต้องทำเร็ว ๆ นี้
                </div>
              )}
              {visible
                .filter((t) => filter !== "all" || !t.done)
                .map((t) => (
                  <TaskRow key={t.id} task={t} onUpdate={tasks.update} onRemove={tasks.remove} />
                ))}
              {filter === "all" && done.length > 0 && (
                <>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pt-2 border-t border-border/40 mt-2">
                    เสร็จแล้ว
                  </div>
                  {done.map((t) => (
                    <TaskRow key={t.id} task={t} onUpdate={tasks.update} onRemove={tasks.remove} />
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Progress label */}
        {total > 0 && (
          <div className="border-t border-primary/40 pt-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold">Task ทั่วไป</span>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {doneCount}/{total} เสร็จ
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TaskRow({
  task,
  onUpdate,
  onRemove,
}: {
  task: DashboardTask;
  onUpdate: (id: string, patch: Partial<DashboardTask>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = React.useState(task.title);
  React.useEffect(() => setTitle(task.title), [task.title]);

  const commit = async (value: string) => {
    if (value === task.title) return;
    try {
      await onUpdate(task.id, { title: value });
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  return (
    <div className="group flex items-center gap-1.5 rounded-md px-1 py-1 hover:bg-muted/40 transition-colors">
      <Checkbox
        checked={task.done}
        onCheckedChange={(v) =>
          onUpdate(task.id, { done: !!v }).catch(() => toast.error("บันทึกไม่สำเร็จ"))
        }
        className="data-[state=checked]:bg-success data-[state=checked]:border-success"
      />
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className={`h-6 px-1.5 text-xs border-transparent hover:border-border/60 focus:border-primary bg-transparent flex-1 ${
          task.done ? "line-through text-muted-foreground" : ""
        }`}
      />
      <Button
        size="icon"
        variant="ghost"
        className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
        onClick={() => onRemove(task.id).catch(() => toast.error("ลบไม่สำเร็จ"))}
      >
        <Trash2 className="h-2.5 w-2.5" />
      </Button>
    </div>
  );
}
