import { useMemo, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Download, FileText, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { DocumentPaper } from "@/components/documents/DocumentPaper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDashboardHireDocuments,
  useFilteredDashboardHireDocs,
  type DashboardHireDocItem,
} from "@/hooks/useDashboardHireDocuments";
import { docKindLabelTh } from "@/lib/documents/numbering";
import type { HireDocumentKind } from "@/lib/payments/types";

const KIND_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "ทุกชนิด" },
  { value: "quotation", label: "ใบเสนอราคา" },
  { value: "invoice", label: "ใบแจ้งหนี้" },
  { value: "receipt", label: "ใบเสร็จ" },
  { value: "platform_fee_receipt", label: "ค่าธรรมเนียม" },
  { value: "wht_cert", label: "50 ทวิ" },
];

function whtStatusLabel(item: DashboardHireDocItem): string | null {
  if (item.kind !== "wht_cert") return null;
  if (item.whtConfirmed) return "ยืนยันรับแล้ว";
  if (item.fileUrl) return "มีไฟล์";
  if (item.whtMethod === "post") return "ส่งไปรษณีย์";
  if (item.whtStatus === "awaiting_cert") return "รอเอกสาร";
  return "รอดำเนินการ";
}

function openOrPrintDoc(item: DashboardHireDocItem, onView: (item: DashboardHireDocItem) => void) {
  if (item.fileUrl) {
    window.open(item.fileUrl, "_blank", "noopener,noreferrer");
    return;
  }
  if (item.snapshot) {
    onView(item);
    toast.info("กด Ctrl/⌘+P เพื่อบันทึกเป็น PDF");
    return;
  }
  toast.info("ยังไม่มีไฟล์สำหรับเอกสารนี้");
}

type Props = {
  userId: string;
};

export default function DashboardHireDocumentsPanel({ userId }: Props) {
  const { data, isLoading, isError } = useDashboardHireDocuments(userId);
  const [year, setYear] = useState("all");
  const [kind, setKind] = useState("all");
  const [q, setQ] = useState("");
  const [viewItem, setViewItem] = useState<DashboardHireDocItem | null>(null);

  const years = useMemo(() => {
    const set = new Set<string>();
    for (const item of data ?? []) {
      set.add(String(new Date(item.issuedAt).getFullYear()));
    }
    return [...set].sort((a, b) => Number(b) - Number(a));
  }, [data]);

  const filtered = useFilteredDashboardHireDocs(data, { year, kind, q });

  return (
    <section
      id="hire-documents"
      className="scroll-mt-24 rounded-2xl border border-border/70 bg-card/50 p-4 sm:p-5 space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            เอกสารจ้างงาน
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            ใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ ค่าธรรมเนียม และหนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ) —
            ดูย้อนหลังและดาวน์โหลดได้
          </p>
        </div>
        {data && data.length > 0 ? (
          <Badge variant="secondary" className="rounded-full tabular-nums">
            {filtered.length}/{data.length}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="h-9 w-full sm:w-[120px] rounded-full text-xs">
            <SelectValue placeholder="ปี" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกปี</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="h-9 w-full sm:w-[160px] rounded-full text-xs">
            <SelectValue placeholder="ชนิด" />
          </SelectTrigger>
          <SelectContent>
            {KIND_FILTERS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาเลขเอกสารหรือชื่องาน"
            className="h-9 rounded-full pl-9 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลดเอกสาร…
        </div>
      ) : isError ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          โหลดเอกสารไม่สำเร็จ — ตารางอาจยังไม่พร้อม หรือลองรีเฟรชใหม่
        </p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            {data && data.length > 0
              ? "ไม่พบเอกสารตามตัวกรอง"
              : "ยังไม่มีเอกสาร — จะปรากฏหลังมีใบเสนอราคา ชำระเงิน หรืออัปโหลด 50 ทวิ"}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-background/60">
          {filtered.map((item) => {
            const label = docKindLabelTh(item.kind as HireDocumentKind);
            const whtLabel = whtStatusLabel(item);
            const dateLabel = format(new Date(item.issuedAt), "d MMM yyyy", { locale: th });
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    {item.kind === "wht_cert" && whtLabel ? (
                      <Badge variant="outline" className="rounded-full text-[10px] font-normal">
                        {whtLabel}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {item.docNumber}
                    <span className="mx-1.5 text-border">·</span>
                    {dateLabel}
                  </p>
                  {item.projectTitle ? (
                    <p className="truncate text-xs text-muted-foreground">{item.projectTitle}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    aria-label={`ดู${label}`}
                    onClick={() => {
                      if (item.fileUrl && !item.snapshot) {
                        window.open(item.fileUrl, "_blank", "noopener,noreferrer");
                        return;
                      }
                      if (item.snapshot) {
                        setViewItem(item);
                        return;
                      }
                      toast.info("ยังไม่มีไฟล์ให้ดู");
                    }}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    aria-label={`ดาวน์โหลด${label}`}
                    onClick={() => openOrPrintDoc(item, setViewItem)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewItem ? docKindLabelTh(viewItem.kind as HireDocumentKind) : "เอกสาร"}
            </DialogTitle>
            <DialogDescription className="tabular-nums">
              {viewItem?.docNumber}
              {viewItem?.projectTitle ? ` · ${viewItem.projectTitle}` : ""}
            </DialogDescription>
          </DialogHeader>
          {viewItem?.snapshot ? <DocumentPaper doc={viewItem.snapshot} /> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
