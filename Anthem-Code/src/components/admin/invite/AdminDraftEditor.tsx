import { useState } from "react";
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ImagePlus, Images, Loader2, Trash2, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  INVITE_DISCIPLINES,
  MAX_IMAGES_PER_PROJECT,
  inviteCall,
  type InviteMedia,
  type InviteSubmission,
  type MediaSlot,
} from "@/lib/creatorInvite";
import { isAdminDemo } from "@/lib/creatorInviteAdminDemo";
import { cn } from "@/lib/utils";

type Props = {
  invitationId: string;
  draft: InviteSubmission;
  setDraft: (d: InviteSubmission) => void;
  media: Map<string, InviteMedia>;
  addMedia: (m: InviteMedia) => void;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
};

/** Team-side upload into the private invite bucket (same type/size checks as the artist form). */
async function adminUpload(invitationId: string, slot: MediaSlot, file: File): Promise<InviteMedia> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("JPG / PNG / WebP เท่านั้น");
  if (file.size > 20 * 1024 * 1024) throw new Error("ไฟล์เกิน 20 MB");
  if (isAdminDemo()) {
    return { id: crypto.randomUUID(), slot, mime: file.type, size_bytes: file.size, scan_status: "clean", url: URL.createObjectURL(file) };
  }
  const signed = await inviteCall<{ media_id: string; bucket: string; path: string; token: string }>("creator-invite-admin", {
    action: "media_upload_url",
    id: invitationId,
    slot,
    mime: file.type,
    size: file.size,
  });
  const { error } = await supabase.storage.from(signed.bucket).uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
  if (error) throw new Error("อัปโหลดไม่สำเร็จ");
  const done = await inviteCall<{ url: string | null }>("creator-invite-admin", { action: "media_upload_done", id: invitationId, media_id: signed.media_id });
  return { id: signed.media_id, slot, mime: file.type, size_bytes: file.size, scan_status: "clean", url: done.url };
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-admin-muted">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Tile({ id, url, round, cover, onRemove, sortable }: { id: string; url: string | null; round?: boolean; cover?: boolean; onRemove: () => void; sortable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !sortable });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative h-20 w-20 shrink-0 select-none overflow-hidden bg-admin-surface",
        round ? "rounded-full" : "rounded-sm",
        sortable && "cursor-grab touch-manipulation active:cursor-grabbing",
        isDragging && "z-10 ring-2 ring-admin-accent",
      )}
      {...(sortable ? { ...attributes, ...listeners } : {})}
    >
      {url ? <img src={url} alt="" draggable={false} className="pointer-events-none h-full w-full object-cover" /> : null}
      {cover ? <span className="absolute bottom-1 left-1 rounded-sm bg-admin-accent px-1.5 py-0.5 text-[9px] font-semibold text-admin-bg">ปก</span> : null}
      <button
        type="button"
        aria-label="เอาออก"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-full bg-admin-bg/90 p-1 text-admin-fg"
      >
        <X className="h-3 w-3" aria-hidden />
      </button>
    </div>
  );
}

function ImagePicker({
  label,
  ids,
  max,
  round,
  media,
  onChange,
  onUpload,
  uploading,
  pool,
}: {
  label: string;
  ids: string[];
  max: number;
  round?: boolean;
  media: Map<string, InviteMedia>;
  onChange: (ids: string[]) => void;
  onUpload: (files: FileList | null) => void;
  uploading: boolean;
  /** images already in this invitation that could be used here */
  pool: InviteMedia[];
}) {
  const [picking, setPicking] = useState(false);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    onChange(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };
  const available = pool.filter((m) => !ids.includes(m.id) && m.url);
  const canAdd = ids.length < max;
  return (
    <div className="space-y-2">
      <p className="text-xs text-admin-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            {ids.map((id, i) => (
              <Tile
                key={id}
                id={id}
                url={media.get(id)?.url ?? null}
                round={round}
                cover={max > 1 && i === 0 && ids.length > 1}
                sortable={max > 1}
                onRemove={() => onChange(ids.filter((x) => x !== id))}
              />
            ))}
          </SortableContext>
        </DndContext>
        {canAdd ? (
          <label
            className={cn(
              "flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-admin-border text-[10px] text-admin-muted hover:text-admin-fg",
              round ? "rounded-full" : "rounded-sm",
              uploading && "pointer-events-none opacity-60",
            )}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
            อัปโหลด
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple={max > 1}
              className="sr-only"
              onChange={(e) => {
                onUpload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        ) : null}
        {canAdd && available.length ? (
          <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setPicking((v) => !v)}>
            {picking ? "ปิด" : `เลือกจากรูปที่ศิลปินส่ง (${available.length})`}
          </Button>
        ) : null}
      </div>
      {picking && canAdd ? (
        <div className="flex flex-wrap gap-2 rounded-sm border border-admin-border p-2">
          {available.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(max === 1 ? [m.id] : [...ids, m.id].slice(0, max))}
              className="h-16 w-16 overflow-hidden rounded-sm ring-admin-accent hover:ring-2"
              aria-label="ใช้รูปนี้"
            >
              <img src={m.url!} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      {max > 1 && ids.length > 1 ? <p className="text-[10px] text-admin-muted">ลากเพื่อสลับลำดับ · รูปแรกเป็นปกการ์ด</p> : null}
    </div>
  );
}

/** The team edits the profile draft the same way the artist filled the form, images included. */
export default function AdminDraftEditor({ invitationId, draft, setDraft, media, addMedia, saving, onSave, onReset }: Props) {
  const [uploading, setUploading] = useState<string | null>(null);
  const pool = [...media.values()].filter((m) => m.scan_status === "clean");
  const setAbout = (k: keyof InviteSubmission["about"], v: string | null) => setDraft({ ...draft, about: { ...draft.about, [k]: v } });
  const setProject = (i: number, p: Partial<InviteSubmission["projects"][number]>) =>
    setDraft({ ...draft, projects: draft.projects.map((x, j) => (j === i ? { ...x, ...p } : x)) });

  async function upload(key: string, slot: MediaSlot, files: FileList | null, apply: (ids: string[]) => void, current: string[], max: number) {
    if (!files?.length) return;
    setUploading(key);
    const added: string[] = [];
    try {
      for (const f of Array.from(files).slice(0, Math.max(0, max - current.length))) {
        try {
          const m = await adminUpload(invitationId, slot, f);
          addMedia(m);
          added.push(m.id);
        } catch (e) {
          toast.error(`${f.name}: ${(e as Error).message}`);
        }
      }
      if (added.length) apply(max === 1 ? added.slice(-1) : [...current, ...added]);
    } finally {
      setUploading(null);
    }
  }

  return (
    <section className="space-y-6 rounded-sm border border-admin-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-admin-fg">Draft ที่จะส่งให้ศิลปินตรวจ</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onReset}>
            ยกเลิกการแก้
          </Button>
          <Button size="sm" disabled={saving} onClick={onSave}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            บันทึก Draft
          </Button>
        </div>
      </div>

      {/* About */}
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm font-medium text-admin-fg">
          <UserRound className="h-4 w-4 text-admin-accent" aria-hidden /> เกี่ยวกับศิลปิน
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="d-name" label="ชื่อ / ชื่อศิลปิน">
            <Input id="d-name" value={draft.about.name} onChange={(e) => setAbout("name", e.target.value)} />
          </Field>
          <Field id="d-disc" label="สาขา">
            <Select value={draft.about.discipline} onValueChange={(v) => setAbout("discipline", v)}>
              <SelectTrigger id="d-disc">
                <SelectValue placeholder="เลือกสาขา" />
              </SelectTrigger>
              <SelectContent>
                {INVITE_DISCIPLINES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="d-city" label="เมือง / ประเทศ">
            <Input id="d-city" value={draft.about.city} onChange={(e) => setAbout("city", e.target.value)} />
          </Field>
          <Field id="d-links" label="เว็บไซต์ / โซเชียล (บรรทัดละลิงก์)">
            <Textarea id="d-links" rows={2} value={draft.about.links} onChange={(e) => setAbout("links", e.target.value)} />
          </Field>
        </div>
        <Field id="d-bio" label="แนะนำตัว (ไม่เกิน 300 ตัวอักษร)">
          <Textarea id="d-bio" rows={3} maxLength={300} value={draft.about.bio} onChange={(e) => setAbout("bio", e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
          <ImagePicker
            label="รูปโปรไฟล์"
            ids={draft.about.avatar ? [draft.about.avatar] : []}
            max={1}
            round
            media={media}
            pool={pool}
            uploading={uploading === "avatar"}
            onChange={(ids) => setAbout("avatar", ids[0] ?? null)}
            onUpload={(f) => void upload("avatar", "avatar", f, (ids) => setAbout("avatar", ids[0] ?? null), [], 1)}
          />
          <ImagePicker
            label="รูปปก"
            ids={draft.about.cover ? [draft.about.cover] : []}
            max={1}
            media={media}
            pool={pool}
            uploading={uploading === "cover"}
            onChange={(ids) => setAbout("cover", ids[0] ?? null)}
            onUpload={(f) => void upload("cover", "cover", f, (ids) => setAbout("cover", ids[0] ?? null), [], 1)}
          />
        </div>
      </div>

      {/* Projects */}
      {draft.projects.map((p, i) => (
        <div key={p.slot} className="space-y-4 border-t border-admin-border pt-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-display text-base font-semibold text-admin-fg">
              <Images className="h-4 w-4 text-admin-accent" aria-hidden /> Project {i + 1}
            </p>
            {draft.projects.length > 1 ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-admin-muted hover:text-destructive"
                aria-label={`เอา Project ${i + 1} ออก`}
                onClick={() => setDraft({ ...draft, projects: draft.projects.filter((_, j) => j !== i) })}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`d-p${i}-t`} label="ชื่อผลงาน">
              <Input id={`d-p${i}-t`} value={p.title} onChange={(e) => setProject(i, { title: e.target.value })} />
            </Field>
            <Field id={`d-p${i}-r`} label="บทบาท / เครดิต">
              <Input id={`d-p${i}-r`} value={p.role} onChange={(e) => setProject(i, { role: e.target.value })} />
            </Field>
          </div>
          <Field id={`d-p${i}-d`} label="คำอธิบาย">
            <Textarea id={`d-p${i}-d`} rows={3} value={p.description} onChange={(e) => setProject(i, { description: e.target.value })} />
          </Field>
          <Field id={`d-p${i}-u`} label="ลิงก์โปรเจกต์">
            <Input id={`d-p${i}-u`} value={p.url} placeholder="https://" onChange={(e) => setProject(i, { url: e.target.value })} />
          </Field>
          <ImagePicker
            label={`รูปผลงาน (สูงสุด ${MAX_IMAGES_PER_PROJECT} รูป)`}
            ids={p.media}
            max={MAX_IMAGES_PER_PROJECT}
            media={media}
            pool={pool}
            uploading={uploading === p.slot}
            onChange={(ids) => setProject(i, { media: ids })}
            onUpload={(f) => void upload(p.slot, p.slot, f, (ids) => setProject(i, { media: ids }), p.media, MAX_IMAGES_PER_PROJECT)}
          />
        </div>
      ))}
      <p className="text-[11px] text-admin-muted">ใช้เฉพาะรูปที่ศิลปินส่งมาหรืออนุญาตแล้ว · ไม่ดึงรูปจากเว็บอื่นมาใส่เอง</p>
    </section>
  );
}
