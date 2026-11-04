import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { enUS, th as thLocale, zhCN } from "date-fns/locale";
import { toast } from "sonner";
import { Check, Loader2, ScanEye } from "lucide-react";
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
import {
  InviteApiError,
  isTokenShape,
  normalizeSubmission,
  publicInviteApi,
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
  const [busy, setBusy] = useState<Decision | null>(null);
  const [done, setDone] = useState<Decision | null>(null);

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

  async function decide(decision: Decision) {
    setBusy(decision);
    try {
      await publicInviteApi.reviewDecide(
        token,
        decision,
        note.trim() || undefined,
      );
      setDone(decision);
      setDialog(null);
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

  if (done || !decidable) {
    const msg =
      done === "approve"
        ? t.doneApprove
        : done === "changes"
          ? t.doneChanges
          : done === "decline"
            ? t.doneDecline
            : "";
    return (
      <InviteShell lang={l} onLang={setLang} t={t}>
        {seo}
        <InviteStateCard
          title={
            done
              ? done === "decline"
                ? t.statusTitle.declined
                : done === "approve"
                  ? t.statusTitle.approved
                  : t.statusTitle.needs_changes
              : (t.statusTitle[status] ?? t.expiredTitle)
          }
          body={msg}
          explore={t}
        />
      </InviteShell>
    );
  }

  const images = profile.projects.reduce(
    (a, p) => a + p.media.filter((m) => media.get(m)?.url).length,
    0,
  );
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
        onClick={() => (setNote(""), setDialog("changes"))}
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

        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">{t.willPublish}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/85">
            {t
              .willPublishItems(
                profile.about.name,
                profile.about.links,
                profile.projects.length,
                images,
              )
              .map((x) => (
                <li key={x} className="break-words">
                  {x}
                </li>
              ))}
          </ul>
          <div className="mt-5 border-t border-border pt-5">{actions}</div>
        </div>

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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog === "decline" ? t.declineTitle : t.changesTitle}
            </DialogTitle>
            <DialogDescription>
              {dialog === "decline" ? t.declineBody : t.changesHint}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="review-note">
              {dialog === "decline" ? t.declineNote : t.changesTitle}
            </Label>
            <Textarea
              id="review-note"
              rows={4}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialog(null)}>
              {t.cancel}
            </Button>
            <Button
              variant={dialog === "decline" ? "destructive" : "default"}
              disabled={!!busy || (dialog === "changes" && !note.trim())}
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
