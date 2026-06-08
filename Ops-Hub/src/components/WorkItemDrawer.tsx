import { useEffect, useState } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import { useWorkItemDrawer } from "@/contexts/WorkItemDrawerContext";
import { useWorkItemMutations } from "@/hooks/useWorkItemMutations";
import { usePromoteWorkItem } from "@/hooks/useOpsIssues";
import {
  BOARD_COLUMNS,
  SOURCE_LABELS,
  type BoardColumn,
  type WorkItemPriority,
} from "@/lib/work-items";

export function WorkItemDrawer() {
  const { item, close } = useWorkItemDrawer();
  const { updateStatus, updatePriority, updateAdminNote } = useWorkItemMutations();
  const promote = usePromoteWorkItem();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setNote(item?.adminNote ?? "");
    setErr(null);
  }, [item]);

  if (!item) return null;

  const canNote = item.source !== "ops_issue";
  const canPriority = item.source === "support_ticket" || item.source === "ops_issue";
  const canPromote = item.source !== "ops_issue";

  const patch = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "อัปเดตไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={close} aria-hidden />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="font-mono text-xs text-muted">{item.key}</p>
            <p className="text-sm font-semibold">{SOURCE_LABELS[item.source]}</p>
          </div>
          <button type="button" onClick={close} className="rounded-lg p-1 hover:bg-surface">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <h2 className="text-lg font-semibold">{item.title}</h2>
          {item.description ? (
            <p className="whitespace-pre-wrap text-sm text-muted">{item.description}</p>
          ) : null}

          {err ? <p className="text-sm text-red-600">{err}</p> : null}

          <label className="block text-xs font-semibold uppercase text-muted">
            สถานะ (Board)
            <select
              disabled={busy}
              value={item.boardColumn}
              onChange={(e) =>
                patch(() =>
                  updateStatus.mutateAsync({
                    item,
                    column: e.target.value as BoardColumn,
                  }),
                )
              }
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              {BOARD_COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          {canPriority ? (
            <label className="block text-xs font-semibold uppercase text-muted">
              Priority
              <select
                disabled={busy}
                value={item.priority}
                onChange={(e) =>
                  patch(() =>
                    updatePriority.mutateAsync({
                      item,
                      priority: e.target.value as WorkItemPriority,
                    }),
                  )
                }
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
          ) : null}

          {canNote ? (
            <label className="block text-xs font-semibold uppercase text-muted">
              Admin note
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => patch(() => updateAdminNote.mutateAsync({ item, adminNote: note }))}
                className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white"
              >
                บันทึก note
              </button>
            </label>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <a
              href={item.deepLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface"
            >
              <ExternalLink className="h-3.5 w-3.5" /> เปิดใน Admin
            </a>
            {canPromote ? (
              <button
                type="button"
                disabled={busy || promote.isPending}
                onClick={() =>
                  patch(() => promote.mutateAsync({ item }).then(() => undefined))
                }
                className="rounded-lg border border-brand px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-soft"
              >
                {promote.isPending ? (
                  <Loader2 className="inline h-3.5 w-3.5 animate-spin" />
                ) : (
                  "สร้าง Hub Issue"
                )}
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
}
