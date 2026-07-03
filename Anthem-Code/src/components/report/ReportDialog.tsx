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
import { Flag, Loader2 } from "lucide-react";
import { useCreateReport, type ReportReason, type ReportTargetType, type EvidenceFile } from "@/hooks/useReports";
import { useAuth } from "@/hooks/useAuth";
import EvidenceUploader from "./EvidenceUploader";
import { useAuthDialog } from "@/stores/authDialogStore";
import { useEnsureSensitiveAction } from "@/components/legal/SensitiveActionReauthProvider";
import { safeHttpUrl } from "@/lib/safeUrl";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "สแปม / โฆษณา" },
  { value: "harassment", label: "คุกคาม / Hate speech" },
  { value: "nsfw", label: "เนื้อหา 18+ / ไม่เหมาะสม" },
  { value: "copyright", label: "ละเมิดลิขสิทธิ์" },
  { value: "scam", label: "หลอกลวง / Scam" },
  { value: "impersonation", label: "ปลอมเป็นผู้อื่น" },
  { value: "other", label: "อื่นๆ" },
];

interface Props {
  targetType: ReportTargetType;
  targetId: string;
  targetOwnerId?: string | null;
  children?: React.ReactNode;
}

const ReportDialog = ({ targetType, targetId, targetOwnerId, children }: Props) => {
  const { user } = useAuth();
  const openLogin = useAuthDialog((s) => s.openLogin);
  const create = useCreateReport();
  const ensureVerified = useEnsureSensitiveAction();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [evidence, setEvidence] = useState("");
  const [files, setFiles] = useState<EvidenceFile[]>([]);

  // Don't allow reporting yourself.
  const isSelf = !!user && !!targetOwnerId && user.id === targetOwnerId;

  const reset = () => {
    setReason(null);
    setDetails("");
    setEvidence("");
    setFiles([]);
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
      await ensureVerified("ส่งรายงานเนื้อหา / การละเมิด");
    } catch {
      return;
    }
    const urls = evidence
      .split(/[\s,]+/)
      .map((u) => safeHttpUrl(u.trim()))
      .filter((u): u is string => !!u)
      .slice(0, 3);
    try {
      await create.mutateAsync({
        target_type: targetType,
        target_id: targetId,
        target_owner_id: targetOwnerId ?? null,
        reason,
        details: details.trim().slice(0, 1000),
        evidence_urls: [...urls, ...files.map((f) => f.url)],
        evidence_files: files,
      });
      setOpen(false);
      reset();
    } catch {
      // toast handled in hook
    }
  };

  if (isSelf) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="ghost" size="icon" aria-label="รายงาน">
            <Flag className="w-5 h-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-primary" />
            รายงานเนื้อหานี้
          </DialogTitle>
          <DialogDescription>
            ทีมงานจะตรวจสอบและดำเนินการตามนโยบายชุมชน รายงานของคุณเป็นความลับ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm">เหตุผล</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${
                    reason === r.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background hover:bg-muted/60 text-muted-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-details" className="text-sm">รายละเอียดเพิ่มเติม</Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="อธิบายสถานการณ์ให้ทีมงานเข้าใจ (ไม่บังคับ)"
              rows={3}
              maxLength={1000}
            />
            <p className="text-[10px] text-muted-foreground text-right">{details.length}/1000</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-evidence" className="text-sm">ลิงก์หลักฐาน (ไม่บังคับ)</Label>
            <Textarea
              id="report-evidence"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="วาง URL คั่นด้วยช่องว่าง สูงสุด 3 ลิงก์"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">ไฟล์แนบ</Label>
            <EvidenceUploader value={files} onChange={setFiles} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>ยกเลิก</Button>
          <Button onClick={submit} disabled={!reason || create.isPending}>
            {create.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            ส่งรายงาน
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
