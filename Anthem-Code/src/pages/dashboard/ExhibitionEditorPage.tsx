import { cardImageSrc } from "@/lib/mediaThumb";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera, CheckCircle2, Clock, Eye, ImagePlus, Loader2, Plus, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import SeoHead from "@/components/SeoHead";
import { TITLES } from "@/lib/i18n/pageTitles";
import {
  CategoryTag,
  EventGallery,
  EventMeta,
  EventSourceNote,
  OriginTag,
  PickTag,
  eventImages,
} from "@/components/exhibition/EventParts";
import QueryStatusPanel from "@/components/ui/QueryStatusPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import TeamEventPanel, { type TeamFields } from "@/components/exhibition/TeamEventPanel";
import {
  useEvent,
  useMyPublishedProjects,
  useSaveEvent,
  useSaveTeamEvent,
  useSubmitEvent,
  type ExtractedEvent,
} from "@/hooks/useExhibitionEvents";
import {
  EVENT_CATEGORIES,
  EVENT_LIMITS,
  emptyEventDraft,
  missingForSubmit,
  type EventDraft,
  type ExhibitionEvent,
} from "@/lib/exhibitionEvents";
import { uploadProjectImage } from "@/lib/uploadImage";
import { cn } from "@/lib/utils";
import { EventInsightsEditor } from "@/components/exhibition/EventInsights";
import TeamEventVenuesPanel from "@/components/exhibition/TeamEventVenuesPanel";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

function toDraft(e: ExhibitionEvent): EventDraft {
  const d = emptyEventDraft();
  (Object.keys(d) as (keyof EventDraft)[]).forEach((k) => {
    (d as Record<string, unknown>)[k] = e[k as keyof ExhibitionEvent] ?? d[k];
  });
  return d;
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 border-b border-border pb-8 last:border-0">
      <h2 className="font-display text-xl font-semibold text-foreground">
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : <span className="text-muted-foreground"> (ไม่บังคับ)</span>}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** One image picker button; uploads to the user's events folder and returns the public URL. */
function useImageUpload() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const upload = async (file: File | undefined): Promise<string | null> => {
    if (!file || !user) return null;
    setBusy(true);
    try {
      return await uploadProjectImage(file, user.id, "events");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดรูปไม่สำเร็จ");
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { busy, upload };
}

function PickImage({
  label,
  onFile,
  busy,
  className,
  children,
}: {
  label: string;
  onFile: (f: File | undefined) => void;
  busy: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        aria-label={label}
        className={cn(
          "flex items-center justify-center rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:opacity-60",
          className,
        )}
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : children}
      </button>
      <input
        ref={ref}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </>
  );
}

/** `team`: the admin editor for SameCor's own events (original / curated), published by the team directly. */
export default function ExhibitionEditorPage({ team = false }: { team?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: existing, isLoading, isError, refetch } = useEvent(id);
  const { data: myWorks = [] } = useMyPublishedProjects();
  const save = useSaveEvent();
  const saveTeam = useSaveTeamEvent();
  const submit = useSubmitEvent();
  const [teamFields, setTeamFields] = useState<TeamFields>({ origin: "curated", source_name: null, source_url: null });
  const cover = useImageUpload();
  const gallery = useImageUpload();
  const logo = useImageUpload();

  const [draft, setDraft] = useState<EventDraft>(emptyEventDraft);
  const [eventId, setEventId] = useState<string | null>(id ?? null);
  const [submitted, setSubmitted] = useState(false);
  const [hasSponsor, setHasSponsor] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setDraft(toDraft(existing));
    setHasSponsor(existing.sponsors.length > 0);
    if (existing.origin !== "community") {
      setTeamFields({ origin: existing.origin, source_name: existing.source_name, source_url: existing.source_url });
    }
  }, [existing]);

  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const locked = !team && existing?.status === "pending";
  const wasPublished = !team && existing?.status === "published";
  const busy = save.isPending || submit.isPending || saveTeam.isPending;
  const backTo = team ? "/admin/events" : "/dashboard/exhibition";

  /** AI draft → form. Only fields the page stated; everything else stays empty ("not specified"). */
  const applyExtracted = (x: ExtractedEvent["draft"]) => {
    setDraft((d) => ({
      ...d,
      ...Object.fromEntries(Object.entries(x).filter(([k]) => k in d && k !== "sponsors")),
      sponsors: (x.sponsors ?? []).map((s) => ({ name: s.name, ...(s.note ? { note: s.note } : {}) })),
      registration_open: !!x.registration_url,
    }));
    setHasSponsor((x.sponsors ?? []).length > 0);
  };

  const saveTeamEvent = async (publish: boolean) => {
    if (teamFields.origin === "curated" && (!teamFields.source_name?.trim() || !teamFields.source_url?.trim())) {
      toast.error("งาน Curated ต้องมีแหล่งที่มาและลิงก์ต้นทาง");
      return;
    }
    if (publish) {
      const missing = missingForSubmit({ ...draft, cover_url: draft.cover_url ?? "optional-for-team" });
      if (missing.length) {
        toast.error(`กรอกให้ครบก่อนเผยแพร่: ${missing.join(", ")}`);
        return;
      }
    }
    try {
      const saved = await saveTeam.mutateAsync({ id: eventId, draft: { ...payload(), ...teamFields }, publish });
      setEventId(saved);
      if (!id) navigate(`/admin/events/${saved}/edit`, { replace: true });
      if (publish) navigate(`/exhibition/${saved}`);
    } catch {
      /* toast from the hook */
    }
  };

  const payload = (): EventDraft => ({ ...draft, sponsors: hasSponsor ? draft.sponsors.filter((s) => s.name.trim()) : [] });

  const persist = async (): Promise<string | null> => {
    try {
      const saved = await save.mutateAsync({ id: eventId, draft: payload() });
      setEventId(saved);
      if (!id) navigate(`/dashboard/exhibition/${saved}/edit`, { replace: true });
      return saved;
    } catch {
      return null;
    }
  };

  const saveDraft = async () => {
    if (await persist()) toast.success(wasPublished ? "บันทึกแล้ว — งานกลับไปรอตรวจ" : "บันทึกร่างแล้ว");
  };

  const sendForReview = async () => {
    const missing = missingForSubmit(draft);
    if (missing.length) {
      toast.error(`กรอกให้ครบก่อนส่ง: ${missing.join(", ")}`);
      return;
    }
    const saved = await persist();
    if (!saved) return;
    if (wasPublished) {
      // event_save already moved an edited published event back to the queue.
      setSubmitted(true);
      return;
    }
    try {
      await submit.mutateAsync(saved);
      setSubmitted(true);
    } catch {
      /* toast from the hook */
    }
  };

  if (id && (isLoading || isError)) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <QueryStatusPanel isLoading={isLoading} isError={isError} onRetry={() => void refetch()} errorTitle="โหลดงานนี้ไม่สำเร็จ" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="container mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-600" aria-hidden />
        <h1 className="mt-4 font-display text-3xl font-semibold text-foreground">Your event has been submitted</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          ทีม SAMECOR จะตรวจข้อมูลภายใน 1–3 วันทำการ และแจ้งเตือนคุณเมื่อเผยแพร่แล้ว ระหว่างนี้งานจะถูกล็อกไม่ให้แก้ไข
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/dashboard/exhibition">กลับไป My Exhibition</Link>
        </Button>
      </div>
    );
  }

  const previewEvent = {
    ...(existing ?? ({} as ExhibitionEvent)),
    ...payload(),
    id: eventId ?? "preview",
    is_pick: existing?.is_pick ?? false,
  } as ExhibitionEvent;

  return (
    <div className="container mx-auto max-w-6xl px-4 pb-32 pt-6">
      <SeoHead title={id ? TITLES.editExhibition : "Add New Event"} path={backTo} noindex />
      <Link to={backTo} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {team ? "Back to Events (Admin)" : "Back to My Exhibition"}
      </Link>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        {id ? "Edit Event" : team ? "Add Team Event" : "Add New Event"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {team
          ? "งานที่ทีม SameCor จัดเอง หรือคัดมาจากผู้จัดภายนอก — เผยแพร่ได้ทันทีหลังตรวจ"
          : "แชร์นิทรรศการ อีเวนต์ หรือกิจกรรมสร้างสรรค์ของคุณกับชุมชน SAMECOR"}
      </p>

      {team ? (
        <div className="mt-6">
          <TeamEventPanel
            eventId={eventId}
            team={teamFields}
            onTeamChange={setTeamFields}
            title={draft.title}
            startsOn={draft.starts_on}
            onApply={applyExtracted}
          />
          {eventId ? <EventInsightsEditor eventId={eventId} /> : null}
          {eventId ? (
            <TeamEventVenuesPanel
              eventId={eventId}
              parent={{ starts_on: draft.starts_on, ends_on: draft.ends_on }}
              published={existing?.status === "published"}
            />
          ) : null}
        </div>
      ) : null}

      {locked ? (
        <p className="mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
          งานนี้อยู่ระหว่างตรวจ แก้ไขไม่ได้ — ถอนการส่งจาก My Exhibition ก่อนถ้าต้องแก้
        </p>
      ) : wasPublished ? (
        <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
          งานนี้เผยแพร่อยู่ ถ้าบันทึกการแก้ไข งานจะถูกซ่อนและกลับไปรอตรวจใหม่ (เปิด/ปิดลงทะเบียนและหาสปอนเซอร์ทำได้จาก My Exhibition โดยไม่ต้องตรวจใหม่)
        </p>
      ) : existing?.review_note ? (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-foreground">
          <span className="font-medium">ข้อความจากทีมตรวจ:</span> {existing.review_note}
        </p>
      ) : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <fieldset disabled={locked || busy} className="min-w-0 space-y-8">
          <Section n={1} title="Event Basic Info">
            <Field id="ev-title" label="Event Title" required>
              <div className="relative">
                <Input
                  id="ev-title"
                  value={draft.title}
                  maxLength={EVENT_LIMITS.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="เช่น Creative Visions 2026"
                  className="pr-16"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {draft.title.length}/{EVENT_LIMITS.title}
                </span>
              </div>
            </Field>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground" id="ev-cat-label">
                Event Category<span className="text-destructive"> *</span>
              </p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="ev-cat-label">
                {EVENT_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={draft.category === c.id}
                    onClick={() => set("category", c.id)}
                    className={cn(
                      "min-h-9 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2",
                      draft.category === c.id
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-foreground hover:border-foreground/50",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="ev-start" label="วันเริ่ม" required>
                <Input id="ev-start" type="date" value={draft.starts_on ?? ""} onChange={(e) => set("starts_on", e.target.value || null)} />
              </Field>
              <Field id="ev-end" label="วันจบ" required>
                <Input
                  id="ev-end"
                  type="date"
                  value={draft.ends_on ?? ""}
                  min={draft.starts_on ?? undefined}
                  onChange={(e) => set("ends_on", e.target.value || null)}
                />
              </Field>
            </div>
            <Field id="ev-time" label="เวลา" hint="เช่น 10:00 – 20:00 (ปิดวันจันทร์)">
              <Input id="ev-time" value={draft.time_note ?? ""} maxLength={60} onChange={(e) => set("time_note", e.target.value || null)} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="ev-loc" label="Location" required>
                <Input id="ev-loc" value={draft.location_name ?? ""} maxLength={120} onChange={(e) => set("location_name", e.target.value || null)} placeholder="ชื่อสถานที่ / เมือง หรือ Online" />
              </Field>
              <Field id="ev-loc-note" label="รายละเอียดสถานที่" hint="ชั้น ห้อง หรือการเดินทาง">
                <Input id="ev-loc-note" value={draft.location_note ?? ""} maxLength={120} onChange={(e) => set("location_note", e.target.value || null)} />
              </Field>
            </div>

            <Field id="ev-desc" label="Description" required hint="ย่อหน้าแรกจะแสดงเป็นคำโปรยใต้ชื่องาน">
              <Textarea
                id="ev-desc"
                rows={6}
                value={draft.description}
                maxLength={EVENT_LIMITS.description}
                onChange={(e) => set("description", e.target.value)}
              />
              <p className="text-right text-xs text-muted-foreground">
                {draft.description.length}/{EVENT_LIMITS.description}
              </p>
            </Field>

            <Field id="ev-org" label="Organizer" hint="ชื่อผู้จัดที่จะแสดงบนหน้างาน">
              <Input id="ev-org" value={draft.organizer_name ?? ""} maxLength={100} onChange={(e) => set("organizer_name", e.target.value || null)} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="ev-web" label="Event Website">
                <Input id="ev-web" type="url" inputMode="url" placeholder="https://" value={draft.website_url ?? ""} onChange={(e) => set("website_url", e.target.value || null)} />
              </Field>
              <Field id="ev-reg" label="Registration Link" hint="ลิงก์ย่อ (bit.ly ฯลฯ) ใช้ไม่ได้">
                <Input id="ev-reg" type="url" inputMode="url" placeholder="https://" value={draft.registration_url ?? ""} onChange={(e) => set("registration_url", e.target.value || null)} />
              </Field>
            </div>
            <label className="flex items-center gap-3 text-sm text-foreground">
              <Switch checked={draft.registration_open} onCheckedChange={(v) => set("registration_open", v)} />
              Open for Registration
            </label>
          </Section>

          <Section n={2} title="Media">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">
                  Cover Image<span className="text-destructive"> *</span>
                </p>
                {draft.cover_url ? (
                  <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                    <img src={cardImageSrc(draft.cover_url)} alt="รูปปก" className="h-full w-full object-cover" />
                    <div className="absolute bottom-2 right-2">
                      <PickImage
                        label="เปลี่ยนรูปปก"
                        busy={cover.busy}
                        onFile={async (f) => {
                          const url = await cover.upload(f);
                          if (url) set("cover_url", url);
                        }}
                        className="gap-1.5 border-solid border-transparent bg-foreground/80 px-3 py-1.5 text-xs font-medium text-background hover:bg-foreground hover:text-background"
                      >
                        <Camera className="h-3.5 w-3.5" aria-hidden /> Change Image
                      </PickImage>
                    </div>
                  </div>
                ) : (
                  <PickImage
                    label="อัปโหลดรูปปก"
                    busy={cover.busy}
                    onFile={async (f) => {
                      const url = await cover.upload(f);
                      if (url) set("cover_url", url);
                    }}
                    className="aspect-[4/3] w-full flex-col gap-2 text-sm"
                  >
                    <ImagePlus className="h-6 w-6" aria-hidden /> เพิ่มรูปปก
                  </PickImage>
                )}
                <p className="text-xs text-muted-foreground">JPG, PNG หรือ WebP · แนวนอนดูดีที่สุด</p>
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">
                  Gallery <span className="text-muted-foreground">(ไม่บังคับ, สูงสุด {EVENT_LIMITS.gallery} รูป)</span>
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {draft.gallery_urls.map((url, i) => (
                    <div key={url} className="group relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                      <img src={url} alt={`แกลเลอรีรูปที่ ${i + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => set("gallery_urls", draft.gallery_urls.filter((u) => u !== url))}
                        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-foreground/75 text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
                        aria-label={`เอารูปที่ ${i + 1} ออก`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {draft.gallery_urls.length < EVENT_LIMITS.gallery ? (
                    <PickImage
                      label="เพิ่มรูปในแกลเลอรี"
                      busy={gallery.busy}
                      onFile={async (f) => {
                        const url = await gallery.upload(f);
                        if (url) setDraft((d) => ({ ...d, gallery_urls: [...d.gallery_urls, url] }));
                      }}
                      className="aspect-[4/3]"
                    >
                      <Plus className="h-5 w-5" aria-hidden />
                    </PickImage>
                  ) : null}
                </div>
              </div>
            </div>
          </Section>

          <Section n={3} title="Additional Options">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2" role="radiogroup" aria-label="ค่าเข้างาน">
                <p className="text-sm font-medium text-foreground">Fee</p>
                <div className="flex gap-4">
                  {(team ? (["free", "paid", "unspecified"] as const) : (["free", "paid"] as const)).map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="radio"
                        name="ev-fee"
                        checked={draft.fee_type === v}
                        onChange={() => set("fee_type", v)}
                        className="h-4 w-4 accent-[hsl(var(--brand))]"
                      />
                      {v === "free" ? "Free" : v === "paid" ? "Paid Entry" : "ไม่ระบุ"}
                    </label>
                  ))}
                </div>
                {draft.fee_type === "paid" ? (
                  <>
                    <Input
                      aria-label="ค่าเข้างาน"
                      placeholder="เช่น ฿200 หรือ ฿1,500 รวมวัสดุ"
                      maxLength={60}
                      value={draft.fee_note ?? ""}
                      onChange={(e) => set("fee_note", e.target.value || null)}
                    />
                    <Input
                      aria-label="ลิงก์ซื้อบัตร"
                      type="url"
                      inputMode="url"
                      placeholder="ลิงก์ซื้อบัตร (ถ้าแยกจากหน้าลงทะเบียน) https://"
                      value={draft.ticket_url ?? ""}
                      onChange={(e) => set("ticket_url", e.target.value || null)}
                    />
                  </>
                ) : null}
                <p className="text-xs text-muted-foreground">แสดงข้อมูลเท่านั้น — SAMECOR ไม่ได้รับชำระเงิน</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Open for Sponsor</p>
                <label className="flex items-center gap-3 text-sm text-foreground">
                  <Switch checked={draft.open_for_sponsors} onCheckedChange={(v) => set("open_for_sponsors", v)} />
                  ให้ผู้สนับสนุนรู้ว่างานนี้กำลังหาสปอนเซอร์
                </label>
                <p className="text-xs text-muted-foreground">หน้างานจะมีปุ่มให้ทักแชตหาคุณ</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-4" role="radiogroup" aria-label="ผู้สนับสนุน">
                <p className="text-sm font-medium text-foreground">Sponsor</p>
                {[
                  [false, "No Sponsor"],
                  [true, "Add Sponsor"],
                ].map(([v, label]) => (
                  <label key={String(v)} className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      name="ev-sponsor"
                      checked={hasSponsor === v}
                      onChange={() => {
                        setHasSponsor(v as boolean);
                        if (v && draft.sponsors.length === 0) set("sponsors", [{ name: "" }]);
                      }}
                      className="h-4 w-4 accent-[hsl(var(--brand))]"
                    />
                    {label as string}
                  </label>
                ))}
              </div>
              {hasSponsor ? (
                <ul className="space-y-3">
                  {draft.sponsors.map((s, i) => (
                    <li key={i} className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[56px_minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-center">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt={`โลโก้ ${s.name || "ผู้สนับสนุน"}`} className="h-14 w-14 rounded-md border border-border bg-background object-contain" />
                      ) : (
                        <PickImage
                          label={`อัปโหลดโลโก้ผู้สนับสนุนรายที่ ${i + 1}`}
                          busy={logo.busy}
                          onFile={async (f) => {
                            const url = await logo.upload(f);
                            if (url) setDraft((d) => ({ ...d, sponsors: d.sponsors.map((x, j) => (j === i ? { ...x, logo_url: url } : x)) }));
                          }}
                          className="h-14 w-14"
                        >
                          <ImagePlus className="h-4 w-4" aria-hidden />
                        </PickImage>
                      )}
                      <Input
                        aria-label={`ชื่อผู้สนับสนุนรายที่ ${i + 1}`}
                        placeholder="ชื่อผู้สนับสนุน *"
                        maxLength={EVENT_LIMITS.sponsorName}
                        value={s.name}
                        onChange={(e) => setDraft((d) => ({ ...d, sponsors: d.sponsors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) }))}
                      />
                      <Input
                        aria-label={`สนับสนุนด้านใด รายที่ ${i + 1}`}
                        placeholder="สนับสนุนด้านใด (ไม่บังคับ) เช่น ไฟ งานพิมพ์ สถานที่"
                        maxLength={EVENT_LIMITS.sponsorNote}
                        value={s.note ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, sponsors: d.sponsors.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)) }))}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`ลบผู้สนับสนุนรายที่ ${i + 1}`}
                        onClick={() => setDraft((d) => ({ ...d, sponsors: d.sponsors.filter((_, j) => j !== i) }))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                  {draft.sponsors.length < EVENT_LIMITS.sponsors ? (
                    <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => set("sponsors", [...draft.sponsors, { name: "" }])}>
                      <Plus className="mr-1.5 h-4 w-4" aria-hidden /> เพิ่มผู้สนับสนุน
                    </Button>
                  ) : null}
                </ul>
              ) : null}
            </div>

            <div className={cn("space-y-2", team && "hidden")}>
              <p className="text-sm font-medium text-foreground">
                ผลงานที่จะแสดงในงาน <span className="text-muted-foreground">(ไม่บังคับ, สูงสุด {EVENT_LIMITS.projects} ชิ้น)</span>
              </p>
              {myWorks.length === 0 ? (
                <p className="text-xs text-muted-foreground">ยังไม่มีผลงานที่เผยแพร่ — ต้องมีอย่างน้อย 1 ชิ้นก่อนส่งตรวจ</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {myWorks.map((w) => {
                    const on = draft.project_ids.includes(w.id);
                    const full = !on && draft.project_ids.length >= EVENT_LIMITS.projects;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        aria-pressed={on}
                        disabled={full}
                        onClick={() => set("project_ids", on ? draft.project_ids.filter((p) => p !== w.id) : [...draft.project_ids, w.id])}
                        className={cn(
                          "relative overflow-hidden rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:opacity-40",
                          on && "ring-2 ring-foreground",
                        )}
                      >
                        <div className="aspect-[4/3] bg-muted">
                          {w.cover_url ? <img src={cardImageSrc(w.cover_url)} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
                        </div>
                        <p className="line-clamp-1 px-1 py-1 text-xs text-foreground">{w.title}</p>
                        {on ? <CheckCircle2 className="absolute right-1 top-1 h-5 w-5 fill-foreground text-background" aria-hidden /> : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Section>
        </fieldset>

        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="ตัวอย่าง">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <Eye className="h-4 w-4" aria-hidden /> Preview
            </p>
            <EventGallery images={eventImages(previewEvent)} title={previewEvent.title || "ตัวอย่าง"} />
            <div className="mt-3 flex flex-wrap gap-2">
              {previewEvent.is_pick ? <PickTag /> : null}
              <CategoryTag category={previewEvent.category} />
              {team ? <OriginTag origin={teamFields.origin} /> : null}
            </div>
            <p className="mt-2 font-display text-2xl font-semibold leading-tight text-foreground">
              {previewEvent.title || "ชื่องานของคุณ"}
            </p>
            <EventMeta event={previewEvent} className="mt-2" />
            <p className="mt-2 line-clamp-3 text-sm text-foreground/80">{previewEvent.description.split(/\n\s*\n/)[0]}</p>
            {previewEvent.sponsors.length ? (
              <p className="mt-3 text-xs text-muted-foreground">Sponsored by {previewEvent.sponsors.map((s) => s.name).join(", ")}</p>
            ) : null}
            {team ? (
              <EventSourceNote event={{ ...teamFields, source_checked_at: null }} className="mt-4" />
            ) : (
              <p className="mt-4 flex items-start gap-2 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                งานจะแสดงบน SAMECOR หลังทีมอนุมัติ · ใช้เวลาตรวจ 1–3 วันทำการ
              </p>
            )}
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {team ? (
          <div className="container mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Button type="button" variant="outline" className="rounded-full" disabled={busy} onClick={() => void saveTeamEvent(false)}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Save Draft
            </Button>
            <div className="flex items-center gap-3">
              <p className="hidden text-xs text-muted-foreground sm:block">ตรวจข้อมูลกับต้นทางแล้วจึงเผยแพร่</p>
              <Button type="button" className="rounded-full" disabled={busy} onClick={() => void saveTeamEvent(true)}>
                <Send className="mr-2 h-4 w-4" aria-hidden /> Publish
              </Button>
            </div>
          </div>
        ) : (
        <div className="container mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Button type="button" variant="outline" className="rounded-full" disabled={locked || busy} onClick={() => void saveDraft()}>
            {save.isPending && !submit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {wasPublished ? "Save Changes" : "Save Draft"}
          </Button>
          <div className="flex items-center gap-3">
            <p className="hidden text-xs text-muted-foreground sm:block">ทีมงานตรวจภายใน 1–3 วันทำการ</p>
            <Button type="button" className="rounded-full" disabled={locked || busy} onClick={() => void sendForReview()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Send className="mr-2 h-4 w-4" aria-hidden />}
              Submit for Review
            </Button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
