import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Flag, Loader2 } from "lucide-react";
import { useCreateReport, type ReportReason, type ReportTargetType, type EvidenceFile } from "@/hooks/useReports";
import { useAuth } from "@/hooks/useAuth";
import EvidenceUploader from "./EvidenceUploader";
import { COMMON, tr, useT } from "@/lib/i18n";
import { REPORT } from "@/lib/i18n/report";
import { useAuthDialog } from "@/stores/authDialogStore";
import { useEnsureSensitiveAction } from "@/components/legal/SensitiveActionReauthProvider";
import { safeHttpUrl } from "@/lib/safeUrl";
import { useBlockUser, useUserBlocks } from "@/hooks/useCommunityPostInteractions";

/** UI-only; RPC allow-list has no dedicated code — maps to `other` with a details prefix. */
const AI_UNDISCLOSED = "ai_undisclosed" as const;
/** Stored with the report for the review team, so it stays Thai whatever the reporter's language. */
const AI_UNDISCLOSED_PREFIX = REPORT.ai_undisclosed.th;

type ReportReasonChoice = ReportReason | typeof AI_UNDISCLOSED;

/** Order shown in the dialog; each value is also its key in REPORT. */
const REASONS: ReportReasonChoice[] = [
  "spam",
  "job_spam",
  "harassment",
  "nsfw",
  "copyright",
  AI_UNDISCLOSED,
  "scam",
  "impersonation",
  "other",
];

interface Props {
  targetType: ReportTargetType;
  targetId: string;
  targetOwnerId?: string | null;
  children?: React.ReactNode;
  /** Controlled open (e.g. from message ⋮ menu). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hide the default trigger when controlling open from outside. */
  hideTrigger?: boolean;
}

const ReportDialog = ({
  targetType,
  targetId,
  targetOwnerId,
  children,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  hideTrigger = false,
}: Props) => {
  const { user } = useAuth();
  const openLogin = useAuthDialog((s) => s.openLogin);
  const create = useCreateReport();
  const blockUser = useBlockUser();
  const { data: blockedSet } = useUserBlocks(user?.id);
  const ensureVerified = useEnsureSensitiveAction();
  const t = useT(REPORT);
  const tc = useT(COMMON);

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = onOpenChangeProp ?? setUncontrolledOpen;
  const [reason, setReason] = useState<ReportReasonChoice | null>(null);
  const [details, setDetails] = useState("");
  const [evidence, setEvidence] = useState("");
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [alsoBlock, setAlsoBlock] = useState(false);

  // Don't allow reporting yourself.
  const isSelf = !!user && !!targetOwnerId && user.id === targetOwnerId;
  const canBlock =
    !!user &&
    !!targetOwnerId &&
    targetOwnerId !== user.id;
  const alreadyBlocked = !!(targetOwnerId && blockedSet?.has(targetOwnerId));

  const reset = () => {
    setReason(null);
    setDetails("");
    setEvidence("");
    setFiles([]);
    setAlsoBlock(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (next && !user) {
      openLogin();
      return;
    }
    if (next && isSelf) return;
    setOpen(next);
    if (!next) reset();
  };

  const submit = async () => {
    if (!reason) return;
    try {
      await ensureVerified(tr(REPORT.verifyAction));
    } catch {
      return;
    }
    const urls = evidence
      .split(/[\s,]+/)
      .map((u) => safeHttpUrl(u.trim()))
      .filter((u): u is string => !!u)
      .slice(0, 3);
    const rpcReason: ReportReason = reason === AI_UNDISCLOSED ? "other" : reason;
    const extra = details.trim();
    const rpcDetails = (
      reason === AI_UNDISCLOSED
        ? (extra ? `${AI_UNDISCLOSED_PREFIX} — ${extra}` : AI_UNDISCLOSED_PREFIX)
        : extra
    ).slice(0, 1000);
    try {
      await create.mutateAsync({
        target_type: targetType,
        target_id: targetId,
        target_owner_id: targetOwnerId ?? null,
        reason: rpcReason,
        details: rpcDetails,
        evidence_urls: [...urls, ...files.map((f) => f.url)],
        evidence_files: files,
      });
      if (alsoBlock && canBlock && targetOwnerId && !alreadyBlocked) {
        try {
          await blockUser.mutateAsync(targetOwnerId);
        } catch {
          /* report already sent */
        }
      }
      setOpen(false);
      reset();
    } catch {
      // toast handled in hook
    }
  };

  if (isSelf) return null;

  const busy = create.isPending || blockUser.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger ? (
        <DialogTrigger asChild>
          {children ?? (
            <Button variant="ghost" size="icon" aria-label={t("triggerAria")}>
              <Flag className="w-5 h-5" />
            </Button>
          )}
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-primary" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm">{t("reason")}</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {REASONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setReason(value)}
                  className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${
                    reason === value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background hover:bg-muted/60 text-muted-foreground"
                  }`}
                >
                  {t(value)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-details" className="text-sm">{t("details")}</Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t("detailsPlaceholder")}
              rows={3}
              maxLength={1000}
            />
            <p className="text-[10px] text-muted-foreground text-right">{details.length}/1000</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-evidence" className="text-sm">{t("evidenceLinks")}</Label>
            <Textarea
              id="report-evidence"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder={t("evidencePlaceholder")}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">{t("attachments")}</Label>
            <EvidenceUploader value={files} onChange={setFiles} />
          </div>

          {canBlock ? (
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-sm font-medium text-foreground">{t("blockAsk")}</p>
              {alreadyBlocked ? (
                <p className="text-xs text-muted-foreground">{t("alreadyBlocked")}</p>
              ) : (
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <Checkbox
                    checked={alsoBlock}
                    onCheckedChange={(v) => setAlsoBlock(v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    {t("blockToo")}
                  </span>
                </label>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
          <Button onClick={() => void submit()} disabled={!reason || busy}>
            {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {t(alsoBlock && !alreadyBlocked ? "sendAndBlock" : "send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
