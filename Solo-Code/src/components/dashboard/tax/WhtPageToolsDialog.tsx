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
import { extractPdfPages, fileToBytes, getPdfPageInfos, rotatePdfPage } from "@/lib/docPdf";
import { supabase } from "@/integrations/supabase/client";
import { whtStorageBucket } from "@/lib/whtScanAsset";
import { useFinance } from "@/store/finance";
import type { IncomeRecord } from "@/data/mockData";
import { Loader2, RotateCw, Scissors } from "lucide-react";
import { toast } from "sonner";

type Props = {
  income: IncomeRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Upload fresh file (no income link yet) */
  initialFile?: File | null;
  onSaved?: (storagePath: string) => void;
};

export function WhtPageToolsDialog({
  income,
  open,
  onOpenChange,
  initialFile,
  onSaved,
}: Props) {
  const { updateIncome } = useFinance();
  const [bytes, setBytes] = React.useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = React.useState(0);
  const [selected, setSelected] = React.useState<number[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [thumbs, setThumbs] = React.useState<(string | null)[]>([]);

  React.useEffect(() => {
    if (!open) {
      setThumbs([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let data: Uint8Array | null = null;
        if (initialFile) {
          data = await fileToBytes(initialFile);
        } else if (income?.certificateStoragePath) {
          const { data: blob, error } = await supabase.storage
            .from(whtStorageBucket())
            .download(income.certificateStoragePath);
          if (error || !blob) throw error ?? new Error("โหลดไฟล์ไม่สำเร็จ");
          data = new Uint8Array(await blob.arrayBuffer());
        }
        if (cancelled || !data) return;
        const infos = await getPdfPageInfos(data);
        setBytes(data);
        setPageCount(infos.length);
        setSelected(infos.map((p) => p.index));
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "โหลด PDF ไม่สำเร็จ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, income?.certificateStoragePath, initialFile]);

  React.useEffect(() => {
    if (!bytes || pageCount === 0) {
      setThumbs([]);
      return;
    }
    let cancelled = false;
    void import("@/lib/pdfPageThumbnails").then(({ renderPdfPageThumbnails }) =>
      renderPdfPageThumbnails(bytes, pageCount).then((t) => {
        if (!cancelled) setThumbs(t);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [bytes, pageCount]);

  function togglePage(idx: number, checked: boolean) {
    setSelected((prev) => {
      if (checked) return [...prev, idx].sort((a, b) => a - b);
      return prev.filter((x) => x !== idx);
    });
  }

  async function handleRotate() {
    if (!bytes || selected.length !== 1) {
      toast.error("เลือกหน้าเดียวเพื่อหมุน");
      return;
    }
    setBusy(true);
    try {
      const rotated = await rotatePdfPage(bytes, selected[0], 90);
      setBytes(rotated);
      toast.success("หมุนหน้าแล้ว — กดบันทึกเพื่อเก็บ");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "หมุนไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!bytes) return;
    setBusy(true);
    try {
      let out = bytes;
      if (selected.length > 0 && selected.length < pageCount) {
        out = await extractPdfPages(bytes, selected);
      }
      const userId = income?.id ? undefined : (await supabase.auth.getUser()).data.user?.id;
      const uid = userId ?? (await supabase.auth.getUser()).data.user?.id;
      if (!uid) throw new Error("กรุณาเข้าสู่ระบบ");

      const path =
        income?.certificateStoragePath ??
        `${uid}/${Date.now()}-wht-edited.pdf`;
      const { error } = await supabase.storage
        .from(whtStorageBucket())
        .upload(path, out, { upsert: true, contentType: "application/pdf" });
      if (error) throw error;

      if (income) {
        await updateIncome(income.id, { certificateStoragePath: path, certificateReceived: true });
      }
      onSaved?.(path);
      toast.success("บันทึกไฟล์ 50ทวิ แล้ว");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const isPdf = initialFile?.type === "application/pdf" || income?.certificateStoragePath?.endsWith(".pdf");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-primary" />
            จัดหน้า 50ทวิ
          </DialogTitle>
          <DialogDescription>
            แยกหรือหมุนหน้าจากสแกนรวม — อยู่ในแท็บภาษี ไม่ต้องใช้เครื่องมือภายนอก
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด...
          </div>
        ) : !isPdf || pageCount === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            รองรับเฉพาะไฟล์ PDF หลายหน้า
          </p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-auto">
            {Array.from({ length: pageCount }, (_, i) => (
              <label
                key={i}
                className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <Checkbox
                  checked={selected.includes(i)}
                  onCheckedChange={(v) => togglePage(i, !!v)}
                />
                {thumbs[i] ? (
                  <img
                    src={thumbs[i]!}
                    alt={`หน้า ${i + 1}`}
                    className="h-12 w-9 object-cover rounded border border-border/40 shrink-0"
                  />
                ) : (
                  <span className="h-12 w-9 rounded border border-dashed border-border/40 bg-muted/40 shrink-0" />
                )}
                หน้า {i + 1}
              </label>
            ))}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            disabled={busy || pageCount === 0}
            onClick={() => void handleRotate()}
          >
            <RotateCw className="h-3.5 w-3.5" />
            หมุน 90°
          </Button>
          <Button type="button" disabled={busy || !bytes} onClick={() => void handleSave()}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
