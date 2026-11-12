import { cardImageSrc } from "@/lib/mediaThumb";
import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, Eye, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import StudioLayout from "@/components/dashboard/StudioLayout";
import { EventStatusBadge } from "@/components/exhibition/EventParts";
import EmptyState from "@/components/ui/EmptyState";
import QueryStatusPanel from "@/components/ui/QueryStatusPanel";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  useDeleteEvent,
  useMyEvents,
  useMyPublishedProjects,
  useSetEventSwitches,
  useWithdrawEvent,
} from "@/hooks/useExhibitionEvents";
import {
  categoryLabel,
  eventDisplayStatus,
  formatEventDates,
  isDemoEventId,
  type ExhibitionEvent,
} from "@/lib/exhibitionEvents";

const NEW_PATH = "/dashboard/exhibition/new";

function EventRow({ event, onDelete }: { event: ExhibitionEvent; onDelete: (e: ExhibitionEvent) => void }) {
  const withdraw = useWithdrawEvent();
  const switches = useSetEventSwitches();
  const shown = eventDisplayStatus(event);
  const demo = isDemoEventId(event.id);
  const editable = event.status !== "pending";

  return (
    <li className="flex flex-col gap-4 border-b border-border py-5 last:border-0 sm:flex-row">
      <div className="aspect-[4/3] w-full shrink-0 overflow-hidden rounded-md bg-muted sm:w-40">
        {event.cover_url ? <img decoding="async" src={cardImageSrc(event.cover_url)} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <EventStatusBadge event={event} />
        <p className="font-display text-lg font-semibold leading-tight text-foreground">{event.title || "ยังไม่ตั้งชื่องาน"}</p>
        <p className="text-xs text-muted-foreground">
          {categoryLabel(event.category)}
          {event.starts_on ? ` · ${formatEventDates(event.starts_on, event.ends_on)}` : ""}
          {event.location_name ? ` · ${event.location_name}` : ""}
        </p>
        {event.review_note && (event.status === "needs_revision" || event.status === "rejected") ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-foreground">
            <span className="font-medium">ข้อความจากทีมตรวจ:</span> {event.review_note}
          </p>
        ) : null}
        {event.status === "pending" ? (
          <p className="text-xs text-muted-foreground">ทีมงานตรวจภายใน 1–3 วันทำการ — ระหว่างนี้แก้ไขไม่ได้ ถอนการส่งก่อนถ้าต้องแก้</p>
        ) : null}
        {shown === "published" ? (
          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
            <label className="flex items-center gap-2 text-xs text-foreground">
              <Switch
                checked={event.registration_open}
                disabled={demo || switches.isPending}
                onCheckedChange={(v) => switches.mutate({ id: event.id, registrationOpen: v })}
              />
              เปิดรับลงทะเบียน
            </label>
            <label className="flex items-center gap-2 text-xs text-foreground">
              <Switch
                checked={event.open_for_sponsors}
                disabled={demo || switches.isPending}
                onCheckedChange={(v) => switches.mutate({ id: event.id, openForSponsors: v })}
              />
              เปิดหาสปอนเซอร์
            </label>
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-start gap-2 sm:flex-col sm:items-stretch">
        {event.status === "published" || demo ? (
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to={`/exhibition/${event.id}`}>
              <Eye className="mr-1.5 h-4 w-4" aria-hidden /> View
            </Link>
          </Button>
        ) : null}
        {editable ? (
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to={`/dashboard/exhibition/${event.id}/edit`} aria-disabled={demo}>
              <Pencil className="mr-1.5 h-4 w-4" aria-hidden /> Edit
            </Link>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={demo || withdraw.isPending}
            onClick={() => withdraw.mutate(event.id)}
          >
            <Undo2 className="mr-1.5 h-4 w-4" aria-hidden /> ถอนการส่ง
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full text-muted-foreground hover:text-destructive"
          disabled={demo}
          onClick={() => onDelete(event)}
          aria-label={`ลบ ${event.title || "งานนี้"}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </li>
  );
}

export default function MyExhibitionPage() {
  const { data = [], isLoading, isError, refetch } = useMyEvents();
  const { data: works = [], isLoading: worksLoading } = useMyPublishedProjects();
  const remove = useDeleteEvent();
  const [toDelete, setToDelete] = useState<ExhibitionEvent | null>(null);
  const counts = data.reduce<Record<string, number>>((acc, e) => {
    const s = eventDisplayStatus(e);
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <StudioLayout
      titleAccessory={
        <Button asChild size="sm" className="rounded-full">
          <Link to={NEW_PATH}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Add Event
          </Link>
        </Button>
      }
    >
      <p className="mb-4 max-w-xl text-sm text-muted-foreground">
        ลงนิทรรศการ เวิร์กช็อป หรืออีเวนต์ของคุณให้ชุมชน SAMECOR เห็น ทีมงานตรวจทุกงานก่อนเผยแพร่ภายใน 1–3 วันทำการ
      </p>

      {!worksLoading && works.length === 0 ? (
        <div className="mb-6 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <p className="font-medium text-foreground">ต้องมีผลงานที่เผยแพร่แล้วอย่างน้อย 1 ชิ้นก่อนส่งตรวจ</p>
          <p className="mt-1 text-muted-foreground">
            ผู้ชมจะดูผลงานของคุณได้จากหน้า Exhibition — เขียนร่างไว้ก่อนได้
          </p>
          <Button asChild size="sm" variant="outline" className="mt-3 rounded-full">
            <Link to="/portfolio/new">ลงผลงานแรก</Link>
          </Button>
        </div>
      ) : null}

      {data.length ? (
        <p className="mb-2 text-xs text-muted-foreground">
          {(["published", "pending", "needs_revision", "draft", "ended"] as const)
            .filter((s) => counts[s])
            .map((s) => `${s === "needs_revision" ? "ต้องแก้" : s === "pending" ? "รอตรวจ" : s === "published" ? "เผยแพร่" : s === "draft" ? "ร่าง" : "จบแล้ว"} ${counts[s]}`)
            .join(" · ")}
        </p>
      ) : null}

      {isLoading || isError ? (
        <QueryStatusPanel isLoading={isLoading} isError={isError} onRetry={() => void refetch()} errorTitle="โหลดงานของคุณไม่สำเร็จ" />
      ) : data.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="ยังไม่มี Exhibition"
          description="เริ่มจากชื่องาน วันที่ สถานที่ และรูปปก — บันทึกร่างไว้ก่อนส่งตรวจได้"
          action={
            <Button asChild className="rounded-full">
              <Link to={NEW_PATH}>Add Event</Link>
            </Button>
          }
          className="py-14"
        />
      ) : (
        <ul>
          {data.map((e) => (
            <EventRow key={e.id} event={e} onDelete={setToDelete} />
          ))}
        </ul>
      )}

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="ลบงานนี้?"
        description={`“${toDelete?.title || "งานนี้"}” จะหายจาก Exhibition และกู้คืนไม่ได้`}
        loading={remove.isPending}
        onConfirm={async () => {
          if (!toDelete) return;
          await remove.mutateAsync(toDelete.id).catch(() => undefined);
          setToDelete(null);
        }}
      />
    </StudioLayout>
  );
}
