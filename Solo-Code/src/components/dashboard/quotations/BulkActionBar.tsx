import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Copy, Trash2, X, ChevronDown, RefreshCcw, FileDown } from "lucide-react";
import type { QuotationStatus } from "@/store/quotations";

const STATUSES: { value: QuotationStatus; label: string }[] = [
  { value: "draft", label: "ฉบับร่าง" },
  { value: "pending_approval", label: "รออนุมัติ" },
  { value: "pending_payment", label: "รอเก็บเงิน" },
  { value: "pending_receipt", label: "รอทำใบเสร็จ" },
  { value: "completed", label: "เสร็จสิ้น" },
  { value: "rejected", label: "ปฏิเสธ" },
  { value: "expired", label: "หมดอายุ" },
];

interface Props {
  count: number;
  onClear: () => void;
  onBulkStatus: (s: QuotationStatus) => void;
  onBulkDuplicate: () => void;
  onBulkDelete: () => void;
  onBulkExport: () => void;
}

export function BulkActionBar({
  count,
  onClear,
  onBulkStatus,
  onBulkDuplicate,
  onBulkDelete,
  onBulkExport,
}: Props) {
  if (count === 0) return null;
  return (
    <div className="sticky top-[60px] z-20 mb-3 rounded-xl glass border border-primary/40 bg-primary/5 px-3 py-2 flex items-center gap-2 flex-wrap shadow-soft">
      <span className="text-sm font-semibold text-primary">เลือกแล้ว {count} รายการ</span>
      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
            <RefreshCcw className="h-3.5 w-3.5" /> เปลี่ยนสถานะ <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-xs">เลือกสถานะใหม่</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STATUSES.map((s) => (
            <DropdownMenuItem
              key={s.value}
              className="text-xs"
              onClick={() => onBulkStatus(s.value)}
            >
              {s.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={onBulkDuplicate}>
        <Copy className="h-3.5 w-3.5" /> คัดลอก
      </Button>
      <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={onBulkExport}>
        <FileDown className="h-3.5 w-3.5" /> Export
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onBulkDelete}
      >
        <Trash2 className="h-3.5 w-3.5" /> ลบ
      </Button>
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onClear} title="ยกเลิก">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
