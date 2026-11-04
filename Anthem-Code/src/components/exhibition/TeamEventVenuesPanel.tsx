import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Pencil, Pin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteVenue,
  useEventFeature,
  useEventVenues,
  useReorderVenues,
  useSaveVenue,
  useSetEventFeatured,
} from "@/hooks/useEventVenues";
import {
  emptyVenueDraft,
  formatOpeningHours,
  parseOpeningHours,
  venueToDraft,
  type EventVenue,
  type VenueDraft,
} from "@/lib/eventVenues";

type Parent = { starts_on: string | null; ends_on: string | null };

function TextField({
  label,
  value,
  onChange,
  placeholder,
  max,
  type = "text",
}: {
  label: string;
  value: string | number | null;
  onChange: (v: string) => void;
  placeholder?: string;
  max?: number;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={value ?? ""}
        maxLength={max}
        placeholder={placeholder}
        step={type === "number" ? "any" : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

const nn = (s: string) => (s.trim() ? s : null);

function VenueForm({
  initial,
  parent,
  busy,
  onSave,
  onCancel,
}: {
  initial: VenueDraft;
  parent: Parent;
  busy: boolean;
  onSave: (d: VenueDraft) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState<VenueDraft>(initial);
  const [hoursText, setHoursText] = useState(formatOpeningHours(initial.opening_hours));
  const set = <K extends keyof VenueDraft>(k: K, v: VenueDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const num = (s: string) => (s.trim() === "" ? null : Number(s));

  const submit = () => {
    const hours = parseOpeningHours(hoursText);
    if (!hours) {
      toast.error('อ่านเวลาเปิด–ปิดไม่ได้ — ใช้รูปแบบ "mon-sat 09:00-18:00" บรรทัดละช่วง');
      return;
    }
    if (!d.title.trim()) {
      toast.error("ใส่ชื่อสถานที่");
      return;
    }
    onSave({ ...d, opening_hours: hours });
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="ชื่อสถานที่ (ไทย) *" value={d.title} max={100} onChange={(v) => set("title", v)} />
        <TextField label="ชื่ออังกฤษ" value={d.name_en} max={120} onChange={(v) => set("name_en", nn(v))} />
        <TextField label="ย่าน (ใช้จัดกลุ่มเส้นทาง)" value={d.area} max={60} placeholder="เช่น ปทุมวัน–สยาม" onChange={(v) => set("area", nn(v))} />
        <TextField label="BTS / MRT ใกล้สุด" value={d.transit_note} max={80} placeholder="เช่น BTS สยาม" onChange={(v) => set("transit_note", nn(v))} />
      </div>
      <TextField label="ที่อยู่" value={d.address} max={200} onChange={(v) => set("address", nn(v))} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">เวลาเปิด–ปิด (ใช้คำนวณ "เปิดอยู่ตอนนี้")</Label>
          <Textarea
            rows={3}
            value={hoursText}
            placeholder={"mon-sat 09:00-18:00\nsun 08:00-17:00"}
            onChange={(e) => setHoursText(e.target.value)}
            className="font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">บรรทัดละช่วง: mon–sun หรือ จ อ พ พฤ ศ ส อา, หรือ daily</p>
        </div>
        <div className="space-y-3">
          <TextField label="เวลาเปิด (ข้อความที่แสดง)" value={d.hours_note} max={120} placeholder="จ.–ส. 09.00–18.00" onChange={(v) => set("hours_note", nn(v))} />
          <TextField label="วันปิด" value={d.closed_note} max={80} placeholder="ปิดวันจันทร์" onChange={(v) => set("closed_note", nn(v))} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField label="วันเริ่ม" type="date" value={d.starts_on} onChange={(v) => set("starts_on", nn(v))} />
        <TextField label="วันจบ" type="date" value={d.ends_on} onChange={(v) => set("ends_on", nn(v))} />
        <TextField label="หมายเหตุวันที่ (ถ้ายังไม่ประกาศ)" value={d.date_note} max={80} placeholder="เปิดช่วง พ.ย. · รอประกาศวัน" onChange={(v) => set("date_note", nn(v))} />
      </div>
      {parent.starts_on && (d.starts_on !== parent.starts_on || d.ends_on !== parent.ends_on) ? (
        <button
          type="button"
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          onClick={() => setD((x) => ({ ...x, starts_on: parent.starts_on, ends_on: parent.ends_on }))}
        >
          ใช้วันเดียวกับงานหลัก
        </button>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="ค่าเข้าชม / หมายเหตุ" value={d.admission_note} max={160} onChange={(v) => set("admission_note", nn(v))} />
        <TextField label="ลิงก์แหล่งข้อมูล (https://)" value={d.source_url} onChange={(v) => set("source_url", nn(v))} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <TextField label="Latitude" type="number" value={d.lat} onChange={(v) => set("lat", num(v))} />
        <TextField label="Longitude" type="number" value={d.lng} onChange={(v) => set("lng", num(v))} />
        <label className="flex items-center gap-2 pb-2 text-xs text-muted-foreground">
          <Switch checked={d.coords_approx} onCheckedChange={(v) => set("coords_approx", v)} /> พิกัดโดยประมาณ
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <label className="flex items-center gap-2">
          <Switch checked={d.is_special} onCheckedChange={(v) => set("is_special", v)} /> โปรเจกต์พิเศษ (ไม่นับรวมจำนวนสถานที่)
        </label>
        <label className="flex items-center gap-2">
          <Switch checked={d.fee_type === "free"} onCheckedChange={(v) => set("fee_type", v ? "free" : "unspecified")} /> เข้าชมฟรี
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" className="rounded-full" disabled={busy} onClick={submit}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} บันทึกสถานที่
        </Button>
        <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={onCancel}>
          ยกเลิก
        </Button>
      </div>
    </div>
  );
}

function FeaturePin({ eventId, published }: { eventId: string; published: boolean }) {
  const { data: feature } = useEventFeature(eventId);
  const setFeatured = useSetEventFeatured();
  const [until, setUntil] = useState("");
  useEffect(() => setUntil(feature?.featured_until ?? ""), [feature?.featured_until]);
  const on = !!feature?.is_featured;
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
      <div className="min-w-[12rem] flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Pin className="h-4 w-4" aria-hidden /> อีเวนต์เด่น (แบนเนอร์บนสุดของ Exhibition)
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {on ? "ปักหมุดอยู่" : "ปักได้ทีละงาน — ปักงานนี้จะเอางานเดิมออกให้"}
          {!published ? " · เผยแพร่งานก่อนจึงปักหมุดได้" : ""}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">ปักถึงวันที่ (ไม่บังคับ)</Label>
        <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="w-44" />
      </div>
      <Button
        type="button"
        size="sm"
        variant={on ? "outline" : "default"}
        className="rounded-full"
        disabled={!published || setFeatured.isPending}
        onClick={() => setFeatured.mutate({ id: eventId, on: true, until: until || null })}
      >
        {on ? "อัปเดตวันที่" : "ปักหมุด"}
      </Button>
      {on ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="rounded-full"
          disabled={setFeatured.isPending}
          onClick={() => setFeatured.mutate({ id: eventId, on: false, until: null })}
        >
          เลิกปักหมุด
        </Button>
      ) : null}
    </div>
  );
}

/** Team editor: pin as featured, and manage the event's venues (add / edit / remove / reorder). */
export default function TeamEventVenuesPanel({
  eventId,
  parent,
  published,
}: {
  eventId: string;
  parent: Parent;
  published: boolean;
}) {
  const { data: venues = [], isLoading } = useEventVenues(eventId);
  const save = useSaveVenue();
  const remove = useDeleteVenue();
  const reorder = useReorderVenues();
  const [editing, setEditing] = useState<string | "new" | null>(null);

  const move = (i: number, dir: -1 | 1) => {
    const ids = venues.map((v) => v.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder.mutate({ parentId: eventId, ids });
  };

  const onSave = (id: string | null) => (draft: VenueDraft) =>
    save.mutate({ parentId: eventId, id, draft }, { onSuccess: () => setEditing(null) });

  const onDelete = (v: EventVenue) => {
    if (window.confirm(`ลบ "${v.title}" ออกจากงานนี้? คนที่กดสนใจสถานที่นี้จะไม่ได้รับการเตือนอีก`)) remove.mutate(v.id);
  };

  return (
    <section className="mt-6 space-y-4 rounded-xl border border-border p-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">อีเวนต์เด่น & สถานที่ย่อย</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          สถานที่ย่อยมีปุ่มสนใจ การเตือน และ Google Calendar ของตัวเอง — แสดงเป็นแผนที่ปักหมุดบนหน้างาน
        </p>
      </div>

      <FeaturePin eventId={eventId} published={published} />

      {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden /> : null}
      {venues.length ? (
        <ol className="divide-y divide-border rounded-lg border border-border">
          {venues.map((v, i) =>
            editing === v.id ? (
              <li key={v.id} className="p-2">
                <VenueForm
                  initial={venueToDraft(v)}
                  parent={parent}
                  busy={save.isPending}
                  onSave={onSave(v.id)}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={v.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">{v.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {[v.area, v.hours_note, v.lat == null ? "ไม่มีพิกัด" : null, v.is_special ? "พิเศษ" : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <Button type="button" size="icon" variant="ghost" aria-label="เลื่อนขึ้น" disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="เลื่อนลง"
                  disabled={i === venues.length - 1 || reorder.isPending}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" aria-label={`แก้ไข ${v.title}`} onClick={() => setEditing(v.id)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" aria-label={`ลบ ${v.title}`} disabled={remove.isPending} onClick={() => onDelete(v)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ),
          )}
        </ol>
      ) : null}

      {editing === "new" ? (
        <VenueForm
          initial={emptyVenueDraft(parent)}
          parent={parent}
          busy={save.isPending}
          onSave={onSave(null)}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" aria-hidden /> เพิ่มสถานที่
        </Button>
      )}
    </section>
  );
}
