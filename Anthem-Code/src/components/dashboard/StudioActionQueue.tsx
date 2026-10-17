import { Link } from "react-router-dom";
import { InfoHint } from "@/components/tour/InfoHint";
import { ActionQueueScene } from "@/components/tour/TourScenes";
import { CalendarClock, ChevronRight, Sparkles } from "lucide-react";
import { useProfilesByIds } from "@/core/profiles";
import type { HiringRow } from "@/hooks/useHiringRequests";
import { isContactedNewStatus, HIRE_TAB_ACCEPTED } from "@/lib/hiringStatus";
import { isCollabContactedNewStatus } from "@/lib/collabInbox";
import { studioRequestHref } from "@/lib/studioNav";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/UserAvatar";

type CollabRow = { id: string; sender_id: string; status: string; created_at: string; collab_types?: string[] | null };

type Action = {
  id: string;
  kind: "hire" | "collab" | "due";
  title: string;
  meta: string;
  cta: string;
  to: string;
  at: number;
  /** Who it's about — shown as an avatar. */
  personId?: string | null;
};

const DOT: Record<Action["kind"], string> = {
  hire: "bg-blue-500",
  collab: "bg-chat-collab",
  due: "bg-warning",
};

const DAY = 86_400_000;
const DUE_SOON_DAYS = 3;
/** Older overdue jobs are stale data, not today's work. */
const OVERDUE_CUTOFF_DAYS = 14;
const KIND_ORDER: Record<Action["kind"], number> = { hire: 0, collab: 0, due: 1 };

function ago(iso: string, now: number) {
  const days = Math.floor((now - new Date(iso).getTime()) / DAY);
  if (days <= 0) return "วันนี้";
  if (days === 1) return "เมื่อวาน";
  return `${days} วันที่แล้ว`;
}

/** Things that need the owner today: new hire / collab requests and hire jobs due within 3 days. */
export function buildStudioActions(hire: HiringRow[], collab: CollabRow[], names: Record<string, string>, now = Date.now()) {
  const actions: Action[] = [];
  for (const r of hire) {
    if (isContactedNewStatus(r.status)) {
      actions.push({
        id: `hire-${r.id}`,
        kind: "hire",
        title: `${r.client_name || "ลูกค้า"} ส่งคำขอจ้าง`,
        meta: `${r.project_title || "งานใหม่"} · ${ago(r.created_at, now)}`,
        cta: "ตอบ",
        to: studioRequestHref("hire", r.id),
        at: new Date(r.created_at).getTime(),
        personId: r.client_id,
      });
    } else if (r.status === HIRE_TAB_ACCEPTED && r.deadline) {
      const left = Math.ceil((new Date(r.deadline).getTime() - now) / DAY);
      if (left <= DUE_SOON_DAYS && left >= -OVERDUE_CUTOFF_DAYS) {
        actions.push({
          id: `due-${r.id}`,
          kind: "due",
          title: `${r.project_title || "งานจ้าง"} ${left < 0 ? `เลยกำหนด ${-left} วัน` : left === 0 ? "ถึงกำหนดวันนี้" : `ถึงกำหนดอีก ${left} วัน`}`,
          meta: r.client_name || "",
          cta: "เปิดงาน",
          to: studioRequestHref("hire", r.id),
          // Most urgent first within the due group
          at: -left,
        });
      }
    }
  }
  for (const r of collab) {
    if (!isCollabContactedNewStatus(r.status)) continue;
    actions.push({
      id: `collab-${r.id}`,
      kind: "collab",
      title: `${names[r.sender_id] ?? "ครีเอเตอร์"} ชวนคอลแลป`,
      meta: `${(r.collab_types ?? []).slice(0, 2).join(", ") || "คอลแลป"} · ${ago(r.created_at, now)}`,
      cta: "ดู",
      to: studioRequestHref("collab", r.id),
      at: new Date(r.created_at).getTime(),
      personId: r.sender_id,
    });
  }
  // New requests (newest first), then due work (most urgent first)
  return actions.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || b.at - a.at);
}

const MAX_ROWS = 6;

export default function StudioActionQueue({ hire, collab, loading }: { hire: HiringRow[]; collab: CollabRow[]; loading: boolean }) {
  const personIds = [
    ...collab.filter((r) => isCollabContactedNewStatus(r.status)).map((r) => r.sender_id),
    ...hire.filter((r) => isContactedNewStatus(r.status) && r.client_id).map((r) => r.client_id as string),
  ];
  const { data: people } = useProfilesByIds(personIds);
  const names: Record<string, string> = {};
  for (const p of people?.list ?? []) names[p.id] = p.display_name || (p.username ? `@${p.username}` : "ครีเอเตอร์");

  const actions = buildStudioActions(hire, collab, names);
  const shown = actions.slice(0, MAX_ROWS);

  return (
    <section data-tour="studio-queue" className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-1 text-base font-semibold text-foreground">
          {loading ? "ต้องทำก่อน" : actions.length ? `วันนี้มี ${actions.length} เรื่องรอคุณ` : "ไม่มีเรื่องค้าง"}
          <InfoHint title="รายการนี้มาจากไหน" scene={<ActionQueueScene />}>
            รวมคำขอจ้างและคำชวนคอลแลปที่ยังไม่ได้ตอบ กับงานจ้างที่ใกล้ถึงกำหนดส่งใน 3 วัน กดปุ่มที่แถวเพื่อเปิดคำขอนั้นตรง ๆ ตอบแล้วรายการจะหายไปเอง
          </InfoHint>
        </h2>
        {actions.length > MAX_ROWS ? (
          <span className="text-xs text-muted-foreground">แสดง {MAX_ROWS} จาก {actions.length}</span>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-2 py-1" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-secondary/40 px-4 py-4">
          <Sparkles className="h-5 w-5 text-brand" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            ตอบครบหมดแล้ว ลงผลงานเพิ่มหรือแชร์โปรไฟล์ให้คนเห็นมากขึ้นได้เลย
          </p>
          <Link to="/portfolio/new" className="text-sm font-medium text-foreground hover:underline">
            ลงผลงานใหม่
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {shown.map((a) => (
            <li key={a.id}>
              <Link to={a.to} className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/50">
                {a.kind === "due" ? (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/10 dark:bg-warning/15">
                    <CalendarClock className="h-4 w-4 text-warning" aria-hidden />
                  </span>
                ) : (
                  <span className="relative shrink-0">
                    <UserAvatar
                      src={a.personId ? people?.map[a.personId]?.avatar_url : null}
                      name={a.title}
                      className="h-9 w-9"
                      fallbackClassName="text-xs"
                    />
                    <span
                      className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card", DOT[a.kind])}
                      aria-hidden
                    />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{a.title}</span>
                  {a.meta ? <span className="block truncate text-xs text-muted-foreground">{a.meta}</span> : null}
                </span>
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-medium text-background transition-opacity group-hover:opacity-90">
                  {a.cta}
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
