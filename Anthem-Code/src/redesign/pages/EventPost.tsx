import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@/core/subscription";
import { useAuth } from "@/hooks/useAuth";
import { isEventUuid } from "@/lib/exhibitionEvents";
import { EVENT_FILE_MAX_BYTES, EVENT_FOLDER, saveEvent, submitEvent, uploadEventPdf, uploadEventPicture } from "@/server/mutations/eventPost";
import { getMyEvent, type MyEventRow } from "@/server/queries/eventPost";
import logoUrl from "../assets/logo.svg";
import { EpLeaveDialog, EpPublishedDialog } from "../eventpost/EventPostDialogs";
import EventPostPreview from "../eventpost/EventPostPreview";
import { checksOf, EP_LIMITS, EP_TYPES, emptyForm, fileSize, fromRow, snapshot, toSaveData, type EpForm, type EpType } from "../eventpost/model";
import { mapsSearchUrl } from "../event/eventSummary";
import ScLoader from "../main/ScLoader";
import { SC_LINKS } from "../routes";
import { ErrorRow, ImageAddIcon, mediaSrc, Progress } from "../upload/BasicEditor";
import type { Media } from "../upload/model";
import { ConfirmDialog } from "../upload/UploadOverlays";
import { useWorkUploads } from "../upload/useWorkUploads";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/reset.css";
import "../styles/upload.css";
import "../styles/event.css";
import "../styles/event-post.css";

/** Events this tab created and is still editing: their /:id/edit URL must not load them again. */
const liveCreated = new Set<string>();
/** × / "กลับ My Studio" land on the Event tab (mock scStudioTab "Exhibition"). */
const STUDIO_EVENTS = `${SC_LINKS.myStudio}?tab=event`;
const ACCEPT_PIC = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif";
const TOO_BIG = "ไฟล์เกิน 10 MB";
const SAVE_FAILED = "บันทึกไม่สำเร็จ ลองอีกครั้ง";
/** Messages of event_save / event_submit are written for people (Thai); anything else gets the plain line. */
const errText = (e: unknown) => {
  const m = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
  return /[฀-๿]/.test(m) ? m : SAVE_FAILED;
};
const isPicture = (f: File) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name);

export default function EventPostPage() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  if (loading) return <div className="ep-wait" aria-busy="true" />;
  if (!user) return <Navigate to={`${SC_LINKS.login}?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  const editId = id && !liveCreated.has(id) ? id : null;
  return <EventPostLoader key={editId ?? "new"} uid={user.id} editId={editId} />;
}

function EventPostLoader({ uid, editId }: { uid: string; editId: string | null }) {
  const q = useQuery({
    queryKey: ["sc-event-post", editId],
    queryFn: () => getMyEvent(editId!, uid),
    enabled: !!editId && isEventUuid(editId),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  if (!editId) return <EventPostEditor uid={uid} row={null} />;
  if (!isEventUuid(editId)) return <Navigate to="/error/404" replace />;
  if (q.isPending) {
    return (
      <div className="ep-wait">
        <ScLoader label="กำลังโหลดอีเว้นท์" />
      </div>
    );
  }
  if (q.isError || !q.data) return <Navigate to="/error/404" replace />;
  return <EventPostEditor uid={uid} row={q.data} />;
}

const Dot = () => <span aria-hidden="true" className="ep-req" />;
const X = ({ w = 1.5, s = 14 }: { w?: number; s?: number }) => (
  <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
const Chevron = ({ up }: { up?: boolean }) => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={up ? "M6 14.5l6-6 6 6" : "M6 9.5l6 6 6-6"} />
  </svg>
);
const Plus = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

function Label({ htmlFor, miss, children }: { htmlFor?: string; miss?: boolean; children: ReactNode }) {
  return htmlFor ? (
    <label htmlFor={htmlFor} className="ep-lab" data-miss={miss ? "" : undefined}>
      {children}
    </label>
  ) : (
    <span className="ep-lab" data-miss={miss ? "" : undefined}>
      {children}
    </span>
  );
}

type Status = "new" | MyEventRow["status"];

function EventPostEditor({ uid, row }: { uid: string; row: MyEventRow | null }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { tier } = useSubscription();
  const opened = useMemo(() => (row ? fromRow(row) : null), [row]);
  const [form, setForm] = useState<EpForm>(() => opened?.form ?? emptyForm());
  const up = useWorkUploads(uid, EVENT_FOLDER, opened?.media ?? {}, { maxBytes: EVENT_FILE_MAX_BYTES, tooBig: TOO_BIG, upload: uploadEventPicture });
  const media = up.media;
  const [status, setStatus] = useState<Status>(row?.status ?? "new");
  const eventId = useRef<string | null>(row?.id ?? null);
  const [base, setBase] = useState(() => snapshot(opened?.form ?? emptyForm(), opened?.media ?? {}));
  const [moreOpen, setMoreOpen] = useState(!!opened?.moreOpen);
  const [tried, setTried] = useState(false);
  const [pvOpen, setPvOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [agree, setAgree] = useState(false);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const [published, setPublished] = useState<"new" | "edit" | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState<"cover" | "details" | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);
  const say = useCallback((t: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const set = (p: Partial<EpForm>) => setForm((f) => ({ ...f, ...p }));
  const live = useRef(form);
  useLayoutEffect(() => {
    live.current = form;
  });
  useEffect(() => {
    const id = eventId.current;
    return () => {
      if (id) liveCreated.delete(id);
    };
  }, []);

  const isEditPub = status === "published" || status === "pending";
  const isOC = form.type === "Open Call";
  const isVenue = form.place === "Venue";
  const isPaid = form.fee === "Paid";
  const checks = checksOf(form);
  const miss = (k: keyof typeof checks.ok) => tried && !checks.ok[k];
  const dirty = snapshot(form, media) !== base;
  const pubLabel = isEditPub ? "บันทึกการแก้ไข" : "Publish";

  // Closing the tab with something unsaved or a running upload asks first.
  const guard = (dirty && !published) || up.uploading;
  useEffect(() => {
    if (!guard) return;
    const f = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [guard]);

  // The page behind the preview does not scroll (only html is locked, see Work overlay).
  useEffect(() => {
    if (!pvOpen) return;
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => {
      el.style.overflow = prev;
    };
  }, [pvOpen]);

  // ---------- pictures ----------
  const seq = useRef(0);
  const nid = () => `m${Date.now().toString(36)}${(seq.current += 1)}`;
  const coverInput = useRef<HTMLInputElement>(null);
  const detailInput = useRef<HTMLInputElement>(null);
  const insertAt = useRef<number | null>(null);

  const addCover = (file: File | undefined) => {
    if (!file || !isPicture(file)) return;
    const id = nid();
    up.start(id, file);
    set({ coverId: id });
  };
  const addDetails = (files: File[], at: number | null) => {
    const pics = files.filter(isPicture);
    if (!pics.length) return;
    const ids = pics.map((file) => {
      const id = nid();
      up.start(id, file);
      return id;
    });
    setForm((f) => {
      const pos = at == null ? f.details.length : Math.min(at, f.details.length);
      return { ...f, details: [...f.details.slice(0, pos), ...ids, ...f.details.slice(pos)] };
    });
  };
  const pickDetails = (at: number | null) => {
    insertAt.current = at;
    detailInput.current?.click();
  };
  const moveDetail = (i: number, k: number) =>
    setForm((f) => {
      const j = i + k;
      if (j < 0 || j >= f.details.length) return f;
      const a = f.details.slice();
      [a[i], a[j]] = [a[j], a[i]];
      return { ...f, details: a };
    });
  const removeDetail = (id: string) => setForm((f) => ({ ...f, details: f.details.filter((x) => x !== id) }));
  const onDrop = (kind: "cover" | "details") => (e: DragEvent) => {
    e.preventDefault();
    setDragging(null);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (kind === "cover") addCover(files.find(isPicture));
    else addDetails(files, null);
  };
  const dragOn = (kind: "cover" | "details") => ({
    onDragOver: (e: DragEvent) => {
      if (!Array.from(e.dataTransfer.types).includes("Files")) return;
      e.preventDefault();
      if (dragging !== kind) setDragging(kind);
    },
    onDragLeave: () => setDragging(null),
    onDrop: onDrop(kind),
  });

  // ---------- PDF (More) ----------
  const pdfJob = useRef<Promise<void> | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const onPdf = (file: File | undefined) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") return say("เลือกไฟล์ PDF");
    if (file.size > EVENT_FILE_MAX_BYTES) return say(TOO_BIG);
    const size = fileSize(file.size);
    set({ pdf: { name: file.name, url: "", size } });
    setPdfBusy(true);
    const job = uploadEventPdf(file, uid, tier)
      .then((url) => setForm((f) => (f.pdf && f.pdf.name === file.name && !f.pdf.url ? { ...f, pdf: { name: file.name, url, size } } : f)))
      .catch(() => {
        setForm((f) => (f.pdf && !f.pdf.url ? { ...f, pdf: null } : f));
        say("อัปโหลด PDF ไม่สำเร็จ");
      })
      .finally(() => {
        setPdfBusy(false);
        pdfJob.current = null;
      });
    pdfJob.current = job;
  };

  // ---------- saving ----------
  const saveNow = async (): Promise<string> => {
    await up.settle();
    if (pdfJob.current) await pdfJob.current;
    const f = live.current;
    const md = up.latest();
    const id = await saveEvent(eventId.current, toSaveData(f, md, row));
    if (!eventId.current) {
      eventId.current = id;
      liveCreated.add(id);
      navigate(`/dashboard/exhibition/${id}/edit`, { replace: true });
    }
    setBase(snapshot(f, md));
    for (const key of [["sc-studio-events", uid], ["sc-event-post", id], ["sc-event-page"], ["my-exhibition-events"]]) void qc.invalidateQueries({ queryKey: key });
    return id;
  };

  const saveDraft = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await saveNow();
      setConfirmOpen(false);
      say("เก็บเป็นร่างแล้ว");
    } catch (e) {
      say(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    setBusy(true);
    try {
      await saveNow();
      setStatus("pending");
      setPvOpen(false);
      setPublished("edit");
    } catch (e) {
      say(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const askPublish = () => {
    if (busy) return;
    if (!checks.ready) {
      setTried(true);
      setPvOpen(false);
      return;
    }
    if (isEditPub) {
      void saveEdit();
      return;
    }
    setPvOpen(false);
    setAgree(false);
    setConfirmOpen(true);
  };

  const confirmPublish = async () => {
    if (!agree || busy) return;
    setBusy(true);
    try {
      const id = await saveNow();
      await submitEvent(id);
      setStatus("pending");
      setConfirmOpen(false);
      setPublished("new");
    } catch (e) {
      setConfirmOpen(false);
      say(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const again = () => {
    const f = emptyForm();
    up.replaceAll({});
    setForm(f);
    live.current = f;
    if (eventId.current) liveCreated.delete(eventId.current);
    eventId.current = null;
    setStatus("new");
    setBase(snapshot(f, {}));
    setTried(false);
    setMoreOpen(false);
    setPublished(null);
    navigate(SC_LINKS.eventNew, { replace: true });
    window.scrollTo({ top: 0 });
  };

  // ---------- leaving ----------
  const tryLeave = (to: string) => (e: MouseEvent) => {
    e.preventDefault();
    if (dirty && !published) setLeaveTo(to);
    else navigate(to);
  };

  // ---------- render ----------
  const coverM = form.coverId ? media[form.coverId] : undefined;
  const coverSrc = coverM ? mediaSrc(coverM) : "";
  const venueId = (id: string) => `ep-${id}`;

  const picture = (m: Media | undefined, alt: string, onRetry: () => void, onRemove: () => void, cover?: boolean) => {
    if (!m) return null;
    if (m.error) return <ErrorRow name={m.name} error={m.error} onRetry={onRetry} onRemove={onRemove} />;
    const loading = m.progress != null;
    return (
      <div className={cover ? "ep-cover" : "ep-pic"} data-loading={loading ? "" : undefined}>
        {cover ? (
          <span role="img" aria-label={alt} className="ep-cover-img" style={{ backgroundImage: `url("${mediaSrc(m)}")` }} />
        ) : (
          <img src={mediaSrc(m)} alt={alt} width={m.size?.[0]} height={m.size?.[1]} />
        )}
        {loading ? <Progress name={m.name} progress={m.progress ?? 0} /> : null}
      </div>
    );
  };

  return (
    <div className="ep-page">
      <header className="ep-hdw">
        <div className="ep-hd">
          <div className="ep-hd-l">
            <a href={SC_LINKS.home} className="ep-logo" aria-label="samecor. หน้าแรก" onClick={tryLeave(SC_LINKS.home)}>
              <img src={logoUrl} alt="samecor." />
            </a>
            <span className="ep-div" aria-hidden="true" />
            <h1 className="ep-h1">{isEditPub ? "Edit Event" : "New Event"}</h1>
          </div>
          <a href={STUDIO_EVENTS} className="ep-x" aria-label="ปิด กลับ My Studio" onClick={tryLeave(STUDIO_EVENTS)}>
            <X s={18} w={1.4} />
          </a>
        </div>
      </header>

      <input ref={coverInput} className="up-file" type="file" accept={ACCEPT_PIC} tabIndex={-1} aria-hidden="true" onChange={(e) => {
        addCover(e.target.files?.[0]);
        e.target.value = "";
      }} />
      <input ref={detailInput} className="up-file" type="file" accept={ACCEPT_PIC} multiple tabIndex={-1} aria-hidden="true" onChange={(e) => {
        addDetails(Array.from(e.target.files ?? []), insertAt.current);
        e.target.value = "";
      }} />

      <main className="ep-main">
        <div className="ep-lay">
          <section className="ep-card" aria-label="รายละเอียดงาน">
            <div role="group" aria-label="ประเภทงาน" className="ep-f ep-f12">
              <Label miss={miss("type")}>
                TYPE
                <Dot />
              </Label>
              <div className="ep-types">
                {EP_TYPES.map(([t]) => {
                  const on = form.type === t;
                  return (
                    <button key={t} type="button" className="ep-pill" aria-pressed={on} onClick={() => set({ type: on ? null : (t as EpType) })}>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="ep-f">
              <Label htmlFor="ev-title" miss={miss("title")}>
                TITLE
                <Dot />
              </Label>
              <input id="ev-title" className="ep-fld ep-big" type="text" value={form.title} maxLength={EP_LIMITS.title} placeholder="ชื่องาน" aria-invalid={miss("title") || undefined} onChange={(e) => set({ title: e.target.value })} />
            </div>

            <div className="ep-f ep-f12">
              <Label>COVER</Label>
              {coverM ? (
                <div className="ep-mod">
                  {picture(coverM, "ภาพปก", () => form.coverId && up.retry(form.coverId), () => set({ coverId: null }), true)}
                  {coverM.error ? null : (
                    <div className="ep-mtools">
                      <button type="button" className="ep-tb" aria-label="เปลี่ยนภาพปก" onClick={() => coverInput.current?.click()}>
                        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4" />
                        </svg>
                      </button>
                      <button type="button" className="ep-tb" aria-label="เอาภาพปกออก" onClick={() => set({ coverId: null })}>
                        <X />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button type="button" className="ep-drop ep-drop-cover" data-over={dragging === "cover" ? "" : undefined} onClick={() => coverInput.current?.click()} {...dragOn("cover")}>
                  <ImageAddIcon size={40} />
                  <span className="ep-drop-t">ภาพปก</span>
                  <span className="ep-drop-btn">เลือกไฟล์</span>
                  <span className="ep-hint">JPG · PNG · ≤ 10 MB</span>
                </button>
              )}
            </div>

            <div className="ep-f ep-f12">
              <Label>
                DETAILS<span className="ep-count">{form.details.length ? String(form.details.length) : ""}</span>
              </Label>
              <div className="ep-dets">
                {form.details.map((id, i) => {
                  const m = media[id];
                  return (
                    <div key={id} className="ep-det">
                      <div className="ep-mod">
                        {picture(m, `ภาพรายละเอียด ${i + 1}`, () => up.retry(id), () => removeDetail(id))}
                        {m?.error ? null : (
                          <div className="ep-mtools">
                            <button type="button" className="ep-tb" aria-label="ย้ายขึ้น" onClick={() => moveDetail(i, -1)}>
                              <Chevron up />
                            </button>
                            <button type="button" className="ep-tb" aria-label="ย้ายลง" onClick={() => moveDetail(i, 1)}>
                              <Chevron />
                            </button>
                            <button type="button" className="ep-tb" aria-label="เอาภาพนี้ออก" onClick={() => removeDetail(id)}>
                              <X />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="ep-addrow">
                        <span className="ep-addline" aria-hidden="true" />
                        <button type="button" className="ep-addbtn" aria-label="เพิ่มรูปตรงนี้" title="เพิ่มตรงนี้" onClick={() => pickDetails(i + 1)}>
                          <Plus />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <button type="button" className="ep-drop ep-drop-det" aria-label="เพิ่มภาพรายละเอียด" data-over={dragging === "details" ? "" : undefined} onClick={() => pickDetails(null)} {...dragOn("details")}>
                  <ImageAddIcon size={28} />
                  <span className="ep-drop-t2">ลากรูปมาวาง</span>
                  <span className="ep-hint">JPG · PNG · GIF · ≤ 10 MB</span>
                </button>
              </div>
            </div>

            <div className="ep-f">
              <Label htmlFor="ev-about">ABOUT</Label>
              <textarea id="ev-about" className="ep-ta" rows={5} value={form.about} maxLength={EP_LIMITS.about} placeholder="งานนี้เกี่ยวกับอะไร" onChange={(e) => set({ about: e.target.value })} />
            </div>

            {isOC ? (
              <div className="ep-oc">
                <span className="ep-oc-h" lang="en">
                  OPEN CALL
                </span>
                <div className="ep-2">
                  <div className="ep-f">
                    <Label htmlFor="ev-dl" miss={miss("dl")}>
                      DEADLINE
                      <Dot />
                    </Label>
                    <input id="ev-dl" className="ep-fld" type="date" value={form.deadline} aria-invalid={miss("dl") || undefined} onChange={(e) => set({ deadline: e.target.value })} />
                  </div>
                  <div className="ep-f">
                    <Label htmlFor="ev-who">WHO CAN APPLY</Label>
                    <input id="ev-who" className="ep-fld" type="text" value={form.who} maxLength={EP_LIMITS.line} placeholder="เช่น นักศึกษา, ทุกคน" onChange={(e) => set({ who: e.target.value })} />
                  </div>
                </div>
                <div className="ep-f">
                  <Label htmlFor="ev-how">HOW TO APPLY</Label>
                  <textarea id="ev-how" className="ep-ta" rows={3} value={form.how} placeholder="ทีละขั้น บรรทัดละ 1 ขั้น" onChange={(e) => set({ how: e.target.value })} />
                </div>
                <div className="ep-f">
                  <Label htmlFor="ev-prize">PRIZES</Label>
                  <input id="ev-prize" className="ep-fld" type="text" value={form.prize} maxLength={EP_LIMITS.line} placeholder="ถ้ามี" onChange={(e) => set({ prize: e.target.value })} />
                </div>
              </div>
            ) : null}
          </section>

          <aside className="ep-side" aria-label="ข้อมูลงาน">
            {row?.review_note && (status === "needs_revision" || status === "rejected") ? (
              <div className="ep-note" role="note">
                <span lang="en">{status === "rejected" ? "Rejected" : "Needs edit"}</span>
                <p>{row.review_note}</p>
              </div>
            ) : null}

            <div className="ep-f">
              <Label miss={miss("dates")}>
                DATES
                <Dot />
              </Label>
              <div className="ep-dates">
                <label className="up-sr" htmlFor="ev-start">
                  วันเริ่ม
                </label>
                <input id="ev-start" className="ep-fld" type="date" value={form.start} aria-invalid={miss("dates") || undefined} onChange={(e) => set({ start: e.target.value })} />
                <span aria-hidden="true" className="ep-dash">
                  –
                </span>
                <label className="up-sr" htmlFor="ev-end">
                  วันจบ
                </label>
                <input id="ev-end" className="ep-fld" type="date" value={form.end} min={form.start || undefined} aria-invalid={(miss("dates") && !!form.end) || undefined} onChange={(e) => set({ end: e.target.value })} />
              </div>
            </div>

            <div className="ep-f">
              <Label miss={miss("place")}>
                PLACE
                <Dot />
              </Label>
              <div role="group" aria-label="รูปแบบสถานที่" className="ep-seg">
                {(
                  [
                    ["Venue", "สถานที่"],
                    ["Online", "ออนไลน์"],
                  ] as const
                ).map(([k, label]) => (
                  <button key={k} type="button" aria-pressed={form.place === k} onClick={() => set({ place: k })}>
                    {label}
                  </button>
                ))}
              </div>
              {isVenue ? (
                <>
                  {form.venues.map((v, i) => (
                    <div key={v.id} className="ep-venue">
                      <span className="ep-vn">{i + 1}</span>
                      <label className="up-sr" htmlFor={venueId(v.id)}>
                        สถานที่ {i + 1}
                      </label>
                      <input
                        id={venueId(v.id)}
                        className="ep-fld"
                        type="text"
                        placeholder="ชื่อสถานที่ใน Google Maps"
                        value={v.val}
                        maxLength={EP_LIMITS.place}
                        aria-invalid={(i === 0 && miss("place")) || undefined}
                        onChange={(e) => setForm((f) => ({ ...f, venues: f.venues.map((x) => (x.id === v.id ? { ...x, val: e.target.value } : x)) }))}
                      />
                      {/* Looks the place up on Google Maps in a new tab (owner 2026-11-28: no search inside the site). */}
                      {v.val.trim() ? (
                        <a className="ep-ib" href={mapsSearchUrl(v.val)} target="_blank" rel="noopener noreferrer" aria-label={`ค้นหา ${v.val.trim()} ใน Google Maps`} title="ค้นใน Google Maps">
                          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
                            <circle cx="12" cy="10" r="2.3" />
                          </svg>
                        </a>
                      ) : null}
                      {form.venues.length > 1 ? (
                        <button type="button" className="ep-ib" aria-label="เอาสถานที่นี้ออก" onClick={() => setForm((f) => ({ ...f, venues: f.venues.filter((x) => x.id !== v.id) }))}>
                          <X />
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <button type="button" className="ep-addv" onClick={() => setForm((f) => ({ ...f, venues: [...f.venues, { id: nid(), val: "" }] }))}>
                    <Plus />
                    เพิ่มสถานที่
                  </button>
                </>
              ) : null}
            </div>

            <div className="ep-f">
              <Label htmlFor="ev-link" miss={miss("link")}>
                LINK
                {isOC ? <Dot /> : null}
              </Label>
              <div className="ep-link">
                <span aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
                  </svg>
                </span>
                <input id="ev-link" className="ep-fld" type="url" inputMode="url" placeholder="เว็บผู้จัด / ฟอร์มสมัคร" value={form.link} aria-invalid={miss("link") || undefined} onChange={(e) => set({ link: e.target.value })} />
              </div>
            </div>

            <button type="button" className="ep-more" aria-expanded={moreOpen} aria-controls="ep-more" onClick={() => setMoreOpen((v) => !v)}>
              More
              <span className="ep-more-ar" data-open={moreOpen ? "" : undefined}>
                <Chevron />
              </span>
            </button>
            {moreOpen ? (
              <div id="ep-more" className="ep-more-b">
                <div className="ep-2 ep-2-8">
                  <div className="ep-f">
                    <Label htmlFor="ev-time">TIME</Label>
                    <input id="ev-time" className="ep-fld" type="text" value={form.time} maxLength={EP_LIMITS.time} placeholder="10:00–19:00" onChange={(e) => set({ time: e.target.value })} />
                  </div>
                  <div className="ep-f">
                    <Label>ADMISSION</Label>
                    <div role="group" aria-label="ค่าเข้า" className="ep-seg">
                      {(
                        [
                          ["Free", "ฟรี"],
                          ["Paid", "มีค่าเข้า"],
                        ] as const
                      ).map(([k, label]) => (
                        <button key={k} type="button" aria-pressed={form.fee === k} onClick={() => set({ fee: k })}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {isPaid ? (
                  <div className="ep-f">
                    <Label htmlFor="ev-price" miss={miss("price")}>
                      PRICE
                      <Dot />
                    </Label>
                    <div className="ep-price">
                      <input id="ev-price" className="ep-fld" type="text" inputMode="numeric" value={form.price} maxLength={EP_LIMITS.price} placeholder="200" aria-invalid={miss("price") || undefined} onChange={(e) => set({ price: e.target.value })} />
                      <span aria-hidden="true">บาท</span>
                    </div>
                  </div>
                ) : null}
                <div className="ep-f">
                  <Label htmlFor="ev-org">ORGANIZER</Label>
                  <input id="ev-org" className="ep-fld" type="text" value={form.org} maxLength={EP_LIMITS.org} placeholder="ชื่อผู้จัด" onChange={(e) => set({ org: e.target.value })} />
                </div>
                {form.pdf ? (
                  <div className="ep-pdf" aria-busy={pdfBusy && !form.pdf.url}>
                    <span aria-hidden="true" className="ep-pdf-tag">
                      PDF
                    </span>
                    <span className="ep-pdf-tx">
                      <span>{form.pdf.name}</span>
                      <span>{pdfBusy && !form.pdf.url ? "กำลังอัปโหลด…" : form.pdf.size ?? ""}</span>
                    </span>
                    <button type="button" className="ep-ib" aria-label="เอาไฟล์ออก" onClick={() => set({ pdf: null })}>
                      <X />
                    </button>
                  </div>
                ) : (
                  <label className="ep-pdf-add">
                    <input type="file" accept="application/pdf,.pdf" onChange={(e) => {
                      onPdf(e.target.files?.[0]);
                      e.target.value = "";
                    }} />
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.7 17.2a1.7 1.7 0 0 1-2.4-2.4L15 7" />
                    </svg>
                    แนบประกาศ (PDF)
                  </label>
                )}
              </div>
            ) : null}

            <div className="ep-checks">
              {checks.list.map((c) => {
                const ok = checks.ok[c.key];
                return (
                  <span key={c.key} className="ep-chk" data-ok={ok ? "" : undefined} data-miss={!ok && tried ? "" : undefined}>
                    {ok ? (
                      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    ) : (
                      <span aria-hidden="true" className="ep-chk-dot" />
                    )}
                    {c.label}
                    <span className="up-sr">{ok ? " ครบแล้ว" : " ยังไม่มี"}</span>
                  </span>
                );
              })}
            </div>
            <div className="ep-act">
              <button type="button" className="ep-pub" aria-disabled={!checks.ready} aria-busy={busy || undefined} onClick={askPublish}>
                {pubLabel}
              </button>
              <div className="ep-sub" data-one={isEditPub ? "" : undefined}>
                <button type="button" className="ep-pv-btn" aria-label="Preview" onClick={() => setPvOpen(true)}>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                  <span className="ep-pvt">Preview</span>
                </button>
                {isEditPub ? null : (
                  <button type="button" className="ep-draft" aria-busy={busy || undefined} onClick={() => void saveDraft()}>
                    Save draft
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {pvOpen ? (
        <EventPostPreview form={form} media={media} ownerId={uid} pubLabel={pubLabel} ready={checks.ready} onBack={() => setPvOpen(false)} onPublish={askPublish} />
      ) : null}

      {confirmOpen ? (
        <ConfirmDialog
          thumb={coverSrc}
          title={form.title}
          agree={agree}
          setAgree={setAgree}
          busy={busy}
          onCancel={() => setConfirmOpen(false)}
          onDraft={() => void saveDraft()}
          onPublish={() => void confirmPublish()}
        />
      ) : null}

      {leaveTo ? (
        <EpLeaveDialog
          isEditPub={isEditPub}
          onStay={() => setLeaveTo(null)}
          onGo={() => {
            const to = leaveTo;
            setLeaveTo(null);
            setBase(snapshot(form, media));
            navigate(to);
          }}
        />
      ) : null}

      {published ? <EpPublishedDialog cover={coverSrc} title={form.title} isEditPub={published === "edit"} studioHref={STUDIO_EVENTS} onAgain={again} /> : null}

      {toast ? (
        <div className="up-toast ep-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
