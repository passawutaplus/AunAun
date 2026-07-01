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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileDropzone } from "@/components/doc/FileDropzone";
import { useFinance } from "@/store/finance";
import { useAuth } from "@/auth/AuthProvider";
import { useTaxEstimate } from "./useTaxEstimate";
import {
  buildAccountantLineMessage,
  buildAccountantPackZip,
  computeAccountantPreflight,
  defaultPackItems,
  type AccountantPackItem,
} from "./buildAccountantPack";
import { downloadBlob } from "@/lib/docZip";
import { formatTHB } from "@/data/mockData";
import { AlertTriangle, CheckCircle2, Copy, Download, FileArchive, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AccountantPackDialog({ open, onOpenChange }: Props) {
  const { incomes, workExpenses, expenseMethod } = useFinance();
  const { est } = useTaxEstimate();
  const { profile } = useAuth();
  const taxYear = new Date().getFullYear();
  const brandName = profile?.brand_name ?? profile?.display_name ?? undefined;

  const preflight = React.useMemo(
    () => computeAccountantPreflight(incomes, workExpenses),
    [incomes, workExpenses],
  );

  const [extraFiles, setExtraFiles] = React.useState<File[]>([]);
  const [items, setItems] = React.useState<AccountantPackItem[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [mergeWht, setMergeWht] = React.useState(false);
  const [zipEstimateMb, setZipEstimateMb] = React.useState<number | null>(null);

  const estimatedBytes = React.useMemo(() => {
    const baseCsv = 48_000;
    const whtBytes = preflight.whtWithFile * 180_000;
    const extras = extraFiles.reduce((s, f) => s + f.size, 0);
    const included = items.filter((x) => x.included).length * 12_000;
    return baseCsv + whtBytes + extras + included;
  }, [preflight.whtWithFile, extraFiles, items]);

  React.useEffect(() => {
    setZipEstimateMb(Math.max(0.1, estimatedBytes / (1024 * 1024)));
  }, [estimatedBytes]);

  React.useEffect(() => {
    if (open) {
      setItems(defaultPackItems(incomes, workExpenses));
      setExtraFiles([]);
    }
  }, [open, incomes, workExpenses]);

  function toggleItem(id: string, checked: boolean) {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, included: checked } : x)));
  }

  async function handleDownload() {
    setBusy(true);
    try {
      const blob = await buildAccountantPackZip({
        year: taxYear,
        incomes,
        workExpenses,
        est,
        expenseMethod,
        brandName,
        extraFiles,
        items,
        mergeWhtIntoSinglePdf: mergeWht,
      });
      downloadBlob(blob, `so1o-tax-${taxYear}.zip`);
      toast.success("ดาวน์โหลดชุดนักบัญชีแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "สร้าง ZIP ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyLine() {
    const fileList = [
      ...items.filter((x) => x.included).map((x) => x.label),
      ...extraFiles.map((f) => f.name),
    ];
    const msg = buildAccountantLineMessage({
      year: taxYear,
      brandName,
      preflight,
      fileList,
    });
    try {
      await navigator.clipboard.writeText(msg);
      toast.success("คัดลอกข้อความส่ง Line แล้ว");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  }

  const ready = preflight.incomeCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5 text-primary" />
            ส่งนักบัญชี — ปี {taxYear}
          </DialogTitle>
          <DialogDescription>
            รวมสรุปภาษี CSV ใบ 50ทวิ และใบเสร็จเป็น ZIP คลิกเดียว
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2 text-xs">
            <p className="font-semibold text-sm">ตรวจความพร้อม</p>
            <PreflightRow
              ok={preflight.incomeCount > 0}
              label={`รายได้ ${preflight.incomeCount} รายการ`}
            />
            <PreflightRow
              ok={preflight.whtEligible === 0 || preflight.whtWithFile === preflight.whtEligible}
              warn={preflight.whtMissing.length > 0}
              label={`ใบ 50ทวิ ${preflight.whtWithFile}/${preflight.whtEligible} มีไฟล์`}
              detail={
                preflight.whtMissing.length > 0
                  ? `ขาด ${preflight.whtMissing.length} รายการ — อัปโหลดในส่วน 50ทวิ ด้านล่าง`
                  : undefined
              }
            />
            <PreflightRow
              ok
              label={`รายจ่ายจริง ${preflight.expenseWithReceipt}/${preflight.expenseCount} มีใบเสร็จ`}
            />
            <div className="flex justify-between pt-1 border-t border-border/50">
              <span className="text-muted-foreground">ภาษีประมาณการ</span>
              <span className="num font-semibold">฿{formatTHB(est.estimatedTax)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold">ไฟล์ในชุด</p>
            <div className="space-y-1.5 max-h-40 overflow-auto pr-1">
              {items.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg border border-border/50 px-2.5 py-2 cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox
                    checked={item.included}
                    onCheckedChange={(v) => toggleItem(item.id, !!v)}
                  />
                  <span className="text-xs flex-1 min-w-0 truncate">{item.label}</span>
                  <Badge variant="outline" className="text-[9px] shrink-0">
                    {item.kind}
                  </Badge>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs rounded-lg border border-border/50 px-3 py-2 cursor-pointer">
            <Checkbox checked={mergeWht} onCheckedChange={(v) => setMergeWht(!!v)} />
            รวมใบ 50ทวิ เป็น PDF เดียว (แทนไฟล์แยก)
          </label>

          <div className="space-y-2">
            <p className="text-xs font-semibold">โยนไฟล์เพิ่ม (ถ้ามี)</p>
            <FileDropzone
              onFiles={(files) => setExtraFiles((prev) => [...prev, ...files].slice(0, 10))}
              title="ลากไฟล์เพิ่มมาวาง"
              hint="PDF / รูป · สูงสุด 10 ไฟล์ · ไปโฟลเดอร์ extras/"
              maxFiles={10}
            />
            {extraFiles.length > 0 && (
              <ul className="text-[11px] text-muted-foreground space-y-0.5">
                {extraFiles.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex justify-between gap-2">
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      className="text-destructive shrink-0"
                      onClick={() => setExtraFiles((prev) => prev.filter((_, j) => j !== i))}
                    >
                      ลบ
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {zipEstimateMb != null && (
            <p className="text-[11px] text-muted-foreground w-full sm:order-first sm:flex-1 sm:self-center">
              ขนาด ZIP โดยประมาณ ~{zipEstimateMb.toFixed(1)} MB
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            className="gap-1.5 w-full sm:w-auto"
            onClick={() => void handleCopyLine()}
            disabled={busy}
          >
            <Copy className="h-3.5 w-3.5" />
            คัดลอกข้อความ Line
          </Button>
          <Button
            type="button"
            className="gap-1.5 w-full sm:w-auto"
            onClick={() => void handleDownload()}
            disabled={busy || !ready}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            ดาวน์โหลด ZIP
          </Button>
        </DialogFooter>

        {!ready && (
          <p className="text-[11px] text-warning flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            บันทึกรายได้อย่างน้อย 1 รายการก่อนส่งชุดนักบัญชี
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PreflightRow({
  ok,
  warn,
  label,
  detail,
}: {
  ok: boolean;
  warn?: boolean;
  label: string;
  detail?: string;
}) {
  const Icon = ok && !warn ? CheckCircle2 : AlertTriangle;
  return (
    <div className="flex gap-2">
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 mt-0.5",
          ok && !warn ? "text-success" : "text-warning",
        )}
      />
      <div className="min-w-0">
        <p>{label}</p>
        {detail && <p className="text-muted-foreground mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}
