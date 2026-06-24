import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Trash2, Pencil, Eye, Send } from "lucide-react";
import {
  computeTotals,
  formatBaht,
  statusLabel,
  type Quotation,
  type QuotationStatus,
  type DocKind,
} from "@/store/quotations";

import { FollowUpDialog, isOverdue, daysOverdue } from "./FollowUpDialog";

const STATUS_OPTIONS: { value: QuotationStatus; label: string }[] = [
  { value: "draft", label: "ฉบับร่าง" },
  { value: "pending_approval", label: "รออนุมัติ" },
  { value: "pending_payment", label: "รอเก็บเงิน" },
  { value: "pending_receipt", label: "รอทำใบเสร็จ" },
  { value: "completed", label: "เสร็จสิ้น" },
  { value: "rejected", label: "ปฏิเสธ" },
  { value: "expired", label: "หมดอายุ" },
];

function StatusSelect({
  q,
  onAdvance,
}: {
  q: Quotation;
  onAdvance: (id: string, next: QuotationStatus) => void;
}) {
  const s = statusLabel(q.status);
  return (
    <Select value={q.status} onValueChange={(v) => onAdvance(q.id, v as QuotationStatus)}>
      <SelectTrigger
        className={`h-7 w-[120px] text-[11px] rounded-full border-0 ${s.tone} px-2.5 py-0 [&>svg]:opacity-60`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function docNumOf(q: Quotation, docType: DocKind) {
  return docType === "invoice"
    ? q.invoiceNumber || "—"
    : docType === "receipt"
      ? q.receiptNumber || "—"
      : q.number;
}

export function DocList({
  items,
  docType,
  onOpen,
  onDuplicate,
  onDelete,
  onAdvance,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: {
  items: Quotation[];
  docType: DocKind;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string, num: string) => void;
  onAdvance: (id: string, next: QuotationStatus) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleAll?: (checked: boolean) => void;
}) {
  const [followup, setFollowup] = React.useState<Quotation | null>(null);
  const sel = selectedIds ?? new Set<string>();
  const allSelected = items.length > 0 && items.every((it) => sel.has(it.id));
  const someSelected = items.some((it) => sel.has(it.id)) && !allSelected;
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="w-10 px-3 py-2">
                {onToggleAll && (
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={(v) => onToggleAll(!!v)}
                    aria-label="เลือกทั้งหมด"
                  />
                )}
              </th>
              <th className="text-left font-medium px-3 py-2">เลขที่</th>
              <th className="text-left font-medium px-3 py-2">โครงการ</th>
              <th className="text-left font-medium px-3 py-2">ลูกค้า</th>
              <th className="text-right font-medium px-3 py-2">ยอดสุทธิ</th>
              <th className="text-center font-medium px-3 py-2">สถานะ</th>
              <th className="text-right font-medium px-3 py-2">วันที่</th>
              <th className="px-3 py-2 w-[170px]"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((q) => {
              const t = computeTotals(q);

              const docNum = docNumOf(q, docType);
              return (
                <tr
                  key={q.id}
                  className={`border-t border-border/40 hover:bg-muted/20 transition-colors ${sel.has(q.id) ? "bg-primary/5" : ""}`}
                >
                  <td className="px-3 py-2.5">
                    {onToggleSelect && (
                      <Checkbox
                        checked={sel.has(q.id)}
                        onCheckedChange={() => onToggleSelect(q.id)}
                        aria-label={`เลือก ${docNum}`}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-medium num">{docNum}</td>
                  <td className="px-3 py-2.5">
                    <p className="truncate max-w-[200px]">
                      {q.projectName || <span className="text-muted-foreground">—</span>}
                    </p>
                    {docType !== "quotation" && (
                      <p className="text-[10px] text-muted-foreground num">อ้างอิง {q.number}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{q.clientName || "—"}</td>
                  <td className="px-3 py-2.5 text-right num font-semibold">
                    ฿{formatBaht(t.grandTotal)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-center items-center gap-1">
                      <StatusSelect q={q} onAdvance={onAdvance} />
                      {isOverdue(q) && (
                        <Badge className="bg-destructive text-destructive-foreground border-0 text-[10px] rounded-full px-2 py-0.5">
                          เกิน {daysOverdue(q)} วัน
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs text-muted-foreground num">
                    {new Date(q.updatedAt).toLocaleDateString("th-TH", {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {(q.status === "pending_payment" || q.status === "pending_receipt") &&
                        q.dueDate && (
                          <Button
                            size="sm"
                            variant="outline"
                            className={`h-7 px-2 gap-1 text-[11px] ${isOverdue(q) ? "border-destructive/40 text-destructive hover:bg-destructive/10" : ""}`}
                            onClick={() => setFollowup(q)}
                            title="ติดตามการชำระเงิน"
                          >
                            <Send className="h-3 w-3" />
                            <span className="hidden xl:inline">ทวง</span>
                          </Button>
                        )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => onOpen(q.id)}
                        title="แก้ไข"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => onDuplicate(q.id)}
                        title="คัดลอก"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => onDelete(q.id, docNum || q.number)}
                        title="ลบ"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {items.map((q) => {
          const t = computeTotals(q);

          const docNum = docNumOf(q, docType);
          return (
            <div
              key={q.id}
              className={`rounded-xl border p-3 bg-card ${sel.has(q.id) ? "border-primary/60 bg-primary/5" : "border-border/60"}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                {onToggleSelect && (
                  <Checkbox
                    checked={sel.has(q.id)}
                    onCheckedChange={() => onToggleSelect(q.id)}
                    aria-label={`เลือก ${docNum}`}
                    className="mt-1"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground num">{docNum}</p>
                  <p className="text-sm font-medium truncate">
                    {q.projectName || "ไม่มีชื่อโครงการ"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{q.clientName || "—"}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusSelect q={q} onAdvance={onAdvance} />
                  {isOverdue(q) && (
                    <Badge className="bg-destructive text-destructive-foreground border-0 text-[10px]">
                      เกิน {daysOverdue(q)} วัน
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                <p className="num font-semibold">฿{formatBaht(t.grandTotal)}</p>
                <div className="flex items-center gap-1 flex-wrap justify-end">
                  {(q.status === "pending_payment" || q.status === "pending_receipt") &&
                    q.dueDate && (
                      <Button
                        size="sm"
                        variant="outline"
                        className={`h-8 px-2 gap-1 text-[11px] ${isOverdue(q) ? "border-destructive/40 text-destructive" : ""}`}
                        onClick={() => setFollowup(q)}
                      >
                        <Send className="h-3 w-3" /> ทวง
                      </Button>
                    )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2"
                    onClick={() => onOpen(q.id)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" /> เปิด
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive"
                    onClick={() => onDelete(q.id, docNum || q.number)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <FollowUpDialog q={followup} open={!!followup} onClose={() => setFollowup(null)} />
    </>
  );
}
