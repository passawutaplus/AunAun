import * as React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Plus } from "lucide-react";
import { type DocKind, type Quotation, type QuotationStatus } from "@/store/quotations";
import { DOC_TYPES } from "./docTypes";

export function EmptyState({ docType, onCreate }: { docType: DocKind; onCreate: () => void }) {
  const meta = DOC_TYPES.find((d) => d.value === docType)!;
  const Icon = meta.icon;
  return (
    <div className="text-center py-12 border border-dashed rounded-xl">
      <Icon className="h-10 w-10 mx-auto text-muted-foreground/75 mb-2" />
      <p className="text-sm font-medium">ยังไม่มี{meta.label}</p>
      {docType === "quotation" ? (
        <>
          <p className="text-xs text-muted-foreground mt-1">กดปุ่ม "ทำใบเสนอราคา" เพื่อเริ่มต้น</p>
          <Button
            onClick={onCreate}
            size="sm"
            className="mt-3 bg-primary hover:bg-primary/90 gap-1.5"
          >
            <Plus className="h-4 w-4" /> ทำใบเสนอราคา
          </Button>
        </>
      ) : (
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
          {docType === "invoice"
            ? 'เปิดใบเสนอราคาแล้วกด "ทำใบแจ้งหนี้" เพื่อสร้างเอกสารนี้'
            : 'เปิดใบเสนอราคา/ใบแจ้งหนี้แล้วกด "ทำใบเสร็จรับเงิน" เมื่อรับเงินแล้ว'}
        </p>
      )}
    </div>
  );
}

export function WorkflowButton({
  q,
  onAdvance,
  compact = false,
}: {
  q: Quotation;
  onAdvance: (id: string, next: QuotationStatus) => void;
  compact?: boolean;
}) {
  let label = "";
  let next: QuotationStatus | null = null;
  let icon: React.ReactNode = <ArrowRight className="h-3.5 w-3.5" />;

  if (q.status === "pending_approval") {
    label = "ทำใบแจ้งหนี้";
    next = "pending_payment";
  } else if (q.status === "pending_payment") {
    label = "ทำใบเสร็จ";
    next = "pending_receipt";
  } else if (q.status === "pending_receipt") {
    label = "ปิดงาน";
    next = "completed";
    icon = <CheckCircle2 className="h-3.5 w-3.5" />;
  }

  if (!next) return null;

  return (
    <Button
      size="sm"
      variant="secondary"
      className={`gap-1 ${compact ? "h-8 px-2 text-[11px]" : "h-7 px-2 text-[11px]"}`}
      onClick={(e) => {
        e.stopPropagation();
        onAdvance(q.id, next!);
      }}
      title={label}
    >
      {icon}
      <span className={compact ? "" : "hidden xl:inline"}>{label}</span>
    </Button>
  );
}
