import { CheckCircle2, Loader2, ScanText, Sparkles } from "lucide-react";
import type { KycOcrFields } from "@/lib/kycOcr";
import { formatThaiIdLaserCode, formatThaiNationalId } from "@/lib/kycIdentity";
import { cn } from "@/lib/utils";

type Props = {
  status: "idle" | "running" | "done" | "error";
  progress?: number;
  fields?: KycOcrFields;
  error?: string | null;
  className?: string;
};

const FIELD_LABEL: Record<keyof KycOcrFields, string> = {
  legalName: "ชื่อ-นามสกุล",
  firstName: "ชื่อ",
  lastName: "นามสกุล",
  nationalId: "เลขบัตร",
  dateOfBirth: "วันเกิด",
  expiryDate: "วันหมดอายุ",
  laserCode: "เลขหลังบัตร",
};

function displayValue(key: keyof KycOcrFields, value: string): string {
  if (key === "nationalId") return formatThaiNationalId(value);
  if (key === "laserCode") return formatThaiIdLaserCode(value);
  return value;
}

export function KycOcrStatusPanel({ status, progress = 0, fields, error, className }: Props) {
  if (status === "idle") return null;

  const found = fields
    ? (Object.entries(fields) as [keyof KycOcrFields, string | undefined][]).filter(([, v]) => !!v)
    : [];

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3 space-y-2",
        status === "error" ? "border-destructive/40 bg-destructive/5" : "border-primary/30 bg-primary/5",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {status === "running" ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : status === "done" ? (
          <CheckCircle2 className="w-4 h-4 text-primary" />
        ) : (
          <ScanText className="w-4 h-4 text-destructive" />
        )}
        <span>
          {status === "running"
            ? "ระบบตรวจอัตโนมัติ · OCR กำลังอ่านบัตร…"
            : status === "done"
              ? "ระบบตรวจอัตโนมัติ · OCR"
              : "OCR อ่านไม่สำเร็จ"}
        </span>
        {status === "running" && (
          <span className="text-sm text-muted-foreground ml-auto tabular-nums">{Math.round(progress * 100)}%</span>
        )}
      </div>

      {status === "running" && (
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${Math.max(8, progress * 100)}%` }} />
        </div>
      )}

      {status === "done" && (
        <>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Auto-fill แล้ว — ตรวจทานและแก้ได้ถ้าอ่านผิด
          </p>
          {found.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
              {found.map(([key, value]) => (
                <li key={key} className="flex items-start gap-1.5 text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                  <span>
                    <span className="text-foreground">{FIELD_LABEL[key]}</span>
                    {" · "}
                    <span className="font-mono">{displayValue(key, value!)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">อ่านข้อความได้บางส่วน — กรอกเองต่อได้</p>
          )}
        </>
      )}

      {status === "error" && error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export default KycOcrStatusPanel;
