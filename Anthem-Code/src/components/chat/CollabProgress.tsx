import { Check, HeartHandshake, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCollabAgreement } from "@/hooks/useCollabAgreement";
import { useCollabTasks } from "@/hooks/useCollabTasks";
import { COLLAB_STAGES, COLLAB_WELCOME_PREFIX, collabStage, type CollabStage } from "@/lib/collabAgreement";
import { cn } from "@/lib/utils";

export function isCollabWelcomeMessage(content: string | null | undefined) {
  return content?.trim() === COLLAB_WELCOME_PREFIX;
}

export function useCollabStage(conversationId: string | undefined, enabled = true) {
  const a = useCollabAgreement(conversationId, enabled);
  const { data: tasks = [] } = useCollabTasks(enabled ? conversationId : undefined);
  const done = tasks.filter((t) => t.status === "done").length;
  return { stage: collabStage(a.status, tasks.length, done), tasksTotal: tasks.length, tasksDone: done, agreement: a };
}

/** คุยกัน → ตกลงแผน → ทำงาน x/y → ลงผลงาน */
export function CollabProgressSteps({
  stage,
  tasksTotal,
  tasksDone,
  className,
}: {
  stage: CollabStage;
  tasksTotal: number;
  tasksDone: number;
  className?: string;
}) {
  const current = COLLAB_STAGES.findIndex((s) => s.id === stage);
  return (
    <ol className={cn("flex items-start gap-1", className)} aria-label="ความคืบหน้าคอลแลป">
      {COLLAB_STAGES.map((s, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={s.id} className="flex min-w-0 flex-1 flex-col items-center gap-1" aria-current={now ? "step" : undefined}>
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1 rounded-full", i === 0 ? "opacity-0" : done || now ? "bg-orange-500" : "bg-border")} />
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium",
                  done && "bg-orange-500 text-white",
                  now && "bg-orange-500/15 text-orange-700 ring-2 ring-orange-500 dark:text-orange-300",
                  !done && !now && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              <span className={cn("h-0.5 flex-1 rounded-full", i === COLLAB_STAGES.length - 1 ? "opacity-0" : done ? "bg-orange-500" : "bg-border")} />
            </div>
            <span className={cn("truncate text-[10px]", now ? "font-medium text-foreground" : "text-muted-foreground")}>
              {s.id === "work" && tasksTotal > 0 ? `${s.label} ${tasksDone}/${tasksTotal}` : s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const NEXT_STEP: Record<CollabStage, string> = {
  talk: "ตกลงแผนกันก่อน — ใช้เวลาไม่ถึง 1 นาที",
  plan: "รอทุกคนกดตกลงแผน",
  work: "แบ่งงานกันใน Tasks แล้วลุยเลย",
  publish: "งานเสร็จครบแล้ว ลงเป็นผลงานร่วมกันได้เลย",
};

/** Posted when an invite is accepted: friendly start + live progress of the collab. */
export function CollabWelcomeCard({ conversationId, onOpenPlan }: { conversationId: string; onOpenPlan?: () => void }) {
  const s = useCollabStage(conversationId);
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-[20px] border border-border bg-card text-sm shadow-sm">
      <div className="flex items-center gap-2.5 bg-orange-50 px-3.5 py-3 dark:bg-orange-950/40">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-orange-600 dark:text-orange-400">
          <HeartHandshake className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-orange-900 dark:text-orange-100">เริ่มคอลแลปแล้ว!</p>
          <p className="text-xs text-orange-800/80 dark:text-orange-200/80">{NEXT_STEP[s.stage]}</p>
        </div>
      </div>
      <div className="px-3.5 py-3">
        <CollabProgressSteps stage={s.stage} tasksTotal={s.tasksTotal} tasksDone={s.tasksDone} />
      </div>
      {onOpenPlan && s.stage === "talk" ? (
        <div className="px-3.5 pb-3.5">
          <Button type="button" size="sm" className="h-8 w-full rounded-full bg-orange-500 text-white hover:bg-orange-600" onClick={onOpenPlan}>
            ทำแผน
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Messages from the retired 4-step plan (document, step locked, change request…) collapse into this. */
export function LegacyCollabPlanCard({ onOpenPlan }: { onOpenPlan?: () => void }) {
  return (
    <div className="flex w-full max-w-sm items-center gap-2.5 rounded-[20px] border border-border bg-card px-3.5 py-2.5 text-xs shadow-sm">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <History className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-muted-foreground">ข้อความจากระบบแผนรุ่นเก่า</span>
      {onOpenPlan ? (
        <button type="button" onClick={onOpenPlan} className="shrink-0 rounded-full border border-border px-3 py-1 font-medium hover:bg-muted">
          เปิดแผน
        </button>
      ) : null}
    </div>
  );
}
