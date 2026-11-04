import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, ImagePlus, Loader2, Mail, X } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import InviteProfilePreview from "@/components/invite/InviteProfilePreview";
import InviteLanding from "@/components/invite/InviteLanding";
import { InviteShell, InviteStateCard } from "@/components/invite/InviteShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  BIO_MAX,
  INVITE_DISCIPLINES,
  InviteApiError,
  MAX_IMAGES_PER_PROJECT,
  emptyProject,
  isTokenShape,
  normalizeSubmission,
  publicInviteApi,
  rememberSelfSignup,
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

const backupKey = (token: string) => `samecor.creatorInvite.draft.${token.slice(0, 12)}`;

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
    retry: (n, e) => !(e instanceof InviteApiError && [404, 410, 429].includes(e.status)) && n < 2,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const [lang, setLang] = useState<PageLang | null>(null);
  const effectiveLang: PageLang = lang ?? q.data?.invite.language ?? "th";
  const t = inviteCopy(effectiveLang);
  const [submitted, setSubmitted] = useState(false);

  const seo = <SeoHead title="Creator invitation" path="/invite" noindex />;

  if (!validToken || (q.error instanceof InviteApiError && q.error.status === 404)) {
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
        <InviteStateCard title={expired ? t.expiredTitle : t.err.generic} body={expired ? t.expiredBody : ""} />
      </InviteShell>
    );
  }
  if (!q.data) {
    return (
      <InviteShell lang={effectiveLang} onLang={setLang} t={t}>
        {seo}
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
        </div>
      </InviteShell>
    );
  }

  const { invite } = q.data;
  let body: React.ReactNode;
  if (params.get("unsubscribe") === "1") body = <Unsubscribe token={token} t={t} already={invite.unsubscribed} />;
  else if (submitted || (invite.status === "submitted" && !formRoute))
    body = <Thanks t={t} invite={invite} submission={normalizeSubmission(q.data.submission, invite)} token={token} />;
  else if (!invite.can_edit) body = <InviteStateCard title={t.statusTitle[invite.status] ?? t.expiredTitle} body="" explore={t} />;
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
  else body = <InviteLanding token={token} t={t} invite={invite} />;

  return (
    <InviteShell lang={effectiveLang} onLang={setLang} t={t}>
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
    if (initial) return normalizeSubmission(initial, invite);
    try {
      const raw = localStorage.getItem(backupKey(token));
      if (raw) return normalizeSubmission(JSON.parse(raw).data, invite);
    } catch {
      /* ignore */
    }
    return normalizeSubmission(null, invite);
  });
  const [media, setMedia] = useState(() => new Map(initialMedia.map((m) => [m.id, m])));
  const [step, setStep] = useState<1 | 2 | 3>(() => {
    try {
      const s = Number(JSON.parse(localStorage.getItem(backupKey(token)) ?? "{}").step);
      return s === 2 || s === 3 ? s : 1;
    } catch {
      return 1;
    }
  });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [uploading, setUploading] = useState<MediaSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const previewRef = useRef<HTMLElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const dirty = useRef(false);

  const clean = useMemo(() => new Set([...media.values()].filter((m) => m.scan_status === "clean").map((m) => m.id)), [media]);

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
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    }, 1200);
    return () => window.clearTimeout(id);
  }, [data, step, token]);

  const update = useCallback((fn: (d: InviteSubmission) => InviteSubmission) => {
    dirty.current = true;
    setData((d) => fn(d));
  }, []);
  const setAbout = (k: keyof InviteSubmission["about"], v: string | null) => update((d) => ({ ...d, about: { ...d.about, [k]: v } }));
  const setProject = (i: number, patch: Partial<InviteSubmission["projects"][number]>) =>
    update((d) => ({ ...d, projects: d.projects.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));

  const e = (k: string, msg: string) => (errors[k] ? msg : null);
  const clearErr = (k: string) => errors[k] && setErrors(({ [k]: _drop, ...rest }) => rest);

  async function addFiles(slot: MediaSlot, files: FileList | null) {
    if (!files?.length) return;
    setUploading(slot);
    try {
      for (const file of Array.from(files)) {
        if (slot !== "avatar") {
          const p = data.projects.find((x) => x.slot === slot);
          if (p && p.media.length >= MAX_IMAGES_PER_PROJECT) {
            toast.error(t.err.too_many_files);
            break;
          }
        }
        try {
          const m = await uploadInviteImage(token, slot, file);
          setMedia((prev) => new Map(prev).set(m.id, m));
          if (slot === "avatar") setAbout("avatar", m.id);
          else {
            update((d) => ({ ...d, projects: d.projects.map((p) => (p.slot === slot ? { ...p, media: [...p.media, m.id] } : p)) }));
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
    if (slot === "avatar") setAbout("avatar", null);
    else update((d) => ({ ...d, projects: d.projects.map((p) => (p.slot === slot ? { ...p, media: p.media.filter((x) => x !== id) } : p)) }));
  }

  function moveImage(i: number, from: number, dir: -1 | 1) {
    update((d) => ({
      ...d,
      projects: d.projects.map((p, j) => {
        if (j !== i) return p;
        const to = from + dir;
        if (to < 0 || to >= p.media.length) return p;
        const m = [...p.media];
        [m[from], m[to]] = [m[to], m[from]];
        return { ...p, media: m };
      }),
    }));
  }

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const focusFirstError = (errs: FieldErrors) => {
    const first = Object.keys(errs)[0];
    if (!first) return;
    window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-field="${first}"] input, [data-field="${first}"] textarea, [data-field="${first}"] button`);
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
    const errs = mode === "quick" ? validateQuick(data, consent) : validateStep(3, data, clean, consent);
    if (mode === "full") {
      for (const s of [1, 2] as const) Object.assign(errs, validateStep(s, data, clean, consent));
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
      await queryClient.invalidateQueries({ queryKey: ["creator-invite", token] });
      onSubmitted();
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (err instanceof InviteApiError && err.fields?.length) {
        const fe = Object.fromEntries(err.fields.map((f) => [f, true])) as FieldErrors;
        setErrors(fe);
        toast.error(t.err.fix);
      } else toast.error(errText(t, err));
    } finally {
      setSubmitting(false);
    }
  }

  const saveLabel = saveState === "saving" ? t.saving : saveState === "saved" ? t.saved : saveState === "error" ? t.saveFailed : "";

  const modeSwitch = (
    <div className="inline-flex rounded-full border border-border p-0.5 text-xs" role="group" aria-label="Form mode">
      {[
        [false, t.full],
        [true, t.quick],
      ].map(([isQuick, label]) => (
        <button
          key={String(isQuick)}
          type="button"
          aria-pressed={quick === isQuick}
          onClick={() => navigate(`/invite/creator/${token}/form${isQuick ? "?mode=quick" : ""}`, { replace: true })}
          className={cn("rounded-full px-3 py-1.5 font-medium", quick === isQuick ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
        >
          {label as string}
        </button>
      ))}
    </div>
  );

  return (
    <div ref={topRef} className="mx-auto max-w-3xl scroll-mt-20 px-4 py-6 sm:py-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link to={`/invite/creator/${token}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {t.private} · {invite.display_name}
        </Link>
        {modeSwitch}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 sm:p-8">
        {quick ? (
          <QuickStep t={t} data={data} errors={errors} e={e} setAbout={setAbout} update={update} consent={consent} setConsent={setConsent} clearErr={clearErr} />
        ) : (
          <>
            <Stepper step={step} t={t} />
            {step === 1 ? (
              <div className="space-y-5">
                <StepHead n={1} title={t.s1} />
                <Field id="about.name" label={t.name} required error={e("about.name", t.err.required)} hint={t.nameHint}>
                  <Input {...aria("about.name", !!errors["about.name"])} value={data.about.name} autoComplete="name" maxLength={120} onChange={(ev) => (setAbout("name", ev.target.value), clearErr("about.name"))} />
                </Field>
                <Field id="about.discipline" label={t.discipline} required error={e("about.discipline", t.err.required)}>
                  <Select value={data.about.discipline} onValueChange={(v) => (setAbout("discipline", v), clearErr("about.discipline"))}>
                    <SelectTrigger {...aria("about.discipline", !!errors["about.discipline"])}>
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
                <Field id="about.bio" label={t.bio} error={e("about.bio", t.err.bio)} hint={`${data.about.bio.length} / ${BIO_MAX}`}>
                  <Textarea {...aria("about.bio", !!errors["about.bio"])} rows={3} maxLength={BIO_MAX} value={data.about.bio} onChange={(ev) => setAbout("bio", ev.target.value)} />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="about.city" label={t.city}>
                    <Input {...aria("about.city", false)} value={data.about.city} maxLength={120} autoComplete="address-level2" onChange={(ev) => setAbout("city", ev.target.value)} />
                  </Field>
                  <Field id="about.email" label={t.email} required error={e("about.email", t.err.email)} hint={t.emailHint}>
                    <Input {...aria("about.email", !!errors["about.email"])} type="email" inputMode="email" autoComplete="email" value={data.about.email} maxLength={254} onChange={(ev) => (setAbout("email", ev.target.value), clearErr("about.email"))} />
                  </Field>
                </div>
                <Field id="about.links" label={t.links}>
                  <Input {...aria("about.links", false)} value={data.about.links} maxLength={500} placeholder="https://" onChange={(ev) => setAbout("links", ev.target.value)} />
                </Field>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">{t.avatar}</p>
                  <ImageStrip
                    t={t}
                    ids={data.about.avatar ? [data.about.avatar] : []}
                    media={media}
                    slot="avatar"
                    uploading={uploading === "avatar"}
                    canAdd={!data.about.avatar}
                    onAdd={(f) => void addFiles("avatar", f)}
                    onRemove={(id) => removeImage("avatar", id)}
                  />
                </div>
              </div>
            ) : step === 2 ? (
              <div className="space-y-6">
                <StepHead n={2} title={t.s2} sub={t.s2intro} />
                {data.projects.map((p, i) => (
                  <div key={p.slot} className="space-y-4 rounded-xl border border-border p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{t.project(i + 1)}</h3>
                      {i > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            p.media.forEach((m) => void publicInviteApi.removeMedia(token, m).catch(() => undefined));
                            update((d) => ({ ...d, projects: d.projects.filter((_, j) => j !== i) }));
                          }}
                        >
                          {t.remove}
                        </Button>
                      ) : null}
                    </div>
                    <Field id={`projects.${i}.title`} label={t.title} required error={e(`projects.${i}.title`, t.err.required)}>
                      <Input {...aria(`projects.${i}.title`, !!errors[`projects.${i}.title`])} value={p.title} maxLength={120} onChange={(ev) => (setProject(i, { title: ev.target.value }), clearErr(`projects.${i}.title`))} />
                    </Field>
                    <Field id={`projects.${i}.description`} label={t.desc}>
                      <Textarea {...aria(`projects.${i}.description`, false)} rows={3} maxLength={1000} value={p.description} onChange={(ev) => setProject(i, { description: ev.target.value })} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field id={`projects.${i}.role`} label={t.role}>
                        <Input {...aria(`projects.${i}.role`, false)} value={p.role} maxLength={120} onChange={(ev) => setProject(i, { role: ev.target.value })} />
                      </Field>
                      <Field id={`projects.${i}.url`} label={t.projectUrl} error={e(`projects.${i}.url`, t.err.url)}>
                        <Input {...aria(`projects.${i}.url`, !!errors[`projects.${i}.url`])} type="url" placeholder="https://" value={p.url} maxLength={500} onChange={(ev) => (setProject(i, { url: ev.target.value }), clearErr(`projects.${i}.url`))} />
                      </Field>
                    </div>
                    <div className="space-y-1.5" data-field={`projects.${i}.media`}>
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
                        onMove={(from, dir) => moveImage(i, from, dir)}
                      />
                      <p className={cn("text-xs", errors[`projects.${i}.media`] ? "font-medium text-destructive" : "text-muted-foreground")}>
                        {errors[`projects.${i}.media`] ? t.err.media : t.imageRules}
                      </p>
                    </div>
                    <div data-field={`projects.${i}.rights`}>
                      <label className="flex items-start gap-2.5 text-sm">
                        <Checkbox
                          id={`projects.${i}.rights`}
                          checked={p.rights}
                          onCheckedChange={(v) => (setProject(i, { rights: v === true }), clearErr(`projects.${i}.rights`))}
                          aria-invalid={!!errors[`projects.${i}.rights`] || undefined}
                          className="mt-0.5"
                        />
                        <span>{t.rights}</span>
                      </label>
                      {errors[`projects.${i}.rights`] ? <p className="mt-1 pl-7 text-xs font-medium text-destructive">{t.err.rights}</p> : null}
                    </div>
                  </div>
                ))}
                {data.projects.length < 2 ? (
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => update((d) => ({ ...d, projects: [...d.projects, emptyProject("p2")] }))}>
                    + {t.addProject}
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-5">
                <StepHead n={3} title={t.s3} />
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl bg-muted/50 p-4 text-sm">
                  <dt className="text-muted-foreground">{t.name}</dt>
                  <dd>
                    {data.about.name} · {data.about.discipline}
                  </dd>
                  <dt className="text-muted-foreground">{t.email}</dt>
                  <dd className="break-all">{data.about.email}</dd>
                  <dt className="text-muted-foreground">{t.works}</dt>
                  <dd>{data.projects.map((p) => p.title || t.untitled).join(", ")}</dd>
                </dl>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-semibold">{t.privacyTitle}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t.privacy}</p>
                </div>
                <ConsentBox id="consent" label={t.consent} hint={t.consentHint} checked={consent} error={errors.consent ? t.err.consent : null} onChange={(v) => (setConsent(v), clearErr("consent"))} />
                <Field id="contact_pref" label={t.contactPref}>
                  <Select value={data.contact_pref} onValueChange={(v) => update((d) => ({ ...d, contact_pref: v as InviteSubmission["contact_pref"] }))}>
                    <SelectTrigger id="contact_pref">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(t.contactOptions) as (keyof typeof t.contactOptions)[]).map((k) => (
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
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => (setStep((s) => (s - 1) as 1 | 2), scrollTop())}>
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> {t.back}
            </Button>
          ) : null}
          <span className="text-xs text-muted-foreground sm:mr-auto" aria-live="polite">
            {saveLabel}
          </span>
          <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            {t.pvBtn} ↓
          </Button>
          {quick || step === 3 ? (
            <Button type="button" className="w-full sm:w-auto" disabled={submitting || !!uploading} onClick={() => void submit(quick ? "quick" : "full")}>
              {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : null}
              {t.submit}
            </Button>
          ) : (
            <Button type="button" className="w-full sm:w-auto" disabled={!!uploading} onClick={next}>
              {t.next} <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>

      <InviteProfilePreview ref={previewRef} className="mt-8" data={data} media={media} t={t} badge={t.pvBadge} />
      <p className="mt-6 text-center text-xs text-muted-foreground">
        <a href="/learn" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-foreground">
          {t.explore} ↗
        </a>{" "}
        · {t.exploreHint}
      </p>
    </div>
  );
}

function Stepper({ step, t }: { step: number; t: InviteCopy }) {
  return (
    <div className="mb-6 flex items-center gap-2" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step} aria-label={t.stepOf(step)}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-brand" : "bg-muted")} />
      ))}
    </div>
  );
}

function StepHead({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <div>
      <p className="font-mono text-xs text-muted-foreground">0{n} / 3</p>
      <h2 className="mt-1 text-2xl font-semibold text-foreground">{title}</h2>
      {sub ? <p className="mt-1.5 text-sm text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function ConsentBox({ id, label, hint, checked, error, onChange }: { id: string; label: string; hint: string; checked: boolean; error: string | null; onChange: (v: boolean) => void }) {
  return (
    <div data-field={id} className={cn("rounded-xl border p-4", error ? "border-destructive" : "border-border")}>
      <label className="flex items-start gap-2.5 text-sm">
        <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} aria-invalid={!!error || undefined} className="mt-0.5" />
        <span>{label}</span>
      </label>
      <p className={cn("mt-1.5 pl-7 text-xs", error ? "font-medium text-destructive" : "text-muted-foreground")}>{error ?? hint}</p>
    </div>
  );
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
  onMove,
}: {
  t: InviteCopy;
  ids: string[];
  media: Map<string, InviteMedia>;
  slot: MediaSlot;
  uploading: boolean;
  canAdd: boolean;
  onAdd: (files: FileList | null) => void;
  onRemove: (id: string) => void;
  onMove?: (from: number, dir: -1 | 1) => void;
}) {
  const inputId = `upload-${slot}`;
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id, i) => {
        const m = media.get(id);
        return (
          <div key={id} className={cn("group relative h-20 w-20 overflow-hidden bg-muted sm:h-24 sm:w-24", slot === "avatar" ? "rounded-full" : "rounded-lg")}>
            {m?.url ? <img src={m.url} alt="" className="h-full w-full object-cover" /> : <Loader2 className="m-auto mt-8 h-5 w-5 animate-spin text-muted-foreground" aria-hidden />}
            <button type="button" onClick={() => onRemove(id)} aria-label={t.remove} className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground shadow">
              <X className="h-3 w-3" aria-hidden />
            </button>
            {onMove && ids.length > 1 ? (
              <div className="absolute inset-x-1 bottom-1 flex justify-between">
                <button type="button" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label={t.moveLeft} className="rounded-full bg-background/90 p-0.5 disabled:opacity-0">
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button type="button" disabled={i === ids.length - 1} onClick={() => onMove(i, 1)} aria-label={t.moveRight} className="rounded-full bg-background/90 p-0.5 disabled:opacity-0">
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
      {canAdd ? (
        <label
          htmlFor={inputId}
          className={cn(
            "flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-border text-[11px] text-muted-foreground hover:border-foreground/40 hover:text-foreground sm:h-24 sm:w-24",
            slot === "avatar" ? "rounded-full" : "rounded-lg",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ImagePlus className="h-5 w-5" aria-hidden />}
          <span>{uploading ? t.uploading : slot === "avatar" ? t.chooseImage : t.addImage}</span>
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple={slot !== "avatar"}
            className="sr-only"
            onChange={(ev) => {
              onAdd(ev.target.files);
              ev.target.value = "";
            }}
          />
        </label>
      ) : null}
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
        <h2 className="text-2xl font-semibold text-foreground">{t.quickTitle}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{t.quickSub}</p>
      </div>
      <Field id="about.name" label={t.name} required error={e("about.name", t.err.required)}>
        <Input {...aria("about.name", !!errors["about.name"])} value={data.about.name} autoComplete="name" maxLength={120} onChange={(ev) => (setAbout("name", ev.target.value), clearErr("about.name"))} />
      </Field>
      <Field id="about.email" label={t.email} required error={e("about.email", t.err.email)} hint={t.emailHint}>
        <Input {...aria("about.email", !!errors["about.email"])} type="email" inputMode="email" autoComplete="email" value={data.about.email} maxLength={254} onChange={(ev) => (setAbout("email", ev.target.value), clearErr("about.email"))} />
      </Field>
      <Field id="quick.portfolio_url" label={t.portfolio} required error={e("quick.portfolio_url", t.err.url)}>
        <Input
          {...aria("quick.portfolio_url", !!errors["quick.portfolio_url"])}
          type="url"
          placeholder="https://"
          value={data.quick.portfolio_url}
          maxLength={500}
          onChange={(ev) => {
            const v = ev.target.value;
            update((d) => ({ ...d, quick: { portfolio_url: v } }));
            clearErr("quick.portfolio_url");
          }}
        />
      </Field>
      <ConsentBox id="consent" label={t.quickConsent} hint={t.consentHint} checked={consent} error={errors.consent ? t.err.consent : null} onChange={(v) => (setConsent(v), clearErr("consent"))} />
      <p className="flex gap-2 text-xs text-muted-foreground">
        <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {t.quickNote}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Thanks({ t, invite, submission, token }: { t: InviteCopy; invite: PublicInvite; submission: InviteSubmission; token: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand">
        <Check className="h-3.5 w-3.5" aria-hidden /> {t.thanksBadge}
      </span>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">{t.thanksTitle}</h1>
      <p className="mt-4 max-w-2xl text-base text-foreground/85">{t.thanksBody(submission.about.name || invite.display_name, submission.about.email)}</p>
      <ol className="mt-8 space-y-3 border-l border-border pl-5">
        {t.steps.map(([a, b], i) => (
          <li key={a} className="relative text-sm">
            <span className={cn("absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2", i === 0 ? "border-brand bg-brand" : "border-border bg-background")} aria-hidden />
            <span className="font-medium text-foreground">{a}</span>
            {b ? <span className="text-muted-foreground"> · {b}</span> : null}
          </li>
        ))}
      </ol>
      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {t.exploreCards.map(([title, sub, href]) => (
          <a key={href} href={href} target="_blank" rel="noopener" className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/40">
            <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
              {title} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">{sub}</span>
          </a>
        ))}
        {invite.can_edit ? (
          <Link to={`/invite/creator/${token}/form${invite.submit_mode === "quick" ? "?mode=quick" : ""}`} className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/40">
            <span className="text-sm font-semibold text-foreground">{t.editSent} →</span>
            <span className="mt-1 block text-xs text-muted-foreground">{t.editSentSub}</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function Unsubscribe({ token, t, already }: { token: string; t: InviteCopy; already: boolean }) {
  const [done, setDone] = useState(already);
  const [busy, setBusy] = useState(false);
  return (
    <InviteStateCard title={t.unsubTitle} body={done ? t.unsubDone : t.unsubBody}>
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
