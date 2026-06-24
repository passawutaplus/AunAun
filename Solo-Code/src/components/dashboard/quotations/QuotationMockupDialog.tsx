import * as React from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { PreviewPanel } from "./PreviewPanel";
import { QuotationTimelineAppendix } from "./QuotationTimelineAppendix";
import { BriefPdfTemplate } from "@/components/dashboard/briefs/BriefPdfTemplate";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeBriefDesignDirection, type DesignBrief } from "@/lib/briefSchema";
import { runPrintToPdf } from "@/lib/printPdf";
import { useAuth } from "@/auth/AuthProvider";
import type { Quotation, DocKind } from "@/store/quotations";

interface Props {
  q: Quotation | null;
  docKind?: DocKind;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** When true, automatically trigger window.print() once the dialog opens */
  autoPrint?: boolean;
  /** Append the attached brief to the print payload */
  includeBrief?: boolean;
  /** Append a timeline appendix to the print payload */
  includeTimeline?: boolean;
}

// A4 portrait at 96dpi ≈ 1123px tall. Subtract a small printer margin buffer.
const A4_PAGE_PX = 1100;

function MockupPrintPayload({
  q,
  docKind,
  includeTimeline,
  includeBrief,
  brief,
  briefLoading,
  briefError,
}: {
  q: Quotation;
  docKind: DocKind;
  includeTimeline: boolean;
  includeBrief: boolean;
  brief: DesignBrief | null;
  briefLoading: boolean;
  briefError: boolean;
}) {
  return (
    <div className="mockup-print-root bg-white" style={{ width: "min(800px, 100%)" }}>
      <div className="p-2">
        <PreviewPanel q={q} docKind={docKind} showTimelineSection={false} />
      </div>
      {includeTimeline && (
        <div className="quotation-print-appendix mt-6 border-t-4 border-dashed border-primary/30 pt-4">
          <QuotationTimelineAppendix q={q} />
        </div>
      )}
      {includeBrief && brief && (
        <div className="quotation-print-appendix mt-6 border-t-4 border-dashed border-primary/30 pt-4">
          <div style={{ padding: "32px 36px" }}>
            <BriefPdfTemplate brief={brief} />
          </div>
        </div>
      )}
      {includeBrief && q.briefId && briefLoading && (
        <div className="quotation-print-appendix mt-6 p-6 text-center text-xs text-muted-foreground">
          กำลังโหลดใบบรีฟ...
        </div>
      )}
      {includeBrief && q.briefId && briefError && (
        <div className="quotation-print-appendix mt-6 p-6 text-center text-xs text-destructive">
          โหลดใบบรีฟไม่สำเร็จ — PDF จะมีเฉพาะใบเสนอราคา
        </div>
      )}
    </div>
  );
}

export function QuotationMockupDialog({
  q,
  docKind = "quotation",
  open,
  onOpenChange,
  autoPrint = false,
  includeBrief = false,
  includeTimeline = false,
}: Props) {
  const { profile } = useAuth();
  const [zoom, setZoom] = React.useState(1);
  const [brief, setBrief] = React.useState<DesignBrief | null>(null);
  const [briefLoading, setBriefLoading] = React.useState(false);
  const [briefError, setBriefError] = React.useState(false);
  const [pageCount, setPageCount] = React.useState<number | null>(null);
  const [printing, setPrinting] = React.useState(false);
  const printRootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (open) setZoom(1);
  }, [open]);

  // Fetch the attached brief when needed for the appendix
  React.useEffect(() => {
    if (!open || !includeBrief || !q?.briefId) {
      setBrief(null);
      setBriefError(false);
      return;
    }
    let cancelled = false;
    setBriefLoading(true);
    setBriefError(false);
    supabase
      .from("design_briefs")
      .select("*")
      .eq("id", q.briefId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setBriefError(true);
          setBriefLoading(false);
          toast.error("โหลดใบบรีฟไม่สำเร็จ", {
            description: "จะส่งออก PDF เฉพาะใบเสนอราคาแทน",
          });
          return;
        }
        const b = data as unknown as DesignBrief;
        setBrief({
          ...b,
          design_direction: sanitizeBriefDesignDirection(b.design_direction),
          owner: {
            display_name: (profile as any)?.display_name ?? null,
            brand_name: (profile as any)?.brand_name ?? null,
            logo_url: (profile as any)?.brand_logo_url ?? (profile as any)?.avatar_url ?? null,
            avatar_url: (profile as any)?.avatar_url ?? null,
            tagline: (profile as any)?.tagline ?? null,
            email: (profile as any)?.email ?? null,
            phone: (profile as any)?.phone ?? null,
            social_link: (profile as any)?.social_link ?? null,
          },
        });
        setBriefLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, includeBrief, q?.briefId, profile]);

  // Measure approximate page count whenever content changes
  React.useEffect(() => {
    if (!open) {
      setPageCount(null);
      return;
    }
    const node = printRootRef.current;
    if (!node) return;
    const measure = () => {
      // Strip the zoom transform from the measurement
      const h = node.getBoundingClientRect().height / zoom;
      setPageCount(Math.max(1, Math.ceil(h / A4_PAGE_PX)));
    };
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [open, zoom, brief, includeBrief, includeTimeline, q]);

  const canPrint = !briefLoading && !(includeBrief && q?.briefId && !brief && !briefError);

  const runPrint = React.useCallback(
    (source: "auto" | "manual") => {
      if (!canPrint) {
        toast.error("กำลังโหลดเอกสาร — รอสักครู่แล้วลองอีกครั้ง");
        return;
      }
      setPrinting(true);
      runPrintToPdf({
        bodyClass: "printing-mockup",
        showHint: source === "manual",
        delayMs: includeBrief && brief ? 450 : undefined,
        successMessage: pageCount ? `ส่งออก PDF สำเร็จ (~${pageCount} หน้า)` : "ส่งออก PDF สำเร็จ",
        onAfterPrint: () => {
          setPrinting(false);
          if (source === "auto") onOpenChange(false);
        },
        onCancel: () => setPrinting(false),
      });
    },
    [onOpenChange, pageCount, canPrint, includeBrief, brief],
  );

  // Auto-print flow
  React.useEffect(() => {
    if (!open || !autoPrint || !q) return;
    // If we're still loading the brief, hold off; if it errored, proceed without it.
    if (includeBrief && q.briefId && briefLoading) return;
    if (includeBrief && q.briefId && !brief && !briefError) return;

    let cancelled = false;
    const t = window.setTimeout(() => {
      if (!cancelled) runPrint("auto");
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, autoPrint, q, includeBrief, brief, briefLoading, briefError, runPrint]);

  if (!q) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[min(96vw,920px)] h-[92vh] p-0 overflow-hidden rounded-2xl flex flex-col"
      >
        <DialogHeader className="no-print px-4 py-3 border-b flex flex-row items-center justify-between gap-3 space-y-0 flex-wrap">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <DialogTitle className="text-sm font-semibold truncate">
              ตัวอย่างเอกสาร · {q.number}
            </DialogTitle>
            {pageCount !== null && (
              <Badge variant="secondary" className="gap-1 text-[10px] font-medium shrink-0">
                <FileText className="h-3 w-3" />~{pageCount} หน้า
              </Badge>
            )}
            {(includeBrief || includeTimeline) && (
              <span className="text-[10px] font-normal text-muted-foreground truncate">
                {includeBrief && "+ ใบบรีฟ"}
                {includeTimeline && "+ ภาคผนวกไทม์ไลน์"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              title="ย่อ"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs num w-10 text-center">{Math.round(zoom * 100)}%</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))}
              title="ขยาย"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1 bg-primary hover:bg-primary/90"
              onClick={() => runPrint("manual")}
              disabled={printing || !canPrint}
            >
              <Download className="h-3.5 w-3.5" />
              {printing ? "กำลังเตรียม…" : briefLoading ? "โหลดบรีฟ…" : "บันทึก PDF"}
            </Button>
            <DialogCloseButton />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-muted/40 p-6 flex justify-center items-start">
          <div
            ref={printRootRef}
            className="shadow-2xl rounded-sm origin-top transition-transform"
            style={{
              transform: `scale(${zoom})`,
              width: "min(800px, 100%)",
            }}
          >
            <MockupPrintPayload
              q={q}
              docKind={docKind}
              includeTimeline={includeTimeline}
              includeBrief={includeBrief}
              brief={brief}
              briefLoading={briefLoading}
              briefError={briefError}
            />
          </div>
        </div>
      </DialogContent>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="mockup-print-only">
            <MockupPrintPayload
              q={q}
              docKind={docKind}
              includeTimeline={includeTimeline}
              includeBrief={includeBrief}
              brief={brief}
              briefLoading={briefLoading}
              briefError={briefError}
            />
          </div>,
          document.body,
        )}
    </Dialog>
  );
}
