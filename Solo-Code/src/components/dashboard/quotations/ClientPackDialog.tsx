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

import { FileDropzone } from "@/components/doc/FileDropzone";

import type { Quotation } from "@/store/quotations";

import {

  buildClientLineMessage,

  buildClientPackZip,

  downloadBlob,

} from "./buildClientPack";

import { consumeDocLabHandoff, handoffEntryToFile } from "@/lib/docLabHandoff";

import { computeClientPackPreflight } from "@/lib/clientPackPreflight";

import { Copy, Download, FileArchive, Loader2, Send, CheckCircle2, AlertTriangle } from "lucide-react";

import { toast } from "sonner";

import { cn } from "@/lib/utils";



type Props = {

  q: Quotation;

  open: boolean;

  onOpenChange: (open: boolean) => void;

  onExportPdf?: () => void;

  onCaptureQuotationPdf?: () => Promise<Blob | null>;

  trackUrl?: string;

};



export function ClientPackDialog({

  q,

  open,

  onOpenChange,

  onExportPdf,

  onCaptureQuotationPdf,

  trackUrl,

}: Props) {

  const [includeBrief, setIncludeBrief] = React.useState(!!q.briefId);

  const [includeTimeline, setIncludeTimeline] = React.useState(false);

  const [includeQtPdf, setIncludeQtPdf] = React.useState(true);

  const [extraFiles, setExtraFiles] = React.useState<File[]>([]);

  const [busy, setBusy] = React.useState(false);

  const [cachedPdf, setCachedPdf] = React.useState<Blob | null>(null);



  React.useEffect(() => {

    if (!open) return;

    setIncludeBrief(!!q.briefId);

    setCachedPdf(null);

    const handoff = consumeDocLabHandoff();

    if (handoff?.files?.length) {

      setExtraFiles((prev) => [...prev, ...handoff.files.map(handoffEntryToFile)]);

      toast.info("แนบไฟล์จาก Doc Lab แล้ว");

    }

  }, [open, q.briefId]);



  const preflight = React.useMemo(

    () =>

      computeClientPackPreflight({

        q,

        extraFiles,

        trackUrl,

        includeQtPdf,

        hasQtPdf: !!cachedPdf || !!onCaptureQuotationPdf,

      }),

    [q, extraFiles, trackUrl, includeQtPdf, cachedPdf, onCaptureQuotationPdf],

  );



  async function resolveQtPdf(): Promise<Blob | null> {

    if (!includeQtPdf) return null;

    if (cachedPdf) return cachedPdf;

    if (!onCaptureQuotationPdf) return null;

    const blob = await onCaptureQuotationPdf();

    if (blob) setCachedPdf(blob);

    return blob;

  }



  async function handleZip() {

    setBusy(true);

    try {

      const attachedPdf = await resolveQtPdf();

      const blob = await buildClientPackZip({

        q,

        includeBrief,

        includeTimeline,

        trackUrl,

        extraFiles,

        attachedPdf,

      });

      downloadBlob(blob, `so1o-client-${q.number || "pack"}.zip`);

      toast.success("ดาวน์โหลดชุดส่งลูกค้าแล้ว");

    } catch (e) {

      toast.error(e instanceof Error ? e.message : "สร้าง ZIP ไม่สำเร็จ");

    } finally {

      setBusy(false);

    }

  }



  async function handleCopyLine() {

    const names = [

      ...(includeQtPdf ? ["ใบเสนอราคา PDF"] : []),

      ...(includeBrief && q.briefId ? ["Smart Brief"] : []),

      ...(includeTimeline ? ["Timeline"] : []),

      ...extraFiles.map((f) => f.name),

    ];

    const msg = buildClientLineMessage({ q, trackUrl, fileNames: names });

    try {

      await navigator.clipboard.writeText(msg);

      toast.success("คัดลอกข้อความส่ง Line แล้ว");

    } catch {

      toast.error("คัดลอกไม่สำเร็จ");

    }

  }



  return (

    <Dialog open={open} onOpenChange={onOpenChange}>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">

        <DialogHeader>

          <DialogTitle className="flex items-center gap-2">

            <Send className="h-5 w-5 text-primary" />

            ชุดส่งลูกค้า

          </DialogTitle>

          <DialogDescription>

            รวมเอกสารและไฟล์แนบก่อนส่งลูกค้า

          </DialogDescription>

        </DialogHeader>



        <div className="space-y-4 text-sm">

          <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">

            <p className="font-medium">{q.projectName}</p>

            <p className="text-xs text-muted-foreground">{q.clientName}</p>

            {trackUrl && (

              <p className="text-[11px] text-primary break-all">Track: {trackUrl}</p>

            )}

          </div>



          <div className="rounded-xl border border-border/60 p-3 space-y-2">

            <p className="text-xs font-semibold">ตรวจก่อนส่ง</p>

            <ul className="space-y-1">

              {preflight.items.map((item) => (

                <li key={item.id} className="flex items-start gap-2 text-[11px]">

                  {item.ok ? (

                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />

                  ) : (

                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />

                  )}

                  <span className={cn(!item.ok && "text-amber-800 dark:text-amber-200")}>

                    {item.label}

                    {item.hint && !item.ok && (

                      <span className="block text-muted-foreground">{item.hint}</span>

                    )}

                  </span>

                </li>

              ))}

            </ul>

          </div>



          <div className="space-y-2">

            <label className="flex items-center gap-2 text-xs">

              <Checkbox

                checked={includeQtPdf}

                onCheckedChange={(v) => setIncludeQtPdf(!!v)}

                disabled={!onCaptureQuotationPdf}

              />

              รวมใบเสนอราคา PDF ใน ZIP

            </label>

            {q.briefId && (

              <label className="flex items-center gap-2 text-xs">

                <Checkbox checked={includeBrief} onCheckedChange={(v) => setIncludeBrief(!!v)} />

                รวม Smart Brief ในคำอธิบายชุด

              </label>

            )}

            <label className="flex items-center gap-2 text-xs">

              <Checkbox checked={includeTimeline} onCheckedChange={(v) => setIncludeTimeline(!!v)} />

              รวม Timeline ในคำอธิบายชุด

            </label>

          </div>



          <FileDropzone

            onFiles={(files) => setExtraFiles((prev) => [...prev, ...files].slice(0, 15))}

            title="ลากไฟล์แนบเพิ่ม"

            hint="mockup, source, ฯลฯ · สูงสุด 15 ไฟล์"

            maxFiles={15}

          />

          {extraFiles.length > 0 && (

            <ul className="text-[11px] text-muted-foreground space-y-0.5">

              {extraFiles.map((f, i) => (

                <li key={`${f.name}-${i}`} className="flex justify-between gap-2">

                  <span className="truncate">{f.name}</span>

                  <button

                    type="button"

                    className="text-destructive"

                    onClick={() => setExtraFiles((p) => p.filter((_, j) => j !== i))}

                  >

                    ลบ

                  </button>

                </li>

              ))}

            </ul>

          )}

        </div>



        <DialogFooter className="flex-col gap-2 sm:flex-row">

          {onExportPdf && (

            <Button type="button" variant="outline" className="gap-1.5 w-full sm:w-auto" onClick={onExportPdf}>

              <Download className="h-3.5 w-3.5" />

              Export PDF แยก

            </Button>

          )}

          <Button type="button" variant="outline" className="gap-1.5" onClick={() => void handleCopyLine()}>

            <Copy className="h-3.5 w-3.5" />

            คัดลอก Line

          </Button>

          <Button type="button" className="gap-1.5" disabled={busy} onClick={() => void handleZip()}>

            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileArchive className="h-3.5 w-3.5" />}

            ดาวน์โหลด ZIP

          </Button>

        </DialogFooter>

      </DialogContent>

    </Dialog>

  );

}


