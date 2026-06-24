import { ExternalLink, Loader2, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OPS_HUB_URL } from "@/lib/productLinks";
import { useOpsDevTasks, useUpdateOpsDevTask, type OpsDevTask } from "@/hooks/useOpsDevTasks";

const STATUS_LABELS: Record<string, string> = {
  backlog: "คลัง",
  todo: "รอทำ",
  in_progress: "กำลังทำ",
  in_review: "รอตรวจ",
  done: "เสร็จแล้ว",
};

const STATUS_ORDER = ["backlog", "todo", "in_progress", "in_review", "done"] as const;

const PRIORITY_STYLE: Record<string, string> = {
  critical: "text-red-600",
  high: "text-orange-600",
  medium: "text-amber-700",
  low: "text-muted-foreground",
};

function TaskCard({
  task,
  onStatus,
  busy,
}: {
  task: OpsDevTask;
  onStatus: (status: string) => void;
  busy: boolean;
}) {
  const fromTracking = task.source_type === "tracking" || task.labels?.includes("from-tracking");

  return (
    <article className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-mono text-muted-foreground">{task.issue_number}</p>
          <p className="text-sm font-medium leading-snug">{task.title}</p>
        </div>
        {fromTracking ? (
          <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-800">
            tracking
          </span>
        ) : null}
      </div>
      {task.description ? (
        <p className="text-[11px] text-muted-foreground line-clamp-3 whitespace-pre-line">
          {task.description}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 text-[10px]">
        <span className={`font-medium ${PRIORITY_STYLE[task.priority] ?? ""}`}>
          {task.priority}
        </span>
        <select
          value={task.status}
          disabled={busy}
          onChange={(e) => onStatus(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1 text-[10px]"
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}

export function DevTasksSection() {
  const { data, isLoading, isError, error, refetch, isFetching } = useOpsDevTasks();
  const update = useUpdateOpsDevTask();

  const tasks = data?.tasks ?? [];
  const openCount = tasks.filter((t) => t.status !== "done").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">แผนพัฒนา</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            งานพัฒนาต่อจาก Ops Hub tracking — อ่านจาก ops.issues
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            รีเฟรช
          </Button>
          <Button asChild size="sm" variant="outline" className="h-8 gap-1">
            <a href={`${OPS_HUB_URL}/tracking`} target="_blank" rel="noopener noreferrer">
              Ops Hub Tracking <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <p className="text-[10px] text-muted-foreground uppercase">งานเปิด</p>
          <p className="text-2xl font-semibold num">{openCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <p className="text-[10px] text-muted-foreground uppercase">ทั้งหมด</p>
          <p className="text-2xl font-semibold num">{tasks.length}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          โหลดไม่สำเร็จ: {error instanceof Error ? error.message : "unknown"}
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3">
          <Map className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">ยังไม่มีงานพัฒนา — ไปสร้างจาก Ops Hub</p>
          <Button asChild size="sm" variant="outline">
            <a href={`${OPS_HUB_URL}/tracking`} target="_blank" rel="noopener noreferrer">
              เปิด Tracking → สร้างงาน
            </a>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-5">
          {STATUS_ORDER.map((status) => {
            const column = tasks.filter((t) => t.status === status);
            return (
              <section key={status} className="min-w-0">
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                  {STATUS_LABELS[status]} ({column.length})
                </h3>
                <div className="space-y-2">
                  {column.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      busy={update.isPending}
                      onStatus={(next) => update.mutate({ id: task.id, status: next })}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
