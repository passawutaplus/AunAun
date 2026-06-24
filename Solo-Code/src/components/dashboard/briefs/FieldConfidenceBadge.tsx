import { Badge } from "@/components/ui/badge";
import { Check, HelpCircle, AlertTriangle } from "lucide-react";

export type FieldConfidence = "found" | "inferred" | "missing";

export function fieldConfidence(
  value: string | undefined,
  transcript: string,
): FieldConfidence {
  const v = (value ?? "").trim();
  if (!v) return "missing";
  const norm = v.toLowerCase();
  const tx = transcript.toLowerCase();
  if (tx.includes(norm) || (norm.length >= 4 && tx.includes(norm.slice(0, 6)))) {
    return "found";
  }
  if (/^\d|บาท|฿/.test(v)) return "inferred";
  return "inferred";
}

const LABELS: Record<FieldConfidence, string> = {
  found: "พบในการถอดเสียง",
  inferred: "AI ประมาณจากบริบท — โปรดตรวจสอบ",
  missing: "ไม่พบข้อมูล — กรอกเอง",
};

export function FieldConfidenceBadge({
  confidence,
  className,
}: {
  confidence: FieldConfidence;
  className?: string;
}) {
  const Icon =
    confidence === "found" ? Check : confidence === "inferred" ? AlertTriangle : HelpCircle;
  const tone =
    confidence === "found"
      ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
      : confidence === "inferred"
        ? "border-amber-500/40 text-amber-700 dark:text-amber-300"
        : "border-muted-foreground/40 text-muted-foreground";

  return (
    <Badge variant="outline" className={`text-[9px] gap-0.5 font-normal ${tone} ${className ?? ""}`}>
      <Icon className="h-2.5 w-2.5" />
      {LABELS[confidence]}
    </Badge>
  );
}
