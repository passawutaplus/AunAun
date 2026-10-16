import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ListChecks, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  COLLAB_STARTER_TASKS,
  COLLAB_TASK_COLUMNS,
  useCollabTaskActions,
  useCollabTasks,
  type CollabTaskStatus,
} from "@/hooks/useCollabTasks";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  /** When the work is done: publish it as a shared project (collaborators tagged for you). */
  publishPath?: string | null;
};

const ORDER: CollabTaskStatus[] = ["todo", "doing", "done"];

/** Collaboration workspace board: To do / Doing / Done for the people in this chat. */
export default function CollabTasksSheet({ open, onOpenChange, conversationId, publishPath }: Props) {
  const { data: tasks = [], isLoading } = useCollabTasks(open ? conversationId : undefined);
  const { add, update, remove } = useCollabTaskActions(conversationId);
  const [draft, setDraft] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    add.mutate([draft], { onSuccess: () => setDraft("") });
  };

  const move = (id: string, status: CollabTaskStatus, dir: -1 | 1) => {
    const next = ORDER[ORDER.indexOf(status) + dir];
    if (next) update.mutate({ id, patch: { status: next } });
  };

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
          <SheetDescription>งานที่ต้องทำร่วมกันในคอลแลปนี้ — ทุกคนในแชทเพิ่ม ย้าย และลบได้</SheetDescription>
        </SheetHeader>

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
          <div className="grid gap-3 md:grid-cols-3">
            {COLLAB_TASK_COLUMNS.map((col) => {
              const items = tasks.filter((t) => t.status === col.status);
              return (
                <section key={col.status} className="space-y-2 rounded-2xl bg-muted/30 p-3" aria-label={col.label}>
                  <h3 className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {col.label}
                    <span className="tabular-nums">{items.length}</span>
                  </h3>
                  {items.length === 0 ? (
                    <p className="py-3 text-center text-xs text-muted-foreground/70">ว่าง</p>
                  ) : (
                    <ul className="space-y-2">
                      {items.map((t) => (
                        <li
                          key={t.id}
                          className={cn(
                            "group rounded-xl border border-border/60 bg-background p-2.5 text-sm shadow-sm",
                            t.status === "done" && "text-muted-foreground line-through decoration-muted-foreground/50",
                          )}
                        >
                          <p className="break-words">{t.title}</p>
                          <div className="mt-2 flex items-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              disabled={t.status === "todo"}
                              onClick={() => move(t.id, t.status, -1)}
                              aria-label={`ย้าย "${t.title}" ไปทางซ้าย`}
                            >
                              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              disabled={t.status === "done"}
                              onClick={() => move(t.id, t.status, 1)}
                              aria-label={`ย้าย "${t.title}" ไปทางขวา`}
                            >
                              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="ml-auto h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => remove.mutate(t.id)}
                              aria-label={`ลบ "${t.title}"`}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {allDone && publishPath ? (
          <div className="flex flex-col items-start gap-2 rounded-2xl border border-primary/40 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">งานเสร็จครบแล้ว 🎉 ลงเป็นผลงานร่วมกัน — ทุกคนจะได้เครดิตบนโปรไฟล์</p>
            <Button asChild className="shrink-0 rounded-full">
              <Link to={publishPath}>ลงผลงานร่วมกัน</Link>
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
