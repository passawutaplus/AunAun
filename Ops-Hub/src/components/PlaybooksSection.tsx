import { CheckCircle2 } from "lucide-react";
import { ECOSYSTEM_PLAYBOOKS } from "@/lib/playbooks";
import { useCompletePlaybookRun, usePlaybookRuns } from "@/hooks/usePlaybooks";

export function PlaybooksSection() {
  const { data: runs } = usePlaybookRuns();
  const complete = useCompletePlaybookRun();

  const lastDone = (id: string) =>
    runs?.find((r) => r.playbook_id === id && r.status === "done");

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">Runbooks (Ecosystem)</h2>
        <p className="mt-0.5 text-xs text-muted">ขั้นตอนแก้ปัญหาเมื่อแอปใดแอปหนึ่งมีอาการ</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {ECOSYSTEM_PLAYBOOKS.map((pb) => {
          const done = lastDone(pb.id);
          return (
            <article key={pb.id} className="rounded-xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{pb.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{pb.symptom}</p>
                </div>
                {done ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" /> ทำแล้ว
                  </span>
                ) : null}
              </div>
              <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-muted">
                {pb.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => void complete.mutateAsync({ playbookId: pb.id })}
                className="mt-3 text-xs font-medium text-brand hover:underline"
              >
                ทำเครื่องหมายว่าทำแล้ว
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
