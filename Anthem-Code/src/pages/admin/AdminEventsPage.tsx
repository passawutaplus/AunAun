import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ExternalLink, Star } from "lucide-react";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { type Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import { CategoryTag, EventGallery, EventMeta, eventImages } from "@/components/exhibition/EventParts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAdminEvents, useReviewEvent, useSetEventPick } from "@/hooks/useExhibitionEvents";
import {
  EVENT_STATUS_LABEL,
  eventDisplayStatus,
  formatEventDates,
  isDemoEventId,
  type EventDisplayStatus,
  type ExhibitionEvent,
} from "@/lib/exhibitionEvents";
import { cn } from "@/lib/utils";

const CHECKS = [
  "ข้อมูลครบและอ่านเข้าใจ",
  "รูปเหมาะสม ไม่ละเมิดสิทธิ์",
  "ลิงก์ลงทะเบียน/เว็บไซต์ใช้งานได้จริง",
  "งานมีอยู่จริง ผู้จัดน่าเชื่อถือ",
  "ไม่มีข้อมูลชวนเข้าใจผิด",
] as const;

type Tab = "pending" | "published" | "needs_revision" | "rejected" | "ended";
const TABS: Tab[] = ["pending", "published", "needs_revision", "rejected", "ended"];

function ReviewDialog({ event, onClose }: { event: ExhibitionEvent | null; onClose: () => void }) {
  const review = useReviewEvent();
  const [checks, setChecks] = useState<boolean[]>(CHECKS.map(() => false));
  const [note, setNote] = useState("");
  const allChecked = checks.every(Boolean);
  const demo = isDemoEventId(event?.id);

  const decide = async (decision: "approve" | "revise" | "reject") => {
    if (!event) return;
    try {
      await review.mutateAsync({ id: event.id, decision, note });
      setChecks(CHECKS.map(() => false));
      setNote("");
      onClose();
    } catch {
      /* toast from the hook */
    }
  };

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {event ? (
          <>
            <DialogHeader>
              <DialogTitle>ตรวจ: {event.title}</DialogTitle>
              <DialogDescription>ดูตัวอย่างเหมือนหน้าจริง แล้วเลือกผลตรวจ — ถ้าขอแก้หรือปฏิเสธ ต้องบอกเหตุผลให้ผู้จัด</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="space-y-3">
                <EventGallery images={eventImages(event)} title={event.title} />
                <CategoryTag category={event.category} />
                <EventMeta event={event} />
                {event.time_note ? <p className="text-xs text-muted-foreground">{event.time_note}</p> : null}
                <p className="whitespace-pre-line text-sm text-foreground/85">{event.description}</p>
                <div className="space-y-1 text-xs">
                  {[event.website_url, event.registration_url].filter(Boolean).map((u) => (
                    <a key={u} href={u!} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 break-all text-foreground underline">
                      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden /> {u}
                    </a>
                  ))}
                </div>
                {event.sponsors.length ? (
                  <p className="text-xs text-muted-foreground">
                    Sponsors: {event.sponsors.map((s) => (s.note ? `${s.name} (${s.note})` : s.name)).join(", ")}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  ค่าเข้า: {event.fee_type === "paid" ? event.fee_note ?? "มีค่าเข้า" : "ฟรี"} · ผลงานที่แนบ {event.project_ids.length} ชิ้น
                </p>
              </div>
              <div className="space-y-4">
                <fieldset className="space-y-2">
                  <legend className="mb-1 text-sm font-medium">Moderation</legend>
                  {CHECKS.map((label, i) => (
                    <label key={label} className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={checks[i]}
                        onCheckedChange={(v) => setChecks((c) => c.map((x, j) => (j === i ? v === true : x)))}
                        className="mt-0.5"
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
                <div className="space-y-1.5">
                  <label htmlFor="review-note" className="text-sm font-medium">
                    ข้อความถึงผู้จัด
                  </label>
                  <Textarea
                    id="review-note"
                    rows={4}
                    maxLength={1000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="จำเป็นเมื่อขอแก้หรือปฏิเสธ"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="ghost" disabled={review.isPending || demo || !note.trim()} onClick={() => void decide("reject")} className="text-destructive">
                Reject
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={review.isPending || demo || !note.trim()} onClick={() => void decide("revise")}>
                  Request Revision
                </Button>
                <Button disabled={review.isPending || demo || !allChecked} onClick={() => void decide("approve")}>
                  Approve &amp; Publish
                </Button>
              </div>
            </DialogFooter>
            {demo ? <p className="text-xs text-muted-foreground">ข้อมูลตัวอย่างใน dev — ปุ่มตรวจปิดไว้</p> : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default function AdminEventsPage() {
  const { data = [], isLoading } = useAdminEvents();
  const setPick = useSetEventPick();
  const [tab, setTab] = useState<Tab>("pending");
  const [reviewing, setReviewing] = useState<ExhibitionEvent | null>(null);

  const byStatus = useMemo(() => {
    const m = new Map<EventDisplayStatus, ExhibitionEvent[]>();
    data.forEach((e) => {
      const s = eventDisplayStatus(e);
      m.set(s, [...(m.get(s) ?? []), e]);
    });
    return m;
  }, [data]);
  const rows = byStatus.get(tab) ?? [];

  const columns: Column<ExhibitionEvent>[] = [
    {
      key: "event",
      header: "Event",
      render: (e) => (
        <div className="min-w-0">
          <p className="font-medium text-admin-fg">{e.title}</p>
          <p className="text-[11px] text-admin-muted">
            {formatEventDates(e.starts_on, e.ends_on)} · {e.location_name}
          </p>
        </div>
      ),
    },
    { key: "organizer", header: "Organizer", render: (e) => <span className="text-xs">{e.organizer_name ?? "—"}</span> },
    {
      key: "submitted",
      header: "Submitted",
      render: (e) => (
        <span className="text-xs text-admin-muted">
          {e.submitted_at ? format(new Date(e.submitted_at), "d MMM", { locale: th }) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (e) => <StatusPill status={EVENT_STATUS_LABEL[eventDisplayStatus(e)].label} tone={e.status === "pending" ? "accent" : "default"} />,
    },
    {
      key: "pick",
      header: "Pick",
      render: (e) =>
        e.status === "published" ? (
          <label className="flex items-center gap-1.5 text-xs">
            <Switch
              checked={e.is_pick}
              disabled={setPick.isPending || isDemoEventId(e.id)}
              onCheckedChange={(v) => setPick.mutate({ id: e.id, pick: v })}
              aria-label={`SameCor Pick: ${e.title}`}
            />
            <Star className={cn("h-3.5 w-3.5", e.is_pick ? "fill-current text-admin-accent" : "text-admin-muted")} aria-hidden />
          </label>
        ) : null,
    },
    {
      key: "act",
      header: "",
      render: (e) =>
        e.status === "pending" ? (
          <Button size="sm" onClick={() => setReviewing(e)}>
            Review
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link to={`/exhibition/${e.id}`}>View</Link>
          </Button>
        ),
    },
  ];

  return (
    <div>
      <SectionHeader eyebrow="exhibition" title="Exhibition & Events" description="ตรวจงานที่ครีเอเตอร์ส่งมา และเลือก SameCor Pick" />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="สถานะ">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-sm border px-3 py-1.5 text-xs font-medium",
              tab === t ? "border-admin-fg bg-admin-fg text-admin-bg" : "border-admin-border text-admin-fg hover:bg-admin-hover",
            )}
          >
            {EVENT_STATUS_LABEL[t].label} <span className="opacity-70">{byStatus.get(t)?.length ?? 0}</span>
          </button>
        ))}
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        loading={isLoading}
        empty={tab === "pending" ? "ไม่มีงานรอตรวจ" : "ไม่มีงานในสถานะนี้"}
      />
      <ReviewDialog event={reviewing} onClose={() => setReviewing(null)} />
    </div>
  );
}
