import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Ban, Check, Loader2, Paperclip, PencilLine, Send, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { Slider } from "@/components/ui/slider";
import {
  HIRE_CANCEL_CLIENT_REASONS,
  HIRE_CANCEL_FREELANCER_REASONS,
  decodeHireCancelReasonNote,
  defaultFreelancerMoneyTerms,
  encodeHireCancelReasonNote,
  estimateHireCancelRefundThb,
  type HireCancelInitiatedBy,
  type HireCancelMoneyTerms,
  type HireCancelRequestRow,
} from "@/lib/hireCancelRequest";
import { formatOfferAmount } from "@/lib/chatOffer";
import { LEGAL_APP_NAME } from "@/lib/legalConfig";
import { cn } from "@/lib/utils";
import { sharedStorage, SHARED_MEDIA_BUCKET } from "@/integrations/supabase/sharedStorageClient";
import { toast } from "sonner";

const NOTE_MIN = 20;

const CANCEL_TERMS = [
  `${LEGAL_APP_NAME} สามารถเข้าถึงข้อมูลของงานนี้ (แชท ออเดอร์ ความคืบหน้า หลักฐาน) เพื่อตรวจสอบและประสาน`,
  "การตัดสินคืนเงินจะพิจารณาจากคำขอยกเลิก รายละเอียดออเดอร์ การส่งงาน / เวลาที่ส่งงาน ความคืบหน้า และหลักฐานที่เกี่ยวข้อง",
  "ในกรณีที่ต้องคุยเพิ่มก่อนอนุมัติยอดคืน ทีมอาจติดต่อกลับตามเบอร์หรืออีเมลที่ระบุ และอาจขอเอกสารเพิ่มเติม",
] as const;

type Step = 1 | 2;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initiatedBy: HireCancelInitiatedBy;
  existing?: HireCancelRequestRow | null;
  busy?: boolean;
  orderAmountThb?: number | null;
  defaultContactPhone?: string | null;
  defaultContactEmail?: string | null;
  onSubmit: (input: {
    reasonId: string;
    reasonNote: string;
    moneyTerms: HireCancelMoneyTerms;
    evidenceUrls: string[];
    workProgressPct: number;
    contactPhone: string;
    contactEmail: string;
  }) => void | Promise<void>;
};

const CLIENT_MONEY: HireCancelMoneyTerms[] = ["full_refund", "half_refund", "none"];
const FREELANCER_MONEY: HireCancelMoneyTerms[] = ["full_refund", "half_refund", "no_refund"];

function moneyOptionLabel(id: HireCancelMoneyTerms): string {
  switch (id) {
    case "full_refund":
      return "คืนเต็มจำนวน";
    case "half_refund":
      return "คืน 50%";
    case "no_refund":
      return "ไม่คืนเงิน";
    case "none":
      return "ไม่ต้องการขอคืน";
    default:
      return id;
  }
}

function normalizePhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "").trim();
}

function isPhoneOk(raw: string): boolean {
  const digits = normalizePhone(raw).replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

function isEmailOk(raw: string): boolean {
  const email = raw.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

function Stepper({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-2 px-1 pb-1">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            step > 1
              ? "bg-primary text-primary-foreground"
              : step === 1
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
          )}
        >
          {step > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
        </span>
        <span className={cn("text-xs truncate", step === 1 ? "font-semibold text-foreground" : "text-muted-foreground")}>
          รายละเอียด
        </span>
      </div>
      <div className="h-px flex-1 bg-border min-w-[1.5rem]" />
      <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          2
        </span>
        <span className={cn("text-xs truncate", step === 2 ? "font-semibold text-foreground" : "text-muted-foreground")}>
          การคืนเงิน
        </span>
      </div>
    </div>
  );
}

const HireCancelRequestDialog = ({
  open,
  onOpenChange,
  mode,
  initiatedBy,
  existing,
  busy,
  orderAmountThb,
  defaultContactPhone,
  defaultContactEmail,
  onSubmit,
}: Props) => {
  const reasons =
    initiatedBy === "client" ? HIRE_CANCEL_CLIENT_REASONS : HIRE_CANCEL_FREELANCER_REASONS;
  const moneyOpts = initiatedBy === "client" ? CLIENT_MONEY : FREELANCER_MONEY;
  const amountThb = Math.max(0, Number(orderAmountThb) || 0);

  const [step, setStep] = useState<Step>(1);
  const [reasonId, setReasonId] = useState<string>(
    initiatedBy === "client" ? HIRE_CANCEL_CLIENT_REASONS[0].id : HIRE_CANCEL_FREELANCER_REASONS[0].id,
  );
  const [note, setNote] = useState("");
  const [workProgressPct, setWorkProgressPct] = useState(0);
  const [moneyTerms, setMoneyTerms] = useState<HireCancelMoneyTerms>("full_refund");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const defaultReason =
      initiatedBy === "client"
        ? HIRE_CANCEL_CLIENT_REASONS[0].id
        : HIRE_CANCEL_FREELANCER_REASONS[0].id;
    setStep(1);
    if (mode === "edit" && existing) {
      const decoded = decodeHireCancelReasonNote(existing.reason_note);
      setReasonId(existing.reason_id || defaultReason);
      setNote(decoded.note);
      setWorkProgressPct(decoded.workProgressPct);
      setContactPhone(decoded.contactPhone || defaultContactPhone?.trim() || "");
      setContactEmail(decoded.contactEmail || defaultContactEmail?.trim() || "");
      setMoneyTerms(
        existing.money_terms === "none" && initiatedBy === "client"
          ? "none"
          : existing.money_terms,
      );
      setEvidenceUrls(existing.evidence_urls ?? []);
      setTermsAccepted(false);
      return;
    }
    setReasonId(defaultReason);
    setNote("");
    setWorkProgressPct(0);
    setMoneyTerms("full_refund");
    setEvidenceUrls([]);
    setContactPhone(defaultContactPhone?.trim() || "");
    setContactEmail(defaultContactEmail?.trim() || "");
    setTermsAccepted(false);
  }, [open, mode, existing, initiatedBy, defaultContactPhone, defaultContactEmail]);

  useEffect(() => {
    if (!open || mode === "edit" || initiatedBy !== "freelancer") return;
    setMoneyTerms(defaultFreelancerMoneyTerms(reasonId));
  }, [reasonId, open, mode, initiatedBy]);

  const noteLen = note.trim().length;
  const phoneOk = isPhoneOk(contactPhone);
  const emailOk = isEmailOk(contactEmail);
  const canGoStep2 = noteLen >= NOTE_MIN;
  const canSubmit = phoneOk && emailOk && termsAccepted;

  const refundEstimate = useMemo(
    () => estimateHireCancelRefundThb(moneyTerms, amountThb),
    [moneyTerms, amountThb],
  );

  const moneySectionLabel =
    initiatedBy === "client"
      ? "เงื่อนไขในการยื่นขอคืนเงินจาก creator"
      : "เงื่อนไขในการยื่นคืนเงินผู้จ้าง";

  const progressLabel =
    initiatedBy === "client" ? "Creator ทำงานไปแล้วกี่ %" : "เราทำงานไปแล้วกี่ %";

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

  const setProgress = (raw: number) => {
    if (!Number.isFinite(raw)) return;
    setWorkProgressPct(Math.min(100, Math.max(0, Math.round(raw))));
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
            {step === 1
              ? "สรุปสิ่งที่คุยในแชทแล้ว — อีกฝ่ายจะได้ยืนยันในระบบ · แก้/ถอนได้ภายใน 24 ชม. แรก (เวลารอพิจารณา 48 ชม.)"
              : "ระบุเงื่อนไขคืนเงินและช่องทางติดต่อ — ทีมอาจคุยก่อนอนุมัติยอดคืน"}
          </DialogDescription>
        </DialogHeader>

        <Stepper step={step} />

        {step === 1 ? (
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
              <Label>รายละเอียด (จำเป็น · อย่างน้อย {NOTE_MIN} ตัวอักษร)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={busy}
                rows={3}
                className="rounded-xl resize-none"
                placeholder="สรุปสั้น ๆ ตามที่คุยในแชท"
              />
              <p
                className={`text-[11px] tabular-nums ${
                  noteLen >= NOTE_MIN ? "text-muted-foreground" : "text-destructive"
                }`}
              >
                {noteLen}/{NOTE_MIN} ตัวอักษร
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="hire-cancel-progress">{progressLabel}</Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="hire-cancel-progress"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={workProgressPct}
                    disabled={busy}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="h-8 w-16 rounded-lg text-center tabular-nums px-1"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <Slider
                value={[workProgressPct]}
                min={0}
                max={100}
                step={1}
                disabled={busy}
                onValueChange={(v) => setProgress(v[0] ?? 0)}
              />
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
        ) : (
          <div className="space-y-3 py-1">
            <div className="space-y-2">
              <Label>{moneySectionLabel}</Label>
              <p className="text-[11px] text-muted-foreground">
                บันทึกในระบบ — ยังไม่โอนอัตโนมัติ จนกว่าอีกฝ่ายยืนยันหรือครบกำหนด
              </p>
              <RadioGroup
                value={moneyTerms}
                onValueChange={(v) => setMoneyTerms(v as HireCancelMoneyTerms)}
                className="gap-2"
                disabled={busy}
              >
                {moneyOpts.map((id) => (
                  <label
                    key={id}
                    className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted/40"
                  >
                    <RadioGroupItem value={id} id={`money-${id}`} />
                    <span>{moneyOptionLabel(id)}</span>
                  </label>
                ))}
              </RadioGroup>

              <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 space-y-1 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">ยอดทั้งหมด</span>
                  <span className="font-medium tabular-nums">
                    {amountThb > 0 ? formatOfferAmount(amountThb) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">ประมาณการยอดคืนผู้จ้าง</span>
                  <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {amountThb > 0 ? formatOfferAmount(refundEstimate) : "—"}
                  </span>
                </div>
                <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90 pt-0.5 leading-relaxed">
                  ยอดคืนจริงอาจต่างไปหลังพิจารณาตามนโยบายการคืนเงิน
                </p>
                {amountThb <= 0 ? (
                  <p className="text-[11px] text-muted-foreground pt-0.5">
                    ยังไม่พบยอดออเดอร์ในแชท — ตัวเลขคืนจะแสดงเมื่อมียอดชำระ
                  </p>
                ) : null}
              </div>
            </div>

            <div className="border-t border-border/70 pt-3 space-y-2">
              <Label>ช่องทางการติดต่อ</Label>
              <p className="text-[11px] text-muted-foreground">
                ใช้เมื่อทีมต้องคุยก่อนอนุมัติว่าจะคืนหรือไม่ และคืนเท่าไหร่
              </p>
              <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="hire-cancel-phone" className="text-xs text-muted-foreground font-normal">
                    หมายเลขโทรศัพท์สำหรับติดต่อกลับ
                  </Label>
                  <Input
                    id="hire-cancel-phone"
                    type="tel"
                    inputMode="tel"
                    value={contactPhone}
                    disabled={busy}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="เช่น 08x-xxx-xxxx"
                    className="rounded-lg bg-background"
                  />
                  {!phoneOk && contactPhone.trim().length > 0 ? (
                    <p className="text-[11px] text-destructive">กรอกเบอร์ให้ครบอย่างน้อย 9 หลัก</p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hire-cancel-email" className="text-xs text-muted-foreground font-normal">
                    อีเมลสำหรับติดต่อกลับ
                  </Label>
                  <Input
                    id="hire-cancel-email"
                    type="email"
                    inputMode="email"
                    value={contactEmail}
                    disabled={busy}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="rounded-lg bg-background"
                  />
                  {!emailOk && contactEmail.trim().length > 0 ? (
                    <p className="text-[11px] text-destructive">รูปแบบอีเมลไม่ถูกต้อง</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <Checkbox
                  checked={termsAccepted}
                  disabled={busy}
                  onCheckedChange={(v) => setTermsAccepted(v === true)}
                  className="mt-0.5"
                />
                <span className="text-sm font-medium leading-snug">ฉันยอมรับข้อตกลงและเงื่อนไข</span>
              </label>
              <div className="max-h-28 overflow-y-auto rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground leading-relaxed">
                <ul className="list-disc pl-4 space-y-1.5">
                  {CANCEL_TERMS.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-2">
                  อ่านเพิ่มที่{" "}
                  <a
                    href="/legal/payment-refund"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    นโยบายการชำระเงินและการคืนเงิน
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 1 ? (
            <>
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
                className="rounded-full"
                disabled={busy || uploading || !canGoStep2}
                onClick={() => setStep(2)}
              >
                ถัดไป
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={busy}
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                ย้อนกลับ
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="rounded-full"
                disabled={busy || uploading || !canSubmit}
                onClick={() => {
                  const phone = normalizePhone(contactPhone);
                  const email = contactEmail.trim();
                  void onSubmit({
                    reasonId,
                    reasonNote: encodeHireCancelReasonNote(note, workProgressPct, phone, email),
                    moneyTerms,
                    evidenceUrls,
                    workProgressPct,
                    contactPhone: phone,
                    contactEmail: email,
                  });
                }}
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
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HireCancelRequestDialog;
