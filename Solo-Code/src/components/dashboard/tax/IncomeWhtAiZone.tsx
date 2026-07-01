import * as React from "react";
import { Loader2, Sparkles, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { scanWhtCertificate } from "@/lib/whtScan.functions";
import { compressImageFile, dataUrlToBlob } from "@/lib/imageCompress";
import { formatTHB, type IncomeType } from "@/data/mockData";
import { cn } from "@/lib/utils";

export type IncomeWhtAiResult = {
  certificateNo: string;
  client: string;
  gross: string;
  whtRate: string;
  note: string;
  certificateReceived: boolean;
  certificateStoragePath?: string;
  incomeType?: IncomeType;
  summary: string;
};

type Props = {
  onApply: (result: IncomeWhtAiResult) => void;
  className?: string;
};

const SECTION_TO_TYPE: Record<string, IncomeType> = {
  "40_1": "freelance",
  "40_2": "freelance",
  "40_3": "commission",
  "40_4": "rental",
  "40_5": "rental",
  "40_6": "professional",
  "40_8": "online_sales",
};

function mapSectionToType(section: string): IncomeType | undefined {
  return SECTION_TO_TYPE[section];
}

export function IncomeWhtAiZone({ onApply, className }: Props) {
  const { user } = useAuth();
  const scanFn = useServerFn(scanWhtCertificate);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [drag, setDrag] = React.useState(false);
  const [lastSummary, setLastSummary] = React.useState<string | null>(null);

  async function handleFile(file: File) {
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อน");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("ไฟล์ต้องไม่เกิน 10MB");
      return;
    }

    setBusy(true);
    setLastSummary(null);
    try {
      let blob: Blob = file;
      let contentType = file.type || "application/octet-stream";
      let ext = (file.name.split(".").pop() ?? "bin").toLowerCase();

      if (file.type.startsWith("image/") && file.type !== "image/svg+xml") {
        const dataUrl = await compressImageFile(file);
        blob = dataUrlToBlob(dataUrl);
        contentType = "image/jpeg";
        ext = "jpg";
      }

      const path = `${user.id}/income-scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("wht-certificates")
        .upload(path, blob, { upsert: false, contentType });
      if (upErr) throw upErr;

      const scan = await scanFn({ data: { storagePath: path, mimeType: contentType } });

      const client = scan.payerName || scan.payeeName || "";
      const gross = scan.grossAmount > 0 ? String(scan.grossAmount) : "";
      const whtRate = scan.whtRate > 0 ? String(scan.whtRate) : "3";
      const summary = [
        client && `ผู้จ่าย: ${client}`,
        scan.grossAmount > 0 && `Gross ฿${formatTHB(scan.grossAmount)}`,
        scan.whtAmount > 0 && `หัก ณ ที่จ่าย ฿${formatTHB(scan.whtAmount)} (${whtRate}%)`,
        scan.certificateNo && `เลขใบ ${scan.certificateNo}`,
      ]
        .filter(Boolean)
        .join(" · ");

      const noteParts = [scan.notes, scan.issueDate && `วันที่ออก ${scan.issueDate}`].filter(
        Boolean,
      );
      const result: IncomeWhtAiResult = {
        certificateNo: scan.certificateNo,
        client,
        gross,
        whtRate,
        note: noteParts.join(" · ").slice(0, 200),
        certificateReceived: !!scan.certificateNo,
        certificateStoragePath: path,
        incomeType: mapSectionToType(scan.incomeSection),
        summary: summary || "อ่านใบ 50 ทวิแล้ว — ตรวจสอบข้อมูลก่อนบันทึก",
      };

      onApply(result);
      setLastSummary(result.summary);
      toast.success("AI อ่านใบ 50 ทวิแล้ว — กรอกข้อมูลให้อัตโนมัติ");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI อ่านไฟล์ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  function pick(files: FileList | null) {
    const f = files?.[0];
    if (f) void handleFile(f);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (!busy) pick(e.dataTransfer.files);
        }}
        onClick={() => !busy && inputRef.current?.click()}
        className={cn(
          "cursor-pointer rounded-xl border border-dashed p-3 transition-colors",
          drag
            ? "border-primary bg-primary/10"
            : "border-border/70 bg-muted/30 hover:border-primary/50 hover:bg-primary/5",
          busy && "pointer-events-none opacity-70",
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary shrink-0" />
              {busy ? "AI กำลังอ่านใบ 50 ทวิ..." : "โยนไฟล์ใบ 50 ทวิ — AI สรุปให้"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              PDF / JPG / PNG · ลากวางหรือคลิกเลือก
            </p>
          </div>
        </div>
        {lastSummary && !busy && (
          <p className="mt-2 text-[10px] text-foreground/80 leading-snug border-t border-border/50 pt-2">
            {lastSummary}
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </div>
  );
}
