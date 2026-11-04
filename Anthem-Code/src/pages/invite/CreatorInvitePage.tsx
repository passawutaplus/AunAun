import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ImagePlus,
  Loader2,
  Mail,
  X,
  Images,
  ShieldCheck,
  UserRound,
  CheckCircle2,
  FileText,
  Pencil,
  Trash2,
  Link2,
} from "lucide-react";
import SeoHead from "@/components/SeoHead";
import InviteProfilePreview from "@/components/invite/InviteProfilePreview";
import InviteProjectPreview from "@/components/invite/InviteProjectPreview";
import InviteLanding from "@/components/invite/InviteLanding";
import InviteWorksBackdrop from "@/components/invite/InviteWorksBackdrop";
import { InviteShell, InviteStateCard } from "@/components/invite/InviteShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BIO_MAX,
  INVITE_DISCIPLINES,
  InviteApiError,
  MAX_IMAGES_PER_PROJECT,
  MAX_PROJECTS,
  PROJECT_SLOTS,
  emptyProject,
  isTokenShape,
  normalizeSubmission,
  publicInviteApi,
  uploadInviteImage,
  validateQuick,
  validateStep,
  type FieldErrors,
  type PageLang,
  type InviteMedia,
  type InviteSubmission,
  type MediaSlot,
  type PublicInvite,
} from "@/lib/creatorInvite";
import { inviteCopy, type InviteCopy } from "@/lib/creatorInviteCopy";
import { setUiLang } from "@/lib/authCopy";

const backupKey = (token: string) =>
  `samecor.creatorInvite.draft.${token.slice(0, 12)}`;

function errText(t: InviteCopy, e: unknown): string {
  const code = e instanceof InviteApiError ? e.code : "generic";
  return (t.err as Record<string, string>)[code] ?? t.err.generic;
}

// ---------------------------------------------------------------------------
export default function CreatorInvitePage() {
  const { token = "" } = useParams();
  const location = useLocation();
  const [params] = useSearchParams();
  const formRoute = location.pathname.endsWith("/form");
  const validToken = isTokenShape(token);

  const q = useQuery({
    queryKey: ["creator-invite", token],
    queryFn: () => publicInviteApi.load(token),
    enabled: validToken,
    retry: (n, e) =>
      !(e instanceof InviteApiError && [404, 410, 429].includes(e.status)) &&
      n < 2,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const [lang, setLang] = useState<PageLang | null>(null);
  // Invitation pages open in English; the artist can switch (the invitation language only sets the emails)
  const effectiveLang: PageLang = lang ?? "en";
  // The sign-up page ("I'll create my profile") opens in the language the artist is reading
  useEffect(() => setUiLang(effectiveLang), [effectiveLang]);
  const t = inviteCopy(effectiveLang);
  const [submitted, setSubmitted] = useState(false);

  const seo = <SeoHead title="Creator invitation" path="/invite" noindex />;

  if (
    !validToken ||
    (q.error instanceof InviteApiError && q.error.status === 404)
  ) {
    return (
      <InviteShell lang={effectiveLang} onLang={setLang} t={t}>
        {seo}
        <InviteStateCard title={t.notFoundTitle} body={t.expiredBody} />
      </InviteShell>
    );
  }
  if (q.error) {
    const expired = q.error instanceof InviteApiError && q.error.status === 410;
    return (
      <InviteShell lang={effectiveLang} onLang={setLang} t={t}>
        {seo}
        <InviteStateCard
          title={expired ? t.expiredTitle : t.err.generic}
          body={expired ? t.expiredBody : ""}
        />
      </InviteShell>
    );
  }
  if (!q.data) {
    return (
      <InviteShell lang={effectiveLang} onLang={setLang} t={t}>
        {seo}
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2
            className="h-6 w-6 animate-spin text-muted-foreground"
            aria-label="Loading"
          />
        </div>
      </InviteShell>
    );
  }

  const { invite } = q.data;
  let body: React.ReactNode;
  let bleed = false;
  if (params.get("unsubscribe") === "1")
    body = <Unsubscribe token={token} t={t} already={invite.unsubscribed} />;
  else if (submitted || (invite.status === "submitted" && !formRoute))
    body = (
      <Thanks
        t={t}
        invite={invite}
        submission={normalizeSubmission(q.data.submission, invite)}
        token={token}
      />
    );
  else if (!invite.can_edit)
    body = (
      <InviteStateCard
        title={t.statusTitle[invite.status] ?? t.expiredTitle}
        body=""
        explore={t}
      />
    );
  else if (formRoute)
    body = (
      <InviteForm
        key={token}
        token={token}
        t={t}
        invite={invite}
        initial={q.data.submission}
        initialMedia={q.data.media}
        quick={params.get("mode") === "quick"}
        onSubmitted={() => setSubmitted(true)}
      />
    );
  else {
    bleed = true;
    body = (
      <>
        <InviteLanding token={token} t={t} invite={invite} />
        <InviteWorksBackdrop className="mx-auto w-full max-w-6xl" />
      </>
    );
  }

  return (
    <InviteShell lang={effectiveLang} onLang={setLang} t={t} bleed={bleed}>
      {seo}
      {body}
    </InviteShell>
  );
}

// ---------------------------------------------------------------------------
function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5" data-field={id}>
      <Label htmlFor={id} className="text-sm">
        {label}
        {required ? <span className="text-brand"> *</span> : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const aria = (id: string, err: boolean) => ({
  id,
  "aria-invalid": err || undefined,
  "aria-describedby": err ? `${id}-err` : `${id}-hint`,
});

type SaveState = "idle" | "saving" | "saved" | "error";

function InviteForm({
  token,
  t,
  invite,
  initial,
  initialMedia,
  quick,
  onSubmitted,
}: {
  token: string;
  t: InviteCopy;
  invite: PublicInvite;
  initial: unknown;
  initialMedia: InviteMedia[];
  quick: boolean;
  onSubmitted: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [data, setData] = useState<InviteSubmission>(() => {
    let d = normalizeSubmission(null, invite);
    if (initial) d = normalizeSubmission(initial, invite);
    else {
      try {
        const raw = localStorage.getItem(backupKey(token));
        if (raw) d = normalizeSubmission(JSON.parse(raw).data, invite);
      } catch {
        /* ignore */
      }
    }
    // Drop references to images that no longer exist (removed, blocked or never finished uploading)
    const known = new Set(initialMedia.map((m) => m.id));
    const keep = (id: string | null) => (id && known.has(id) ? id : null);
    return {
      ...d,
      about: {
        ...d.about,
        avatar: keep(d.about.avatar),
        cover: keep(d.about.cover),
      },
      projects: d.projects.map((p) => ({
        ...p,
        media: p.media.filter((m) => known.has(m)),
      })),
    };
  });
  const [media, setMedia] = useState(
    () => new Map(initialMedia.map((m) => [m.id, m])),
  );
  const [step, setStep] = useState<1 | 2 | 3>(() => {
    try {
      const s = Number(
        JSON.parse(localStorage.getItem(backupKey(token)) ?? "{}").step,
      );
      return s === 2 || s === 3 ? s : 1;
    } catch {
      return 1;
    }
  });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [uploading, setUploading] = useState<MediaSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const previewRef = useRef<HTMLElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const dirty = useRef(false);

  const clean = useMemo(
    () =>
      new Set(
        [...media.values()]
          .filter((m) => m.scan_status === "clean")
          .map((m) => m.id),
      ),
    [media],
  );

  // Autosave: local backup immediately, server draft after a short pause.
  useEffect(() => {
    try {
      localStorage.setItem(backupKey(token), JSON.stringify({ data, step }));
    } catch {
      /* ignore */
    }
    if (!dirty.current) return;
    setSaveState("saving");
    const id = window.setTimeout(() => {
      publicInviteApi
        .save(token, data)
        .then(() => {
          setSaveState("saved");
          setSavedAt(
            new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          );
        })
        .catch(() => setSaveState("error"));
    }, 1200);
    return () => window.clearTimeout(id);
  }, [data, step, token]);

  const update = useCallback(
    (fn: (d: InviteSubmission) => InviteSubmission) => {
      dirty.current = true;
      setData((d) => fn(d));
    },
    [],
  );
  const setAbout = (k: keyof InviteSubmission["about"], v: string | null) =>
    update((d) => ({ ...d, about: { ...d.about, [k]: v } }));
  const setProject = (
    i: number,
    patch: Partial<InviteSubmission["projects"][number]>,
  ) =>
    update((d) => ({
      ...d,
      projects: d.projects.map((p, j) => (j === i ? { ...p, ...patch } : p)),
    }));

  const e = (k: string, msg: string) => (errors[k] ? msg : null);
  const clearErr = (k: string) =>
    errors[k] && setErrors(({ [k]: _drop, ...rest }) => rest);

  async function addFiles(slot: MediaSlot, files: FileList | null) {
    if (!files?.length) return;
    setUploading(slot);
    try {
      for (const file of Array.from(files)) {
        if (slot !== "avatar" && slot !== "cover") {
          const p = data.projects.find((x) => x.slot === slot);
          if (p && p.media.length >= MAX_IMAGES_PER_PROJECT) {
            toast.error(t.err.too_many_files);
            break;
          }
        }
        try {
          const m = await uploadInviteImage(token, slot, file);
          setMedia((prev) => new Map(prev).set(m.id, m));
          if (slot === "avatar" || slot === "cover") {
            setAbout(slot, m.id);
            clearErr(`about.${slot}`);
          } else {
            update((d) => ({
              ...d,
              projects: d.projects.map((p) =>
                p.slot === slot ? { ...p, media: [...p.media, m.id] } : p,
              ),
            }));
            const idx = data.projects.findIndex((p) => p.slot === slot);
            clearErr(`projects.${idx}.media`);
          }
        } catch (err) {
          toast.error(`${file.name}: ${errText(t, err)}`);
        }
      }
    } finally {
      setUploading(null);
    }
  }

  function removeImage(slot: MediaSlot, id: string) {
    void publicInviteApi.removeMedia(token, id).catch(() => undefined);
    setMedia((prev) => {
      const n = new Map(prev);
      n.delete(id);
      return n;
    });
    if (slot === "avatar" || slot === "cover") setAbout(slot, null);
    else
      update((d) => ({
        ...d,
        projects: d.projects.map((p) =>
          p.slot === slot
            ? { ...p, media: p.media.filter((x) => x !== id) }
            : p,
        ),
      }));
  }

  function reorderImages(i: number, ids: string[]) {
    update((d) => ({
      ...d,
      projects: d.projects.map((p, j) => (j === i ? { ...p, media: ids } : p)),
    }));
  }

  const scrollTop = () =>
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const focusFirstError = (errs: FieldErrors) => {
    const first = Object.keys(errs)[0];
    if (!first) return;
    window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-field="${first}"] input, [data-field="${first}"] textarea, [data-field="${first}"] button`,
      );
      el?.focus();
    }, 50);
  };

  function next() {
    const errs = validateStep(step, data, clean, consent);
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error(t.err.fix);
      focusFirstError(errs);
      return;
    }
    setStep((s) => (s < 3 ? ((s + 1) as 2 | 3) : s));
    scrollTop();
  }

  async function submit(mode: "full" | "quick") {
    const errs =
      mode === "quick"
        ? validateQuick(data, consent)
        : validateStep(3, data, clean, consent);
    if (mode === "full") {
      for (const s of [1, 2] as const)
        Object.assign(errs, validateStep(s, data, clean, consent));
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error(t.err.fix);
      if (mode === "full") {
        const k = Object.keys(errs)[0];
        setStep(k.startsWith("about") ? 1 : k.startsWith("projects") ? 2 : 3);
      }
      focusFirstError(errs);
      return;
    }
    setSubmitting(true);
    try {
      await publicInviteApi.submit(token, mode, data);
      try {
        localStorage.removeItem(backupKey(token));
      } catch {
        /* ignore */
      }
      await queryClient.invalidateQueries({
        queryKey: ["creator-invite", token],
      });
      onSubmitted();
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (err instanceof InviteApiError && err.fields?.length) {
        const fe = Object.fromEntries(
          err.fields.map((f) => [f, true]),
        ) as FieldErrors;
        setErrors(fe);
        toast.error(t.err.fix);
      } else toast.error(errText(t, err));
    } finally {
      setSubmitting(false);
    }
  }

  const goStep = (n: 1 | 2 | 3) => {
    setStep(n);
    scrollTop();
  };
  const saveLabel =
    saveState === "saving"
      ? t.saving
      : saveState === "saved"
        ? `${t.saved}${savedAt ? ` ${savedAt}` : ""}`
        : saveState === "error"
          ? t.saveFailed
          : "";

  const modeSwitch = (
    <div
      className="inline-flex rounded-full border border-border p-0.5 text-xs"
      role="group"
      aria-label="Form mode"
    >
      {[
        [false, t.full],
        [true, t.quick],
      ].map(([isQuick, label]) => (
        <button
          key={String(isQuick)}
          type="button"
          aria-pressed={quick === isQuick}
          onClick={() =>
            navigate(
              `/invite/creator/${token}/form${isQuick ? "?mode=quick" : ""}`,
              { replace: true },
            )
          }
          className={cn(
            "rounded-full px-3 py-1.5 font-medium",
            quick === isQuick
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label as string}
        </button>
      ))}
    </div>
  );

  return (
    <div
      ref={topRef}
      className="mx-auto max-w-3xl scroll-mt-20 px-4 py-6 sm:py-10 lg:max-w-6xl lg:px-6"
    >
      {/* Desktop: back link on its own row, flush left above the preview column */}
      <div className="mb-6 hidden items-center justify-between gap-4 lg:flex">
        <Link
          to={`/invite/creator/${token}`}
          className="inline-flex items-center gap-2 font-display text-base text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Private creator
          invitation · {invite.display_name}
        </Link>
        {modeSwitch}
      </div>
      {/* Phones/tablets: form, then the preview below it. Desktop: live preview left, form right. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
        <div className="min-w-0 lg:col-start-2 lg:row-start-1">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 lg:hidden">
            <Link
              to={`/invite/creator/${token}`}
              className="inline-flex items-center gap-1 font-display text-xs text-muted-foreground hover:text-foreground lg:hidden"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Private creator
              invitation · {invite.display_name}
            </Link>
            {modeSwitch}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 sm:p-8 lg:p-10">
            {quick ? (
              <QuickStep
                t={t}
                data={data}
                errors={errors}
                e={e}
                setAbout={setAbout}
                update={update}
                consent={consent}
                setConsent={setConsent}
                clearErr={clearErr}
              />
            ) : (
              <>
                <Stepper step={step} t={t} />
                {step === 1 ? (
                  <div className="space-y-6">
                    <StepHead n={1} title={t.s1} />
                    <Field
                      id="about.name"
                      label={t.name}
                      required
                      error={e("about.name", t.err.required)}
                      hint={t.nameHint}
                    >
                      <Input
                        {...aria("about.name", !!errors["about.name"])}
                        value={data.about.name}
                        autoComplete="name"
                        maxLength={120}
                        onChange={(ev) => (
                          setAbout("name", ev.target.value),
                          clearErr("about.name")
                        )}
                      />
                    </Field>
                    <Field
                      id="about.discipline"
                      label={t.discipline}
                      required
                      error={e("about.discipline", t.err.required)}
                    >
                      <Select
                        value={data.about.discipline}
                        onValueChange={(v) => (
                          setAbout("discipline", v),
                          clearErr("about.discipline")
                        )}
                      >
                        <SelectTrigger
                          {...aria(
                            "about.discipline",
                            !!errors["about.discipline"],
                          )}
                        >
                          <SelectValue placeholder={t.choose} />
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
                    {data.contact_pref && data.contact_pref !== "email" ? (
                      <Field
                        id="contact_handle"
                        label={t.contactHandle(
                          t.contactOptions[data.contact_pref],
                        )}
                        required
                        error={e("contact_handle", t.err.required)}
                      >
                        <Input
                          {...aria("contact_handle", !!errors.contact_handle)}
                          value={data.contact_handle}
                          maxLength={120}
                          placeholder={
                            data.contact_pref === "instagram"
                              ? "@username"
                              : data.contact_pref === "line"
                                ? "LINE ID"
                                : ""
                          }
                          onChange={(ev) => {
                            const v = ev.target.value;
                            update((d) => ({ ...d, contact_handle: v }));
                            clearErr("contact_handle");
                          }}
                        />
                      </Field>
                    ) : null}
                    <Field
                      id="about.bio"
                      label={t.bio}
                      error={e("about.bio", t.err.bio)}
                      hint={`${data.about.bio.length} / ${BIO_MAX}`}
                    >
                      <Textarea
                        {...aria("about.bio", !!errors["about.bio"])}
                        rows={3}
                        maxLength={BIO_MAX}
                        value={data.about.bio}
                        onChange={(ev) => setAbout("bio", ev.target.value)}
                      />
                    </Field>
                    <div aria-hidden className="border-t border-border" />
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field id="about.city" label={t.city}>
                        <Input
                          {...aria("about.city", false)}
                          value={data.about.city}
                          maxLength={120}
                          autoComplete="address-level2"
                          onChange={(ev) => setAbout("city", ev.target.value)}
                        />
                      </Field>
                      <Field
                        id="about.email"
                        label={t.email}
                        required
                        error={e("about.email", t.err.email)}
                        hint={t.emailHint}
                      >
                        <Input
                          {...aria("about.email", !!errors["about.email"])}
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          value={data.about.email}
                          maxLength={254}
                          onChange={(ev) => (
                            setAbout("email", ev.target.value),
                            clearErr("about.email")
                          )}
                        />
                      </Field>
                    </div>
                    <Field id="about.links" label={t.links}>
                      <LinksInput
                        id="about.links"
                        t={t}
                        value={data.about.links}
                        onChange={(v) => setAbout("links", v)}
                      />
                    </Field>
                    <div aria-hidden className="border-t border-border" />
                    <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)]">
                      {(["avatar", "cover"] as const).map((slot) => (
                        <div
                          key={slot}
                          className="space-y-1.5"
                          data-field={`about.${slot}`}
                        >
                          <p className="text-sm font-medium">
                            {slot === "avatar" ? t.avatar : t.cover}
                            {slot === "avatar" ? (
                              <span className="text-brand"> *</span>
                            ) : null}
                          </p>
                          <ImageStrip
                            t={t}
                            ids={data.about[slot] ? [data.about[slot]!] : []}
                            media={media}
                            slot={slot}
                            uploading={uploading === slot}
                            canAdd={!data.about[slot]}
                            onAdd={(f) => void addFiles(slot, f)}
                            onRemove={(id) => removeImage(slot, id)}
                          />
                          {slot === "avatar" && errors["about.avatar"] ? (
                            <p className="text-xs font-medium text-destructive">
                              {t.avatarErr}
                            </p>
                          ) : slot === "cover" ? (
                            <p className="text-xs text-muted-foreground">
                              {t.coverHint}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : step === 2 ? (
                  <div className="space-y-8">
                    <StepHead n={2} title={t.s2} />
                    {data.projects.map((p, i) => (
                      <div
                        key={p.slot}
                        className="space-y-5 rounded-xl border border-border p-4 sm:p-6"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-display text-lg font-semibold">
                            Project {i + 1}
                          </h3>
                          {i > 0 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-destructive"
                              aria-label={`${t.remove} Project ${i + 1}`}
                              title={t.remove}
                              onClick={() => {
                                p.media.forEach(
                                  (m) =>
                                    void publicInviteApi
                                      .removeMedia(token, m)
                                      .catch(() => undefined),
                                );
                                update((d) => ({
                                  ...d,
                                  projects: d.projects.filter(
                                    (_, j) => j !== i,
                                  ),
                                }));
                              }}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          ) : null}
                        </div>
                        <Field
                          id={`projects.${i}.title`}
                          label={t.title}
                          required
                          error={e(`projects.${i}.title`, t.err.required)}
                        >
                          <Input
                            {...aria(
                              `projects.${i}.title`,
                              !!errors[`projects.${i}.title`],
                            )}
                            value={p.title}
                            maxLength={120}
                            onChange={(ev) => (
                              setProject(i, { title: ev.target.value }),
                              clearErr(`projects.${i}.title`)
                            )}
                          />
                        </Field>
                        <Field id={`projects.${i}.description`} label={t.desc}>
                          <Textarea
                            {...aria(`projects.${i}.description`, false)}
                            rows={3}
                            maxLength={1000}
                            value={p.description}
                            onChange={(ev) =>
                              setProject(i, { description: ev.target.value })
                            }
                          />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field id={`projects.${i}.role`} label={t.role}>
                            <RolePicker
                              id={`projects.${i}.role`}
                              t={t}
                              value={p.role}
                              onChange={(role) => setProject(i, { role })}
                            />
                          </Field>
                          <Field
                            id={`projects.${i}.url`}
                            label={t.projectUrl}
                            error={e(`projects.${i}.url`, t.err.url)}
                          >
                            <Input
                              {...aria(
                                `projects.${i}.url`,
                                !!errors[`projects.${i}.url`],
                              )}
                              type="url"
                              placeholder="https://"
                              value={p.url}
                              maxLength={500}
                              onChange={(ev) => (
                                setProject(i, { url: ev.target.value }),
                                clearErr(`projects.${i}.url`)
                              )}
                            />
                          </Field>
                        </div>
                        <div
                          className="space-y-1.5"
                          data-field={`projects.${i}.media`}
                        >
                          <p className="text-sm font-medium">
                            {t.images}
                            <span className="text-brand"> *</span>
                          </p>
                          <ImageStrip
                            t={t}
                            ids={p.media}
                            media={media}
                            slot={p.slot}
                            uploading={uploading === p.slot}
                            canAdd={p.media.length < MAX_IMAGES_PER_PROJECT}
                            onAdd={(f) => void addFiles(p.slot, f)}
                            onRemove={(id) => removeImage(p.slot, id)}
                            onReorder={(ids) => reorderImages(i, ids)}
                          />
                          <p
                            className={cn(
                              "text-xs",
                              errors[`projects.${i}.media`]
                                ? "font-medium text-destructive"
                                : "text-muted-foreground",
                            )}
                          >
                            {errors[`projects.${i}.media`]
                              ? t.err.media
                              : t.imageRules}
                          </p>
                        </div>
                        <div data-field={`projects.${i}.rights`}>
                          <label className="flex items-start gap-2.5 text-sm">
                            <Checkbox
                              id={`projects.${i}.rights`}
                              checked={p.rights}
                              onCheckedChange={(v) => (
                                setProject(i, { rights: v === true }),
                                clearErr(`projects.${i}.rights`)
                              )}
                              aria-invalid={
                                !!errors[`projects.${i}.rights`] || undefined
                              }
                              className="mt-0.5"
                            />
                            <span>{t.rights}</span>
                          </label>
                          {errors[`projects.${i}.rights`] ? (
                            <p className="mt-1 pl-7 text-xs font-medium text-destructive">
                              {t.err.rights}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {data.projects.length < MAX_PROJECTS ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() =>
                          update((d) => ({
                            ...d,
                            projects: [
                              ...d.projects,
                              emptyProject(
                                PROJECT_SLOTS.find(
                                  (x) => !d.projects.some((q) => q.slot === x),
                                ) ?? "p3",
                              ),
                            ],
                          }))
                        }
                      >
                        + {t.addProject}
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <StepHead n={3} title={t.s3} sub={t.s3sub} />
                    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                      <ReviewRow
                        icon={UserRound}
                        title={t.rowBasic}
                        sub={t.rowBasicSub}
                        editLabel={t.edit}
                        onEdit={() => goStep(1)}
                      >
                        <p className="font-semibold text-foreground">
                          {data.about.name}
                        </p>
                        <p className="text-muted-foreground">
                          {data.about.discipline}
                        </p>
                        <p className="break-all text-muted-foreground">
                          {data.about.email}
                        </p>
                      </ReviewRow>
                      <ReviewRow
                        icon={FileText}
                        title={t.rowBio}
                        sub={t.rowBioSub}
                        editLabel={t.edit}
                        onEdit={() => goStep(1)}
                      >
                        <p className="line-clamp-3 text-foreground/85">
                          {data.about.bio || "—"}
                        </p>
                      </ReviewRow>
                      <ReviewRow
                        icon={Images}
                        title={t.rowWorks}
                        sub={t.rowWorksSub(data.projects.length)}
                        editLabel={t.edit}
                        onEdit={() => goStep(2)}
                      >
                        <div className="space-y-3">
                          {data.projects.map((p) => {
                            const img = p.media
                              .map((m) => media.get(m)?.url)
                              .find(Boolean);
                            return (
                              <div
                                key={p.slot}
                                className="flex items-center gap-3"
                              >
                                <span className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                                  {img ? (
                                    <img
                                      src={img}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : null}
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate font-semibold text-foreground">
                                    {p.title || t.untitled}
                                  </span>
                                  {p.description ? (
                                    <span className="block truncate text-xs text-muted-foreground">
                                      {p.description}
                                    </span>
                                  ) : null}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </ReviewRow>
                    </div>
                    <div
                      data-field="consent"
                      className={cn(
                        "rounded-xl border p-4 sm:p-5",
                        errors.consent
                          ? "border-destructive"
                          : consent
                            ? "border-brand/60"
                            : "border-border",
                      )}
                    >
                      <label className="flex items-start gap-3">
                        <Checkbox
                          id="consent"
                          checked={consent}
                          onCheckedChange={(v) => (
                            setConsent(v === true),
                            clearErr("consent")
                          )}
                          aria-invalid={!!errors.consent || undefined}
                          className="mt-0.5 h-5 w-5 data-[state=checked]:border-brand data-[state=checked]:bg-brand"
                        />
                        <span className="text-base font-semibold text-foreground">
                          {t.consentTitle}
                        </span>
                      </label>
                      <ul className="mt-3 space-y-2 pl-8 text-sm text-muted-foreground">
                        {t.consentPoints.map((x) => (
                          <li key={x} className="flex items-start gap-2">
                            <CheckCircle2
                              className="mt-0.5 h-4 w-4 shrink-0"
                              aria-hidden
                            />{" "}
                            {x}
                          </li>
                        ))}
                      </ul>
                      <p
                        className={cn(
                          "mt-3 pl-8 text-xs",
                          errors.consent
                            ? "font-medium text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {errors.consent ? t.err.consent : t.consentHint}
                      </p>
                    </div>
                    <Field
                      id="contact_pref"
                      label={t.contactPref}
                      required
                      error={e("contact_pref", t.err.required)}
                      hint={
                        data.contact_pref === "email"
                          ? t.contactViaEmail(data.about.email)
                          : undefined
                      }
                    >
                      <Select
                        value={data.contact_pref}
                        onValueChange={(v) => {
                          update((d) => ({
                            ...d,
                            contact_pref: v as InviteSubmission["contact_pref"],
                          }));
                          clearErr("contact_pref");
                        }}
                      >
                        <SelectTrigger
                          id="contact_pref"
                          aria-invalid={!!errors.contact_pref || undefined}
                        >
                          <SelectValue placeholder={t.chooseContact} />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            Object.keys(
                              t.contactOptions,
                            ) as (keyof typeof t.contactOptions)[]
                          ).map((k) => (
                            <SelectItem key={k} value={k}>
                              {t.contactOptions[k]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                )}
              </>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
              {!quick && step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => (
                    setStep((s) => (s - 1) as 1 | 2),
                    scrollTop()
                  )}
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> {t.back}
                </Button>
              ) : null}
              <span
                className="text-xs text-muted-foreground sm:mr-auto"
                aria-live="polite"
              >
                {saveLabel}
              </span>
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto lg:hidden"
                onClick={() =>
                  previewRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
              >
                {t.pvBtn} ↓
              </Button>
              {quick || step === 3 ? (
                <Button
                  type="button"
                  className="h-12 w-full rounded-xl bg-brand px-6 text-base font-semibold text-white hover:bg-brand/90 sm:w-auto"
                  disabled={submitting || !!uploading}
                  onClick={() => void submit(quick ? "quick" : "full")}
                >
                  {submitting ? (
                    <Loader2
                      className="mr-1.5 h-4 w-4 animate-spin"
                      aria-hidden
                    />
                  ) : null}
                  {t.submit}{" "}
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                </Button>
              ) : (
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={!!uploading}
                  onClick={next}
                >
                  {t.next} <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <div className="space-y-6">
            <InviteProfilePreview
              ref={previewRef}
              data={data}
              media={media}
              t={t}
              badge={t.pvBadge}
            />
            {quick
              ? null
              : data.projects.map((p, i) => (
                  <InviteProjectPreview
                    key={p.slot}
                    project={p}
                    index={i}
                    name={data.about.name}
                    media={media}
                    t={t}
                    badge={t.pvBadge}
                  />
                ))}
          </div>
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        <a
          href="/learn"
          target="_blank"
          rel="noopener"
          className="underline underline-offset-2 hover:text-foreground"
        >
          {t.explore} ↗
        </a>{" "}
        · {t.exploreHint}
      </p>
    </div>
  );
}

function Stepper({ step, t }: { step: number; t: InviteCopy }) {
  const labels = [t.s1, t.s2, t.s3];
  return (
    <div
      className="mb-8 grid grid-cols-3 gap-2"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={3}
      aria-valuenow={step}
      aria-label={t.stepOf(step)}
    >
      {labels.map((label, idx) => {
        const i = idx + 1;
        return (
          <div key={i} className="min-w-0">
            <span
              className={cn(
                "block h-1.5 rounded-full",
                i <= step ? "bg-brand" : "bg-muted",
              )}
            />
            <span
              className={cn(
                "mt-2 hidden truncate text-[11px] sm:block",
                i === step
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StepHead({
  n,
  title,
  sub,
}: {
  n: number;
  title: string;
  sub?: string;
}) {
  const Icon = n === 1 ? UserRound : n === 2 ? Images : ShieldCheck;
  return (
    <div>
      <h2 className="mt-1 flex items-center gap-2.5 text-2xl font-semibold text-foreground">
        <Icon className="h-6 w-6 shrink-0 text-brand" aria-hidden />
        {title}
      </h2>
      {sub ? (
        <p className="mt-1.5 text-sm text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  );
}

const LINK_SEP = "\n";

/** Website / social links: one per row, up to 5, stored newline-separated in about.links. */
function LinksInput({
  id,
  t,
  value,
  onChange,
  max = 5,
  invalid = false,
}: {
  id: string;
  t: InviteCopy;
  value: string;
  onChange: (v: string) => void;
  max?: number;
  invalid?: boolean;
}) {
  const rows = value.split(LINK_SEP);
  const setRow = (i: number, v: string) =>
    onChange(
      rows.map((r, j) => (j === i ? v.replace(/\s+/g, "") : r)).join(LINK_SEP),
    );
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2">
          <Input
            id={i === 0 ? id : `${id}.${i}`}
            aria-invalid={invalid || undefined}
            aria-label={i === 0 ? undefined : `${t.links} ${i + 1}`}
            type="url"
            value={r}
            maxLength={200}
            placeholder="https://"
            onChange={(ev) => setRow(i, ev.target.value)}
          />
          {rows.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t.remove}
              onClick={() =>
                onChange(rows.filter((_, j) => j !== i).join(LINK_SEP))
              }
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      ))}
      {rows.length < max ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => onChange(value + LINK_SEP)}
        >
          + {t.addLink}
        </Button>
      ) : null}
    </div>
  );
}

function ReviewRow({
  icon: Icon,
  title,
  sub,
  editLabel,
  onEdit,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: string;
  editLabel: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 p-4 sm:gap-x-4 sm:p-5">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        <div className="mt-2 min-w-0 text-sm">{children}</div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`${editLabel}: ${title}`}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground hover:bg-secondary"
      >
        <Pencil className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function ConsentBox({
  id,
  label,
  hint,
  checked,
  error,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  error: string | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      data-field={id}
      className={cn(
        "rounded-xl border p-4",
        error ? "border-destructive" : "border-border",
      )}
    >
      <label className="flex items-start gap-2.5 text-sm">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(v) => onChange(v === true)}
          aria-invalid={!!error || undefined}
          className="mt-0.5"
        />
        <span>{label}</span>
      </label>
      <p
        className={cn(
          "mt-1.5 pl-7 text-xs",
          error ? "font-medium text-destructive" : "text-muted-foreground",
        )}
      >
        {error ?? hint}
      </p>
    </div>
  );
}

/** Role / credit: three common roles, or "other" with a free-text field. Stores the readable label. */
function RolePicker({
  id,
  t,
  value,
  onChange,
}: {
  id: string;
  t: InviteCopy;
  value: string;
  onChange: (v: string) => void;
}) {
  const presets = [t.roleOwner, t.roleTeam, t.roleAdvisor];
  // Match labels in any language so switching language keeps the choice
  const all = (["th", "en", "zh"] as const).map((l) => inviteCopy(l));
  const presetIndex =
    all
      .map((c) => [c.roleOwner, c.roleTeam, c.roleAdvisor].indexOf(value))
      .find((i) => i >= 0) ?? -1;
  const [other, setOther] = useState(presetIndex < 0 && !!value);
  const selected =
    presetIndex >= 0 ? String(presetIndex) : other ? "other" : "";
  return (
    <div className="space-y-2">
      <Select
        value={selected}
        onValueChange={(v) => {
          if (v === "other") {
            setOther(true);
            onChange("");
          } else {
            setOther(false);
            onChange(presets[Number(v)]);
          }
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder={t.chooseRole} />
        </SelectTrigger>
        <SelectContent>
          {presets.map((label, i) => (
            <SelectItem key={label} value={String(i)}>
              {label}
            </SelectItem>
          ))}
          <SelectItem value="other">{t.roleOther}</SelectItem>
        </SelectContent>
      </Select>
      {selected === "other" ? (
        <Input
          aria-label={t.roleOther}
          value={value}
          maxLength={120}
          placeholder={t.roleOtherPh}
          onChange={(ev) => onChange(ev.target.value)}
        />
      ) : null}
    </div>
  );
}

function tileShape(slot: MediaSlot): string {
  if (slot === "avatar") return "h-20 w-20 rounded-full sm:h-24 sm:w-24";
  if (slot === "cover") return "h-20 w-52 rounded-lg sm:h-24 sm:w-64";
  return "h-20 w-20 rounded-lg sm:h-24 sm:w-24";
}

function ImageStrip({
  t,
  ids,
  media,
  slot,
  uploading,
  canAdd,
  onAdd,
  onRemove,
  onReorder,
}: {
  t: InviteCopy;
  ids: string[];
  media: Map<string, InviteMedia>;
  slot: MediaSlot;
  uploading: boolean;
  canAdd: boolean;
  onAdd: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  /** Project images only: drag to reorder (mouse drag, or press and hold then drag on touch). */
  onReorder?: (ids: string[]) => void;
}) {
  const inputId = `upload-${slot}`;
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const onDragEnd = (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!onReorder || !over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from >= 0 && to >= 0) onReorder(arrayMove(ids, from, to));
  };
  const showCover = !!onReorder && ids.length > 1;

  const addTile = canAdd ? (
    <label
      htmlFor={inputId}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-border text-[11px] text-muted-foreground hover:border-foreground/40 hover:text-foreground",
        tileShape(slot),
        uploading && "pointer-events-none opacity-60",
      )}
    >
      {uploading ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      ) : (
        <ImagePlus className="h-5 w-5" aria-hidden />
      )}
      <span>
        {uploading
          ? t.uploading
          : slot === "avatar" || slot === "cover"
            ? t.chooseImage
            : t.addImage}
      </span>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={slot !== "avatar" && slot !== "cover"}
        className="sr-only"
        onChange={(ev) => {
          onAdd(ev.target.files);
          ev.target.value = "";
        }}
      />
    </label>
  ) : null;

  const tiles = ids.map((id, i) => (
    <SortableTile
      key={id}
      id={id}
      url={media.get(id)?.url ?? null}
      shape={tileShape(slot)}
      sortable={!!onReorder}
      coverLabel={showCover && i === 0 ? t.cardCover : null}
      removeLabel={t.remove}
      dragLabel={t.dragHint}
      onRemove={() => onRemove(id)}
    />
  ));

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        {onReorder ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={ids} strategy={rectSortingStrategy}>
              {tiles}
            </SortableContext>
          </DndContext>
        ) : (
          tiles
        )}
        {addTile}
      </div>
      {showCover ? (
        <p className="text-[11px] text-muted-foreground">{t.dragHint}</p>
      ) : null}
    </div>
  );
}

function SortableTile({
  id,
  url,
  shape,
  sortable,
  coverLabel,
  removeLabel,
  dragLabel,
  onRemove,
}: {
  id: string;
  url: string | null;
  shape: string;
  sortable: boolean;
  coverLabel: string | null;
  removeLabel: string;
  dragLabel: string;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !sortable });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative touch-manipulation select-none overflow-hidden bg-muted",
        shape,
        sortable && "cursor-grab active:cursor-grabbing",
        isDragging && "z-10 opacity-80 shadow-xl ring-2 ring-brand",
      )}
      {...(sortable
        ? { ...attributes, ...listeners, "aria-roledescription": dragLabel }
        : {})}
    >
      {url ? (
        <img
          src={url}
          alt=""
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
        />
      ) : (
        <Loader2
          className="m-auto mt-8 h-5 w-5 animate-spin text-muted-foreground"
          aria-hidden
        />
      )}
      {coverLabel ? (
        <span className="absolute bottom-1 left-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
          {coverLabel}
        </span>
      ) : null}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        aria-label={removeLabel}
        className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground shadow"
      >
        <X className="h-3 w-3" aria-hidden />
      </button>
    </div>
  );
}

function QuickStep({
  t,
  data,
  errors,
  e,
  setAbout,
  update,
  consent,
  setConsent,
  clearErr,
}: {
  t: InviteCopy;
  data: InviteSubmission;
  errors: FieldErrors;
  e: (k: string, m: string) => string | null;
  setAbout: (k: keyof InviteSubmission["about"], v: string) => void;
  update: (fn: (d: InviteSubmission) => InviteSubmission) => void;
  consent: boolean;
  setConsent: (v: boolean) => void;
  clearErr: (k: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2.5 text-2xl font-semibold text-foreground">
          <Link2 className="h-6 w-6 shrink-0 text-brand" aria-hidden />
          {t.quickTitle}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{t.quickSub}</p>
      </div>
      <Field
        id="about.name"
        label={t.name}
        required
        error={e("about.name", t.err.required)}
      >
        <Input
          {...aria("about.name", !!errors["about.name"])}
          value={data.about.name}
          autoComplete="name"
          maxLength={120}
          onChange={(ev) => (
            setAbout("name", ev.target.value),
            clearErr("about.name")
          )}
        />
      </Field>
      <Field
        id="about.email"
        label={t.email}
        required
        error={e("about.email", t.err.email)}
        hint={t.emailHint}
      >
        <Input
          {...aria("about.email", !!errors["about.email"])}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={data.about.email}
          maxLength={254}
          onChange={(ev) => (
            setAbout("email", ev.target.value),
            clearErr("about.email")
          )}
        />
      </Field>
      <Field
        id="quick.portfolio_url"
        label={t.portfolio}
        required
        error={e("quick.portfolio_url", t.err.url)}
      >
        <LinksInput
          id="quick.portfolio_url"
          t={t}
          max={3}
          invalid={!!errors["quick.portfolio_url"]}
          value={data.quick.portfolio_url}
          onChange={(v) => {
            update((d) => ({ ...d, quick: { portfolio_url: v } }));
            clearErr("quick.portfolio_url");
          }}
        />
      </Field>
      <ConsentBox
        id="consent"
        label={t.quickConsent}
        hint={t.consentHint}
        checked={consent}
        error={errors.consent ? t.err.consent : null}
        onChange={(v) => (setConsent(v), clearErr("consent"))}
      />
      <p className="flex gap-2 text-xs text-muted-foreground">
        <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{" "}
        {t.quickNote}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Thanks({
  t,
  invite,
  submission,
  token,
}: {
  t: InviteCopy;
  invite: PublicInvite;
  submission: InviteSubmission;
  token: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand">
        <Check className="h-3.5 w-3.5" aria-hidden /> {t.thanksBadge}
      </span>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        {t.thanksTitle}
      </h1>
      <p className="mt-4 max-w-2xl text-base text-foreground/85">
        {t.thanksBody(
          submission.about.name || invite.display_name,
          submission.about.email,
        )}
      </p>
      <ol className="mt-8 space-y-3 border-l border-border pl-5">
        {t.steps.map(([a, b], i) => (
          <li key={a} className="relative text-sm">
            <span
              className={cn(
                "absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2",
                i === 0
                  ? "border-brand bg-brand"
                  : "border-border bg-background",
              )}
              aria-hidden
            />
            <span className="font-medium text-foreground">{a}</span>
            {b ? <span className="text-muted-foreground"> · {b}</span> : null}
          </li>
        ))}
      </ol>
      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {t.exploreCards.map(([title, sub, href]) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener"
            className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/40"
          >
            <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
              {title} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {sub}
            </span>
          </a>
        ))}
        {invite.can_edit ? (
          <Link
            to={`/invite/creator/${token}/form${invite.submit_mode === "quick" ? "?mode=quick" : ""}`}
            className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/40"
          >
            <span className="text-sm font-semibold text-foreground">
              {t.editSent} →
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {t.editSentSub}
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function Unsubscribe({
  token,
  t,
  already,
}: {
  token: string;
  t: InviteCopy;
  already: boolean;
}) {
  const [done, setDone] = useState(already);
  const [busy, setBusy] = useState(false);
  return (
    <InviteStateCard
      title={t.unsubTitle}
      body={done ? t.unsubDone : t.unsubBody}
    >
      {!done ? (
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await publicInviteApi.unsubscribe(token);
              setDone(true);
            } catch (err) {
              toast.error(errText(t, err));
            } finally {
              setBusy(false);
            }
          }}
        >
          {t.unsubBtn}
        </Button>
      ) : (
        <Button asChild variant="outline">
          <Link to={`/invite/creator/${token}`}>{t.pathA} →</Link>
        </Button>
      )}
    </InviteStateCard>
  );
}
