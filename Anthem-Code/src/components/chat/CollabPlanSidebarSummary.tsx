import { CalendarDays, Check, FileText, HeartHandshake, ListChecks, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCollabAgreement } from "@/hooks/useCollabAgreement";
import { useCollabTasks } from "@/hooks/useCollabTasks";
import { AgreementStatusPill, useMemberNames } from "@/components/chat/CollabAgreementSheet";
import { rightsLabel } from "@/lib/collabAgreement";

const shortDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(y, m - 1, d));
};

/** Chat side panel: the agreed plan at a glance + task progress. */
export function CollabPlanSidebarSummary({ conversationId, onOpen }: { conversationId: string; onOpen: () => void }) {
  const { user } = useAuth();
  const a = useCollabAgreement(conversationId);
  const { data: members = [] } = useMemberNames(a.memberIds, user?.id);
  const { data: tasks = [] } = useCollabTasks(conversationId);
  const ag = a.agreement;
  const done = tasks.filter((t) => t.status === "done").length;
  const empty = !ag.what && !ag.brief && !Object.values(ag.roles).some((v) => v.trim());

  return (
    <section className="space-y-3" aria-label="แผนคอลแลป">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--chat-collab))]">
          <HeartHandshake className="h-3.5 w-3.5" aria-hidden /> แผนคอลแลป
        </p>
        <AgreementStatusPill status={a.status} ackCount={a.ackCount} total={a.memberIds.length} />
      </div>

      {a.isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
      ) : empty ? (
        <div className="space-y-2 rounded-xl border border-dashed border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">ยังไม่มีแผน — ตกลงกันให้ชัดใน 1 นาที</p>
          <Button type="button" size="sm" className="h-8 rounded-full" onClick={onOpen}>
            เริ่มทำแผน
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="w-full space-y-2.5 rounded-xl border border-border/70 bg-muted/20 p-3 text-left transition-colors hover:bg-muted/40"
        >
          <p className="text-sm font-medium leading-snug break-words">{ag.what || "—"}</p>
          {ag.brief ? (
            <p className="flex gap-1.5 text-xs text-muted-foreground">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="line-clamp-3 break-words">{ag.brief}</span>
            </p>
          ) : null}
          {members.some((m) => ag.roles[m.id]?.trim()) ? (
            <ul className="space-y-1 text-xs">
              {members
                .filter((m) => ag.roles[m.id]?.trim())
                .map((m) => (
                  <li key={m.id} className="flex items-start gap-1.5">
                    <span className="shrink-0 font-medium text-foreground/90">{m.name}</span>
                    <span className="min-w-0 flex-1 break-words text-muted-foreground">{ag.roles[m.id]}</span>
                    {a.acks[m.id] ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-label="ตกลงแล้ว" /> : null}
                  </li>
                ))}
            </ul>
          ) : null}
          <div className="space-y-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
            {ag.destinations.length ? (
              <p className="flex gap-1.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="break-words">{ag.destinations.join(" · ")}</span>
              </p>
            ) : null}
            {ag.dueAt ? (
              <p className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden /> เสร็จประมาณ {shortDay(ag.dueAt)}
              </p>
            ) : null}
            <p className="flex gap-1.5">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="line-clamp-3 whitespace-pre-wrap break-words">{rightsLabel(ag)}</span>
            </p>
          </div>
        </button>
      )}

      {tasks.length > 0 ? (
        <div className="space-y-1.5 rounded-xl border border-border/70 p-3">
          <p className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" aria-hidden /> Tasks
            </span>
            <span className="tabular-nums text-foreground">
              {done}/{tasks.length} เสร็จ
            </span>
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-primary" style={{ width: `${(done / tasks.length) * 100}%` }} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
