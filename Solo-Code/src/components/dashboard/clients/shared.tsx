import * as React from "react";
import { CheckCircle2, Clock, AlertTriangle, AlertOctagon } from "lucide-react";
import { fieldLabelClass } from "@/lib/formFieldStyles";
import { DEFAULT_CONTRACT_CLAUSES } from "@/lib/contractTemplates";
import { cn } from "@/lib/utils";

export const CLIENT_GRADES: Record<string, { grade: "A" | "B" | "C"; traits: string[] }> = {
  "Nimbus Co.": { grade: "A", traits: ["จ่ายตรงเวลา", "บรีฟชัด"] },
  "Aroma Café": { grade: "B", traits: ["แก้งาน 2-3 รอบ"] },
  GreenLeaf: { grade: "C", traits: ["จ่ายช้า", "แก้งานเยอะ"] },
  FitLab: { grade: "A", traits: ["บรีฟดี", "ตัดสินใจไว"] },
};

/** Re-export pipeline contract clauses for client CRM display. */
export const CONTRACTS = DEFAULT_CONTRACT_CLAUSES.map((c) => ({
  title: c.title,
  detail: c.body,
}));

export const GRADE_COLOR = {
  A: "bg-success/15 text-success",
  B: "bg-primary-soft text-primary",
  C: "bg-destructive/15 text-destructive",
} as const;

export const STATUS_META = {
  paid: { label: "จ่ายแล้ว", icon: CheckCircle2, className: "bg-success/15 text-success" },
  ontime: { label: "ตรงเวลา", icon: Clock, className: "bg-primary-soft text-primary" },
  late7: {
    label: "เลท 7 วัน",
    icon: AlertTriangle,
    className: "bg-warning/20 text-warning-foreground",
  },
  late30: {
    label: "เลท 1 เดือน",
    icon: AlertOctagon,
    className: "bg-destructive/15 text-destructive",
  },
} as const;

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
      {children}
    </h3>
  );
}

export function FormSection({
  title,
  icon: Icon,
  variant = "default",
  children,
}: {
  title: React.ReactNode;
  icon?: React.ElementType;
  variant?: "company" | "contact" | "default";
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border p-4 space-y-3",
        variant === "company" && "border-primary/30 bg-primary/[0.04]",
        variant === "contact" && "border-border bg-muted/25",
        variant === "default" && "border-border/60",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 pb-2 border-b",
          variant === "company" && "border-primary/20",
          variant === "contact" && "border-border/70",
          variant === "default" && "border-border/50",
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              "h-3.5 w-3.5",
              variant === "company" ? "text-primary" : "text-muted-foreground",
            )}
          />
        )}
        <SectionTitle>{title}</SectionTitle>
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  icon: Icon,
  children,
  required,
}: {
  label: React.ReactNode;
  icon?: React.ElementType;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className={fieldLabelClass(required)}>
        {Icon && <Icon className="h-3 w-3 text-muted-foreground" />} {label}
      </label>
      {children}
    </div>
  );
}

export const INDUSTRY_PRESETS = [
  "คาเฟ่ / ร้านอาหาร",
  "อีคอมเมิร์ซ",
  "สตาร์ทอัป / Tech",
  "ความงาม / สุขภาพ",
  "การศึกษา",
  "อสังหาริมทรัพย์",
  "การตลาด / โฆษณา",
  "อื่นๆ",
] as const;

export type ClientDocCategory =
  | "business_card"
  | "company_profile"
  | "pp20"
  | "certificate"
  | "id_card"
  | "other";

export const CLIENT_DOC_CATEGORIES: Record<
  ClientDocCategory,
  { label: string; forType?: "individual" | "company" }
> = {
  business_card: { label: "นามบัตร" },
  company_profile: { label: "โปรไฟล์บริษัท", forType: "company" },
  pp20: { label: "ภ.พ.20", forType: "company" },
  certificate: { label: "หนังสือรับรองบริษัท", forType: "company" },
  id_card: { label: "บัตรประชาชน", forType: "individual" },
  other: { label: "อื่นๆ" },
};

export function clientDocCategoriesForType(
  type: "individual" | "company" | undefined,
): ClientDocCategory[] {
  const t = type ?? "individual";
  return (Object.keys(CLIENT_DOC_CATEGORIES) as ClientDocCategory[]).filter((k) => {
    const meta = CLIENT_DOC_CATEGORIES[k];
    if (!meta.forType) return true;
    if (k === "business_card") return true;
    return meta.forType === t;
  });
}

export const PAYMENT_TERM_LABELS: Record<string, string> = {
  "100%": "ชำระเต็มจำนวนก่อนเริ่มงาน",
  "50/50": "มัดจำ 50% ก่อนเริ่ม · 50% เมื่อส่งมอบงาน",
  "30/70": "มัดจำ 30% ก่อนเริ่ม · 70% เมื่อส่งมอบงาน",
  "Net 7": "ชำระภายใน 7 วันหลังออกใบแจ้งหนี้",
  "Net 15": "ชำระภายใน 15 วันหลังออกใบแจ้งหนี้",
  "Net 30": "ชำระภายใน 30 วันหลังออกใบแจ้งหนี้",
};
