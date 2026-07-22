import { useEffect, useState } from "react";
import { ArrowLeft, Ban, Loader2, Paperclip, PencilLine, Send, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  HIRE_CANCEL_CLIENT_REASONS,
  HIRE_CANCEL_FREELANCER_REASONS,
  defaultFreelancerMoneyTerms,
  type HireCancelInitiatedBy,
  type HireCancelMoneyTerms,
  type HireCancelRequestRow,
} from "@/lib/hireCancelRequest";
import { sharedStorage, SHARED_MEDIA_BUCKET } from "@/integrations/supabase/sharedStorageClient";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initiatedBy: HireCancelInitiatedBy;
  existing?: HireCancelRequestRow | null;
  busy?: boolean;
  onSubmit: (input: {
    reasonId: string;
    reasonNote: string;
    moneyTerms: HireCancelMoneyTerms;
    evidenceUrls: string[];
  }) => void | Promise<void>;
};

const CLIENT_MONEY: HireCancelMoneyTerms[] = ["none", "full_refund", "half_refund"];
const FREELANCER_MONEY: HireCancelMoneyTerms[] = ["full_refund", "half_refund", "no_refund"];

async function uploadEvidence(file: File, userId: string): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `hire-cancel/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await sharedStorage.storage.from(SHARED_MEDIA_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = sharedStorage.storage.from(SHARED_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

const HireCancelRequestDialog = ({
  open,
  onOpenChange,
  mode,
  initiatedBy,
  existing,
  busy,
  onSubmit,
}: Props) => {
  const reasons =
    initiatedBy === "client" ? HIRE_CANCEL_CLIENT_REASONS : HIRE_CANCEL_FREELANCER_REASONS;
  const moneyOpts = initiatedBy === "client" ? CLIENT_MONEY : FREELANCER_MONEY;

  const [reasonId, setReasonId] = useState<string>(
    initiatedBy === "client" ? HIRE_CANCEL_CLIENT_REASONS[0].id : HIRE_CANCEL_FREELANCER_REASONS[0].id,
  );
  const [note, setNote] = useState("");
  const [moneyTerms, setMoneyTerms] = useState<HireCancelMoneyTerms>(
    initiatedBy === "freelancer" ? "full_refund" : "none",
  );
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const defaultReason =
      initiatedBy === "client"
        ? HIRE_CANCEL_CLIENT_REASONS[0].id
        : HIRE_CANCEL_FREELANCER_REASONS[0].id;
    if (mode === "edit" && existing) {
      setReasonId(existing.reason_id || defaultReason);
      setNote(existing.reason_note || "");
      setMoneyTerms(existing.money_terms);
      setEvidenceUrls(existing.evidence_urls ?? []);
      return;
    }
    setReasonId(defaultReason);
    setNote("");
    setMoneyTerms(initiatedBy === "freelancer" ? "full_refund" : "none");
    setEvidenceUrls([]);
  }, [open, mode, existing, initiatedBy]);

  useEffect(() => {
    if (!open || mode === "edit" || initiatedBy !== "freelancer") return;
    setMoneyTerms(defaultFreelancerMoneyTerms(reasonId));
  }, [reasonId, open, mode, initiatedBy]);

  const canSubmit = reasonId !== "other" || note.trim().length > 0;

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const next: string[] = [...evidenceUrls];
      for (const file of Array.from(files).slice(0, 5 - next.length)) {
        if (file.size > 8 * 1024 * 1024) {
          toast.error(`${file.name} ใหญ่เกิน 8MB`);
          continue;
        }
        const url = await uploadEvidence(file, "anon");
        next.push(url);
      }
      setEvidenceUrls(next.slice(0, 5));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "edit" ? (
              <PencilLine className="w-5 h-5 shrink-0" />
            ) : (
              <Ban className="w-5 h-5 shrink-0" />
            )}
            {mode === "edit" ? "แก้ไขคำขอยกเลิกงาน" : "ขอยกเลิกงาน"}
          </DialogTitle>
          <DialogDescription>
            สรุปสิ่งที่คุยในแชทแล้ว — อีกฝ่ายจะได้ยืนยันในระบบ · แก้/ถอนได้ภายใน 24 ชม. แรก
            (เวลารอพิจารณา 48 ชม. นับต่อเนื่อง)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>เหตุผล</Label>
            <Select value={reasonId} onValueChange={setReasonId} disabled={busy}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>รายละเอียด{reasonId === "other" ? " (จำเป็น)" : " (ถ้ามี)"}</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
              rows={3}
              className="rounded-xl resize-none"
              placeholder="สรุปสั้น ๆ ตามที่คุยในแชท"
            />
          </div>

          <div className="space-y-2">
            <Label>เงื่อนไขเงิน (บันทึกในระบบ — ยังไม่โอนอัตโนมัติ)</Label>
            <RadioGroup
              value={moneyTerms}
              onValueChange={(v) => setMoneyTerms(v as HireCancelMoneyTerms)}
              className="gap-2"
              disabled={busy}
            >
              {moneyOpts.map((id) => {
                const label =
                  id === "full_refund"
                    ? "คืนเต็มจำนวน"
                    : id === "half_refund"
                      ? "คืน 50%"
                      : id === "no_refund"
                        ? "ไม่คืนเงิน"
                        : "ยังไม่ระบุเงื่อนไขเงิน";
                return (
                  <label
                    key={id}
                    className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted/40"
                  >
                    <RadioGroupItem value={id} id={`money-${id}`} />
                    <span>{label}</span>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label>หลักฐาน (ถ้ามี · สูงสุด 5 ไฟล์)</Label>
            <div className="flex flex-wrap gap-2">
              {evidenceUrls.map((url) => (
                <div
                  key={url}
                  className="relative w-14 h-14 rounded-lg border border-border overflow-hidden bg-muted"
                >
                  <a href={url} target="_blank" rel="noreferrer" className="block w-full h-full">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </a>
                  <button
                    type="button"
                    className="absolute top-0.5 right-0.5 rounded-full bg-black/60 text-white p-0.5"
                    onClick={() => setEvidenceUrls((prev) => prev.filter((u) => u !== url))}
                    aria-label="ลบ"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {evidenceUrls.length < 5 && (
                <label className="w-14 h-14 rounded-lg border border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted/40">
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    multiple
                    disabled={busy || uploading}
                    onChange={(e) => void handleFiles(e.target.files)}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            กลับ
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-full"
            disabled={busy || uploading || !canSubmit}
            onClick={() =>
              void onSubmit({
                reasonId,
                reasonNote: note.trim(),
                moneyTerms,
                evidenceUrls,
              })
            }
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : mode === "edit" ? (
              <PencilLine className="w-4 h-4 mr-1.5" />
            ) : (
              <Send className="w-4 h-4 mr-1.5" />
            )}
            {mode === "edit" ? "บันทึกการแก้ไข" : "ส่งคำขอยกเลิก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HireCancelRequestDialog;
