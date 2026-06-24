import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  FileText,
  Paperclip,
  CalendarRange,
  Download,
  Info,
  Eye,
  PenLine,
  Link2,
  Stamp,
} from "lucide-react";
import type { SignatureMode } from "@/store/quotations";
import { EsignDisclaimer } from "@/components/legal/EsignDisclaimer";

export interface QuotationExportChoice {
  includeBrief: boolean;
  /** แทรกภาคผนวกไทม์ไลน์แยกท้าย PDF */
  includeTimeline: boolean;
  signatureMode: SignatureMode;
  includeFreelancerSignature: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  hasBrief: boolean;
  hasTimeline: boolean;
  hasFreelancerSignature: boolean;
  initialSignatureMode?: SignatureMode;
  initialIncludeFreelancerSignature?: boolean;
  onConfirm: (choice: QuotationExportChoice) => void;
  mode?: "export" | "preview";
}

const SIGNATURE_MODES: {
  value: SignatureMode;
  label: string;
  hint: string;
  icon: React.ReactNode;
}[] = [
  { value: "none", label: "ไม่ใส่ลายเซ็น", hint: "เส้นขีดเหมือนเดิม", icon: <FileText className="h-3.5 w-3.5" /> },
  {
    value: "embedded",
    label: "ฝังลายเซ็นของฉัน",
    hint: "ใส่รูปลายเซ็นลง PDF ทันที",
    icon: <Stamp className="h-3.5 w-3.5" />,
  },
  {
    value: "online",
    label: "เซ็นออนไลน์",
    hint: "ส่งลิงก์ให้ลูกค้าวาดลายเซ็น",
    icon: <Link2 className="h-3.5 w-3.5" />,
  },
  {
    value: "wet",
    label: "เซ็นมือ (wet sign)",
    hint: "พิมพ์เซ็นมือแล้วอัปโหลดกลับ",
    icon: <PenLine className="h-3.5 w-3.5" />,
  },
];

export function QuotationExportOptionsDialog({
  open,
  onOpenChange,
  hasBrief,
  hasTimeline,
  hasFreelancerSignature,
  initialSignatureMode = "none",
  initialIncludeFreelancerSignature = false,
  onConfirm,
  mode = "export",
}: Props) {
  const [includeBrief, setIncludeBrief] = React.useState(false);
  const [includeTimeline, setIncludeTimeline] = React.useState(false);
  const [signatureMode, setSignatureMode] = React.useState<SignatureMode>("none");
  const [includeFreelancerSignature, setIncludeFreelancerSignature] = React.useState(false);

  const isPreview = mode === "preview";
  const HeadIcon = isPreview ? Eye : Download;
  const title = isPreview ? "ดูตัวอย่างใบเสนอราคา" : "บันทึกใบเสนอราคาเป็น PDF";
  const subtitle = isPreview
    ? "เลือกว่าจะให้พรีวิวรวมเอกสารอะไรบ้าง (เห็นเหมือนตอนกดบันทึก PDF)"
    : "เลือกว่าจะให้แทรกเอกสารอื่นเข้าไปท้ายไฟล์ PDF ด้วยมั้ย";
  const ctaIcon = isPreview ? (
    <Eye className="h-3.5 w-3.5" />
  ) : (
    <Download className="h-3.5 w-3.5" />
  );
  const ctaLabel = isPreview ? "ดูตัวอย่าง" : "บันทึก PDF";

  React.useEffect(() => {
    if (open) {
      setIncludeBrief(false);
      setIncludeTimeline(false);
      setSignatureMode(initialSignatureMode);
      setIncludeFreelancerSignature(initialIncludeFreelancerSignature);
    }
  }, [open, initialSignatureMode, initialIncludeFreelancerSignature]);

  function handleConfirm() {
    onConfirm({
      includeBrief: hasBrief && includeBrief,
      includeTimeline: hasTimeline && includeTimeline,
      signatureMode,
      includeFreelancerSignature:
        hasFreelancerSignature &&
        includeFreelancerSignature &&
        (signatureMode === "embedded" || signatureMode === "online"),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <HeadIcon className="h-4 w-4 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs">{subtitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary-soft/40 p-3">
            <FileText className="h-4 w-4 mt-0.5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">ใบเสนอราคา</p>
              <p className="text-[11px] text-muted-foreground">
                {isPreview ? "แสดงโดยอัตโนมัติ (เอกสารหลัก)" : "แนบโดยอัตโนมัติ (เอกสารหลัก)"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border p-3 space-y-2">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <PenLine className="h-3.5 w-3.5" />
              โหมดลายเซ็น
            </p>
            <RadioGroup
              value={signatureMode}
              onValueChange={(v) => setSignatureMode(v as SignatureMode)}
              className="space-y-1.5"
            >
              {SIGNATURE_MODES.map((m) => (
                <label
                  key={m.value}
                  className={`flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer transition ${
                    signatureMode === m.value
                      ? "border-primary/40 bg-primary-soft/30"
                      : "border-transparent hover:bg-muted/40"
                  }`}
                >
                  <RadioGroupItem value={m.value} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      {m.icon}
                      {m.label}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{m.hint}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>

            {signatureMode !== "none" && <EsignDisclaimer variant="tool" className="mt-2" />}

            {(signatureMode === "embedded" || signatureMode === "online") && (
              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <Checkbox
                  checked={includeFreelancerSignature}
                  disabled={!hasFreelancerSignature}
                  onCheckedChange={(v) => setIncludeFreelancerSignature(v === true)}
                  className="mt-0.5"
                />
                <div>
                  <Label className="text-xs font-medium">ฝังลายเซ็นฟรีแลนซ์ใน PDF</Label>
                  <p className="text-[10px] text-muted-foreground">
                    {hasFreelancerSignature
                      ? "ใช้รูปจาก Settings → ลายเซ็นเอกสาร"
                      : "อัปโหลดลายเซ็นใน Settings ก่อน"}
                  </p>
                </div>
              </label>
            )}
          </div>

          <label
            className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
              !hasBrief
                ? "opacity-60 cursor-not-allowed border-border/40"
                : includeBrief
                  ? "border-primary/40 bg-primary-soft/30"
                  : "border-border hover:bg-muted/40"
            }`}
          >
            <Checkbox
              checked={includeBrief}
              disabled={!hasBrief}
              onCheckedChange={(v) => setIncludeBrief(v === true)}
              className="mt-0.5"
            />
            <Paperclip className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">{isPreview ? "รวมใบบรีฟ" : "แทรกใบบรีฟ"}</p>
              <p className="text-[11px] text-muted-foreground">
                {hasBrief
                  ? isPreview
                    ? "พรีวิวใบบรีฟที่ผูกไว้ต่อท้ายใบเสนอราคา"
                    : "ต่อท้าย PDF ด้วยใบบรีฟที่ผูกไว้กับใบเสนอราคานี้"
                  : "ใบเสนอราคานี้ยังไม่ได้แนบบรีฟ"}
              </p>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
              !hasTimeline
                ? "opacity-60 cursor-not-allowed border-border/40"
                : includeTimeline
                  ? "border-primary/40 bg-primary-soft/30"
                  : "border-border hover:bg-muted/40"
            }`}
          >
            <Checkbox
              checked={includeTimeline}
              disabled={!hasTimeline}
              onCheckedChange={(v) => setIncludeTimeline(v === true)}
              className="mt-0.5"
            />
            <CalendarRange className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {isPreview ? "รวมภาคผนวกไทม์ไลน์" : "แทรกภาคผนวกไทม์ไลน์"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {hasTimeline
                  ? isPreview
                    ? "ตารางรายละเอียดแยกหน้า — วันเริ่ม-จบ รอบแก้ และงวดชำระเงิน"
                    : "ต่อท้าย PDF ด้วยตารางไทม์ไลน์แบบละเอียด (หน้าแยก)"
                  : "ยังไม่มีข้อมูลไทม์ไลน์ที่จะแทรกได้"}
              </p>
            </div>
          </label>
        </div>

        <p className="flex items-start gap-1.5 text-[10.5px] text-muted-foreground leading-relaxed">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          {signatureMode === "online" || signatureMode === "wet"
            ? "หลังบันทึก PDF ให้แชร์ลิงก์ /sign/ ให้ลูกค้า — re-export หลังลูกค้าเซ็นเพื่อเห็นลายเซ็นใน PDF"
            : isPreview
              ? "พรีวิวจะแสดงเอกสารทั้งหมดในหน้าต่างเดียว เหมือนตอนเปิดไฟล์ PDF จริง"
              : "เอกสารที่แทรกเพิ่มจะถูกใส่ในหน้าต่อจากใบเสนอราคาภายใน PDF เดียวกัน"}
        </p>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
            ยกเลิก
          </Button>
          <Button onClick={handleConfirm} className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 gap-1.5">
            {ctaIcon}
            {ctaLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
