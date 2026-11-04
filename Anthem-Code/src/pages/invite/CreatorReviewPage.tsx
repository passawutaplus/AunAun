import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { enUS, th as thLocale, zhCN } from "date-fns/locale";
import { toast } from "sonner";
import {
  Check,
  ImagePlus,
  Loader2,
  PencilLine,
  ScanEye,
  TriangleAlert,
  X,
} from "lucide-react";
import SadBuddy from "@/components/invite/SadBuddy";
import SeoHead from "@/components/SeoHead";
import InviteProfilePreview from "@/components/invite/InviteProfilePreview";
import InviteProjectPreview from "@/components/invite/InviteProjectPreview";
import { InviteShell, InviteStateCard } from "@/components/invite/InviteShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  InviteApiError,
  isTokenShape,
  normalizeSubmission,
  publicInviteApi,
  uploadInviteImage,
  type InviteMedia,
  type PageLang,
} from "@/lib/creatorInvite";
import { inviteCopy } from "@/lib/creatorInviteCopy";

type Decision = "approve" | "changes" | "decline";

export default function CreatorReviewPage() {
  const { token = "" } = useParams();
  const validToken = isTokenShape(token);
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ["creator-invite-review", token],
    queryFn: () => publicInviteApi.reviewLoad(token),
    enabled: validToken,
    retry: (n, e) =>
      !(e instanceof InviteApiError && [404, 410, 429].includes(e.status)) &&
      n < 2,
    refetchOnWindowFocus: false,
  });
  const [lang, setLang] = useState<PageLang | null>(null);
  const l: PageLang = lang ?? "en";
  const t = inviteCopy(l);
  const [dialog, setDialog] = useState<"changes" | "decline" | null>(null);
  const [note, setNote] = useState("");
  // Request changes: which parts (profile card / project slots) and what to change in each
  const [parts, setParts] = useState<Record<string, string | undefined>>({});
  const [attach, setAttach] = useState<Record<string, InviteMedia[]>>({});
  const [uploadingPart, setUploadingPart] = useState<string | null>(null);
  const [busy, setBusy] = useState<Decision | null>(null);
  const [done, setDone] = useState<Decision | null>(null);
  const [published, setPublished] = useState(false);
  // Change requests keep the artist on this page; they can ask again (round 2, 3…) or approve later.
  const [changeRounds, setChangeRounds] = useState(0);

  const media = useMemo(
    () => new Map((q.data?.media ?? []).map((m) => [m.id, m])),
    [q.data],
  );
  const profile = useMemo(() => normalizeSubmission(q.data?.profile), [q.data]);

  const seo = <SeoHead title="Review your profile" path="/invite" noindex />;

  if (!validToken || q.error) {
    const expired = q.error instanceof InviteApiError && q.error.status === 410;
    return (
      <InviteShell lang={l} onLang={setLang} t={t}>
        {seo}
        <InviteStateCard
          title={expired ? t.expiredTitle : t.notFoundTitle}
          body={t.expiredBody}
        />
      </InviteShell>
    );
  }
  if (!q.data) {
    return (
      <InviteShell lang={l} onLang={setLang} t={t}>
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

  const status = q.data.invite.status;
  const decidable = status === "preparing" || status === "needs_changes";

  const partList = [
    { key: "profile", label: t.partProfile },
    ...profile.projects.map((p, i) => ({
      key: p.slot,
      label: `Project ${i + 1}${p.title ? ` · ${p.title}` : ""}`,
    })),
  ];
  const changesNote = () =>
    [
      ...partList
        .filter(
          (x) =>
            parts[x.key] !== undefined &&
            (parts[x.key]!.trim() || attach[x.key]?.length),
        )
        .map((x) => {
          const n = attach[x.key]?.length ?? 0;
          return `• ${x.label}: ${parts[x.key]!.trim()}${n ? ` [${t.attachedCount(n)}]` : ""}`;
        }),
      ...(note.trim() ? [`${t.extraNote}: ${note.trim()}`] : []),
    ].join("\n");
  const canSendChanges = !!changesNote().trim() && !uploadingPart;

  async function addAttachments(key: string, files: FileList | null) {
    if (!files?.length) return;
    setUploadingPart(key);
    try {
      for (const f of Array.from(files).slice(
        0,
        4 - (attach[key]?.length ?? 0),
      )) {
        try {
          const m = await uploadInviteImage(token, "extra", f, "review");
          setAttach((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), m] }));
        } catch (err) {
          const code = err instanceof InviteApiError ? err.code : "generic";
          toast.error(
            `${f.name}: ${(t.err as Record<string, string>)[code] ?? t.err.generic}`,
          );
        }
      }
    } finally {
      setUploadingPart(null);
    }
  }

  function removeAttachment(key: string, id: string) {
    void publicInviteApi.reviewRemoveMedia(token, id).catch(() => undefined);
    setAttach((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((m) => m.id !== id),
    }));
  }

  async function decide(decision: Decision) {
    setBusy(decision);
    try {
      const res = await publicInviteApi.reviewDecide(
        token,
        decision,
        (decision === "changes" ? changesNote() : note.trim()) || undefined,
      );
      setDialog(null);
      if (decision === "changes") {
        setChangeRounds((n) => n + 1);
        toast.success(t.doneChanges);
      } else {
        if (decision === "approve") setPublished(!!res.published);
        setDone(decision);
      }
      void queryClient.invalidateQueries({
        queryKey: ["creator-invite-review", token],
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const code = err instanceof InviteApiError ? err.code : "generic";
      toast.error((t.err as Record<string, string>)[code] ?? t.err.generic);
    } finally {
      setBusy(null);
    }
  }

  if (done === "decline") {
    return (
      <InviteShell lang={l} onLang={setLang} t={t}>
        {seo}
        <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center sm:py-24">
          <SadBuddy className="h-24 w-24" />
          <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-foreground">
            {t.declinedTitle}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{t.declinedBody}</p>
          <Button asChild className="mt-8 rounded-full px-6">
            <a href="/">{t.backHome}</a>
          </Button>
        </div>
      </InviteShell>
    );
  }

  if (done || (!decidable && changeRounds === 0)) {
    const msg =
      done === "approve" ? (published ? t.donePublished : t.doneApprove) : "";
    return (
      <InviteShell lang={l} onLang={setLang} t={t}>
        {seo}
        <InviteStateCard
          title={
            done === "approve"
              ? published
                ? t.statusTitle.published
                : t.statusTitle.approved
              : (t.statusTitle[status] ?? t.expiredTitle)
          }
          body={msg}
          explore={t}
        />
      </InviteShell>
    );
  }

  const expires = q.data.invite.review_expires_at
    ? format(new Date(q.data.invite.review_expires_at), "d MMM yyyy", {
        locale: l === "en" ? enUS : l === "zh" ? zhCN : thLocale,
      })
    : null;

  const actions = (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        className="w-full sm:w-auto"
        disabled={!!busy}
        onClick={() => void decide("approve")}
      >
        {busy === "approve" ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Check className="mr-1.5 h-4 w-4" aria-hidden />
        )}
        {t.approve}
      </Button>
      <Button
        variant="outline"
        className="w-full sm:w-auto"
        disabled={!!busy}
        onClick={() => (
          setNote(""),
          setParts({}),
          setAttach({}),
          setDialog("changes")
        )}
      >
        {t.changes}
      </Button>
      <Button
        variant="ghost"
        className="w-full text-muted-foreground sm:ml-auto sm:w-auto"
        disabled={!!busy}
        onClick={() => (setNote(""), setDialog("decline"))}
      >
        {t.decline}
      </Button>
    </div>
  );

  return (
    <InviteShell lang={l} onLang={setLang} t={t}>
      {seo}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <span className="inline-flex rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand">
          {t.reviewBadge}
          {expires ? ` · ${t.expiresIn(expires)}` : ""}
        </span>
        <h1 className="mt-4 flex items-center gap-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          <ScanEye
            className="h-8 w-8 shrink-0 text-brand sm:h-9 sm:w-9"
            aria-hidden
          />
          {t.reviewTitle}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{t.reviewBody}</p>
        {changeRounds > 0 || status === "needs_changes" ? (
          <div
            role="status"
            className="mt-5 flex items-start gap-3 rounded-xl border border-brand/40 bg-brand/10 p-4 text-sm"
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            <span className="text-foreground">
              {t.changesSentBanner(Math.max(changeRounds, 1))}
            </span>
          </div>
        ) : null}

        <div className="mt-6">{actions}</div>

        <InviteProfilePreview
          className="mt-6"
          data={profile}
          media={media}
          t={t}
          badge={t.reviewDraftBadge}
          collapsible={false}
        />
        {profile.projects.map((p, i) => (
          <InviteProjectPreview
            key={p.slot}
            className="mt-6"
            project={p}
            index={i}
            name={profile.about.name}
            media={media}
            t={t}
            badge={t.reviewDraftBadge}
          />
        ))}
        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          {actions}
        </div>
      </div>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialog === "decline" ? (
                <TriangleAlert
                  className="h-5 w-5 shrink-0 text-destructive"
                  aria-hidden
                />
              ) : (
                <PencilLine
                  className="h-5 w-5 shrink-0 text-brand"
                  aria-hidden
                />
              )}
              {dialog === "decline" ? t.declineTitle : t.changesTitle}
            </DialogTitle>
            <DialogDescription>
              {dialog === "decline" ? t.declineBody : t.changesHint}
            </DialogDescription>
          </DialogHeader>

          {dialog === "changes" ? (
            <div className="space-y-4">
              <p className="text-sm font-medium">{t.partsLabel}</p>
              <div className="space-y-2">
                {partList.map((x) => {
                  const on = parts[x.key] !== undefined;
                  return (
                    <div
                      key={x.key}
                      className={
                        on
                          ? "rounded-xl border border-brand/50 p-3"
                          : "rounded-xl border border-border p-3"
                      }
                    >
                      <label className="flex items-center gap-2.5 text-sm font-medium">
                        <Checkbox
                          checked={on}
                          onCheckedChange={(v) =>
                            setParts((prev) => {
                              const next = { ...prev };
                              if (v === true) next[x.key] = next[x.key] ?? "";
                              else delete next[x.key];
                              return next;
                            })
                          }
                        />
                        <span className="min-w-0 truncate">{x.label}</span>
                      </label>
                      {on ? (
                        <Textarea
                          aria-label={x.label}
                          className="mt-2"
                          rows={2}
                          maxLength={400}
                          placeholder={t.partPlaceholder}
                          value={parts[x.key] ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setParts((prev) => ({ ...prev, [x.key]: v }));
                          }}
                        />
                      ) : null}
                      {on ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {(attach[x.key] ?? []).map((m) => (
                            <span
                              key={m.id}
                              className="relative h-14 w-14 overflow-hidden rounded bg-muted"
                            >
                              {m.url ? (
                                <img
                                  src={m.url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                              <button
                                type="button"
                                aria-label={t.remove}
                                onClick={() => removeAttachment(x.key, m.id)}
                                className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5"
                              >
                                <X className="h-3 w-3" aria-hidden />
                              </button>
                            </span>
                          ))}
                          {(attach[x.key]?.length ?? 0) < 4 ? (
                            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-border px-3 text-xs text-muted-foreground hover:text-foreground">
                              {uploadingPart === x.key ? (
                                <Loader2
                                  className="h-3.5 w-3.5 animate-spin"
                                  aria-hidden
                                />
                              ) : (
                                <ImagePlus
                                  className="h-3.5 w-3.5"
                                  aria-hidden
                                />
                              )}
                              {t.attachImage}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                className="sr-only"
                                onChange={(e) => {
                                  void addAttachments(x.key, e.target.files);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-1.5 border-t border-border pt-4">
                <Label htmlFor="review-note">
                  {t.extraNote}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {t.extraNoteHint}
                  </span>
                </Label>
                <Textarea
                  id="review-note"
                  rows={3}
                  maxLength={600}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <SadBuddy className="mx-auto mb-2 h-24 w-24 text-foreground" />
              <Label htmlFor="review-note">{t.declineNote}</Label>
              <Textarea
                id="review-note"
                rows={4}
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialog(null)}>
              {t.cancel}
            </Button>
            <Button
              variant={dialog === "decline" ? "destructive" : "default"}
              disabled={!!busy || (dialog === "changes" && !canSendChanges)}
              onClick={() =>
                void decide(dialog === "decline" ? "decline" : "changes")
              }
            >
              {busy ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {dialog === "decline" ? t.confirmDecline : t.send}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </InviteShell>
  );
}
