import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ZoomIn,
  ZoomOut,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { formatTHB, INCOME_TYPE_META, type IncomeType } from "@/data/mockData";
import { sectionToIncomeType, parseThaiDate, inferWhtRate } from "./whtUtils";
import type { WhtScanResult } from "@/lib/whtScan.functions";

export type WhtFormType =
  | ""
  | "pnd1a"
  | "pnd1a_special"
  | "pnd2"
  | "pnd3"
  | "pnd2a"
  | "pnd3a"
  | "pnd53";

const FORM_TYPE_OPTIONS: Array<{ value: WhtFormType; label: string }> = [
  { value: "", label: "— ไม่ระบุ —" },
  { value: "pnd1a", label: "ภ.ง.ด.1ก" },
  { value: "pnd1a_special", label: "ภ.ง.ด.1ก พิเศษ" },
  { value: "pnd2", label: "ภ.ง.ด.2" },
  { value: "pnd3", label: "ภ.ง.ด.3" },
  { value: "pnd2a", label: "ภ.ง.ด.2ก" },
  { value: "pnd3a", label: "ภ.ง.ด.3ก" },
  { value: "pnd53", label: "ภ.ง.ด.53" },
];

export type WhtDraft = {
  fileUrl: string;
  /** Storage path in wht-certificates bucket */
  storagePath?: string;
  /** Local blob URL — displays reliably in modal preview */
  previewUrl?: string;
  fileName: string;
  mimeType: string;
  scan: WhtScanResult | null;
  error?: string;
  // editable fields
  payerName: string;
  payerTaxId: string;
  payeeName: string;
  payeeTaxId: string;
  certificateNo: string;
  issueDate: string;
  incomeType: IncomeType;
  grossAmount: number;
  whtRate: number;
  whtAmount: number;
  whtAmountTextThai: string;
  formType: WhtFormType;
};

export function whtDraftFromScan(
  fileUrl: string,
  fileName: string,
  mimeType: string,
  scan: WhtScanResult,
  previewUrl?: string,
  storagePath?: string,
): WhtDraft {
  const issueDate = parseThaiDate(scan.issueDate) || new Date().toISOString().slice(0, 10);
  const inferredRate = scan.whtRate || inferWhtRate(scan.grossAmount, scan.whtAmount) || 3;
  return {
    fileUrl,
    storagePath,
    previewUrl,
    fileName,
    mimeType,
    scan,
    payerName: scan.payerName,
    payerTaxId: scan.payerTaxId ?? "",
    payeeName: scan.payeeName ?? "",
    payeeTaxId: scan.payeeTaxId ?? "",
    certificateNo: scan.certificateNo,
    issueDate,
    incomeType: sectionToIncomeType(scan.incomeSection),
    grossAmount: scan.grossAmount,
    whtRate: inferredRate,
    whtAmount: scan.whtAmount,
    whtAmountTextThai: scan.whtAmountTextThai ?? "",
    formType: (scan.formType as WhtFormType) || "",
  };
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  drafts: WhtDraft[];
  onDraftChange: (index: number, draft: WhtDraft) => void;
  onConfirm: (draft: WhtDraft) => void;
  onSkip: () => void;
};

export function WhtScanVerifyDialog({
  open,
  onOpenChange,
  drafts,
  onDraftChange,
  onConfirm,
  onSkip,
}: Props) {
  const [idx, setIdx] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);

  React.useEffect(() => {
    if (open) {
      setIdx(0);
      setZoom(1);
    }
  }, [open, drafts.length]);

  const current = drafts[idx];
  if (!current) return null;

  function update<K extends keyof WhtDraft>(k: K, v: WhtDraft[K]) {
    onDraftChange(idx, { ...current, [k]: v });
  }

  const isPdf = current.mimeType === "application/pdf";
  const conf = current.scan?.confidence ?? 0;
  const lowConf = conf < 0.7;
  const previewSrc = current.previewUrl || current.fileUrl;

  function next() {
    if (idx < drafts.length - 1) {
      setIdx(idx + 1);
      setZoom(1);
    }
  }
  function prev() {
    if (idx > 0) {
      setIdx(idx - 1);
      setZoom(1);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 gap-0 max-h-[92vh] flex flex-col">
        <DialogHeader className="px-5 py-3 pr-12 sm:pr-14 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            ตรวจสอบข้อมูลที่ AI อ่านได้
            <Badge variant="outline" className="ml-2 num text-[10px]">
              {idx + 1} / {drafts.length}
            </Badge>
            {current.error ? (
              <Badge
                variant="outline"
                className="bg-destructive/10 text-destructive border-destructive/30 gap-1"
              >
                <AlertTriangle className="h-3 w-3" /> AI อ่านไม่สำเร็จ
              </Badge>
            ) : lowConf ? (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                ความมั่นใจต่ำ {Math.round(conf * 100)}% — โปรดตรวจซ้ำ
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                ความมั่นใจ {Math.round(conf * 100)}%
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 flex-1 min-h-0 overflow-hidden">
          {/* Left: preview */}
          <div className="bg-muted/40 border-r relative overflow-auto">
            <div className="absolute top-2 right-2 z-10 flex gap-1">
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <Badge variant="outline" className="num text-[10px] bg-card">
                {Math.round(zoom * 100)}%
              </Badge>
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7"
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="min-h-full flex items-start justify-center p-4">
              {isPdf ? (
                <embed
                  src={previewSrc}
                  type="application/pdf"
                  className="w-full h-[70vh] rounded-lg bg-white shadow-sm"
                />
              ) : (
                <img
                  src={previewSrc}
                  alt={current.fileName}
                  style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
                  className="rounded-lg shadow-sm max-w-full"
                />
              )}
            </div>
          </div>

          {/* Right: form */}
          <div className="overflow-y-auto p-5 space-y-3">
            {current.error ? (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
                {current.error} — กรุณากรอกข้อมูลเอง หรือกดข้ามไฟล์นี้
              </div>
            ) : (
              <div className="rounded-lg bg-primary-soft border border-primary/20 p-2.5 text-xs text-primary">
                ✨ AI แกะข้อมูลให้แล้ว — กรุณาตรวจสอบและแก้ไขก่อนบันทึก
              </div>
            )}

            <FieldRow label="ชื่อผู้จ่ายเงิน / บริษัท">
              <Input
                value={current.payerName}
                onChange={(e) => update("payerName", e.target.value)}
                maxLength={200}
                placeholder="เช่น บริษัท ABC จำกัด"
              />
              {current.payerTaxId && (
                <p className="text-[10px] text-muted-foreground num mt-1">
                  เลขผู้เสียภาษีผู้จ่าย: {current.payerTaxId}
                </p>
              )}
            </FieldRow>

            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="ชื่อผู้ถูกหักภาษี">
                <Input
                  value={current.payeeName}
                  onChange={(e) => update("payeeName", e.target.value)}
                  maxLength={200}
                  placeholder="ชื่อของคุณ"
                />
              </FieldRow>
              <FieldRow label="เลขผู้เสียภาษี (13 หลัก)">
                <Input
                  value={current.payeeTaxId}
                  onChange={(e) =>
                    update("payeeTaxId", e.target.value.replace(/\D/g, "").slice(0, 13))
                  }
                  inputMode="numeric"
                  className="num"
                  placeholder="1234567890123"
                />
              </FieldRow>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="เลขใบ 50 ทวิ">
                <Input
                  value={current.certificateNo}
                  onChange={(e) => update("certificateNo", e.target.value)}
                  maxLength={50}
                  placeholder="เช่น WTI-20260100009"
                />
              </FieldRow>
              <FieldRow label="วันที่ออก">
                <Input
                  type="date"
                  value={current.issueDate}
                  onChange={(e) => update("issueDate", e.target.value)}
                />
              </FieldRow>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="ประเภทเงินได้ (มาตรา)">
                <Select
                  value={current.incomeType}
                  onValueChange={(v) => update("incomeType", v as IncomeType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(INCOME_TYPE_META) as [
                        IncomeType,
                        (typeof INCOME_TYPE_META)[IncomeType],
                      ][]
                    ).map(([k, m]) => (
                      <SelectItem key={k} value={k}>
                        {m.section} · {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="ฟอร์มที่ยื่น">
                <Select
                  value={current.formType || "_none"}
                  onValueChange={(v) => update("formType", (v === "_none" ? "" : v) as WhtFormType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORM_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value || "_none"} value={o.value || "_none"}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FieldRow label="ยอดเงิน (บาท)">
                <Input
                  type="number"
                  min={0}
                  value={current.grossAmount || ""}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    update("grossAmount", v);
                    if (current.whtRate)
                      update("whtAmount", +(v * (current.whtRate / 100)).toFixed(2));
                  }}
                  className="num"
                />
              </FieldRow>
              <FieldRow label="อัตรา WHT (%)">
                <Input
                  type="number"
                  min={0}
                  max={30}
                  step={0.5}
                  value={current.whtRate || ""}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    update("whtRate", v);
                    if (current.grossAmount)
                      update("whtAmount", +(current.grossAmount * (v / 100)).toFixed(2));
                  }}
                  className="num"
                />
              </FieldRow>
              <FieldRow label="หัก ณ ที่จ่าย">
                <Input
                  type="number"
                  min={0}
                  value={current.whtAmount || ""}
                  onChange={(e) => update("whtAmount", Number(e.target.value))}
                  className="num"
                />
              </FieldRow>
            </div>

            {current.whtAmountTextThai && (
              <FieldRow label="ภาษีที่หัก (ข้อความภาษาไทยในใบ)">
                <Input
                  value={current.whtAmountTextThai}
                  onChange={(e) => update("whtAmountTextThai", e.target.value)}
                  className="text-sm"
                  readOnly
                />
              </FieldRow>
            )}

            <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>เงินสุทธิที่ได้รับ</span>
                <span className="num font-semibold text-foreground">
                  ฿{formatTHB(Math.max(0, (current.grossAmount || 0) - (current.whtAmount || 0)))}
                </span>
              </div>
              {current.scan?.notes && (
                <p className="text-[10px] italic">AI note: {current.scan.notes}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t flex-row justify-between gap-2 sm:justify-between">
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={prev} disabled={idx === 0}>
              <ChevronLeft className="h-4 w-4" /> ก่อนหน้า
            </Button>
            <Button size="sm" variant="outline" onClick={next} disabled={idx === drafts.length - 1}>
              ถัดไป <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={onSkip}>
              ข้ามไฟล์นี้
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => onConfirm(current)}
              disabled={!current.payerName || current.grossAmount <= 0}
            >
              <CheckCircle2 className="h-4 w-4" /> ยืนยันและบันทึก
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
