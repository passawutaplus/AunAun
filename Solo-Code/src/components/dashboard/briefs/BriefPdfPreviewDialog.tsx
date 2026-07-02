import * as React from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Download } from "lucide-react";
import { BriefPdfTemplate } from "./BriefPdfTemplate";
import type { DesignBrief, BriefOwnerPublic } from "@/lib/briefSchema";
import { runPrintToPdf } from "@/lib/printPdf";
import { useSubscription } from "@/hooks/useSubscription";
import { resolveDocumentTheme, type DocumentThemeInput } from "@/lib/documentTheme";
import { useAuth } from "@/auth/AuthProvider";

interface Props {
  brief: DesignBrief | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Owner/freelancer profile to print on the cover & footer */
  owner?: BriefOwnerPublic | null;
  /** Auto-open the browser Save-as-PDF dialog */
  autoPrint?: boolean;
}

/**
 * Realistic A4 paper preview for a Smart Brief PDF.
 * The print payload (.brief-print-only) is portaled to <body> as a direct
 * child so the print stylesheet can reliably hide everything else and only
 * print this node.
 */
export function BriefPdfPreviewDialog({ brief, open, onOpenChange, autoPrint, owner }: Props) {
  const { tier } = useSubscription();
  const { profile } = useAuth();
  const briefTheme = React.useMemo(
    () => resolveDocumentTheme(tier, (profile?.document_theme ?? {}) as DocumentThemeInput),
    [tier, profile?.document_theme],
  );
  const briefWithOwner = React.useMemo<DesignBrief | null>(() => {
    if (!brief) return null;
    return owner ? { ...brief, owner: { ...(brief.owner ?? {}), ...owner } } : brief;
  }, [brief, owner]);
  const [zoom, setZoom] = React.useState(1);

  React.useEffect(() => {
    if (open) setZoom(1);
  }, [open]);

  const triggerPrint = React.useCallback(() => {
    runPrintToPdf({
      bodyClass: "printing-brief",
      successMessage: "ส่งออก PDF สำเร็จ",
    });
  }, []);

  React.useEffect(() => {
    if (!open || !autoPrint || !brief) return;
    const t = window.setTimeout(() => {
      runPrintToPdf({
        bodyClass: "printing-brief",
        successMessage: "ส่งออก PDF สำเร็จ",
        onAfterPrint: () => onOpenChange(false),
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [open, autoPrint, brief, onOpenChange]);

  if (!brief) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[min(96vw,920px)] h-[92vh] p-0 overflow-hidden rounded-2xl flex flex-col"
        >
          <DialogHeader className="no-print px-4 py-3 border-b flex flex-row items-center justify-between gap-3 space-y-0">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm font-semibold truncate">
                พรีวิว PDF · {brief.title}
              </DialogTitle>
              <DialogDescription className="sr-only">
                ตัวอย่างเอกสาร Smart Brief ก่อนบันทึกหรือส่งให้ลูกค้า
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
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
                onClick={triggerPrint}
              >
                <Download className="h-3.5 w-3.5" /> บันทึก PDF
              </Button>
              <DialogCloseButton />
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto bg-muted/40 p-6 flex justify-center items-start no-print">
            <div
              className="bg-white shadow-2xl rounded-sm origin-top transition-transform"
              style={{
                transform: `scale(${zoom})`,
                // A4 ratio at ~96dpi (210mm × 297mm → ~794 × 1123 CSS px).
                width: "794px",
                minHeight: "1123px",
                padding: "52px 46px",
              }}
            >
              <BriefPdfTemplate brief={briefWithOwner!} theme={briefTheme} tier={tier} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print-only payload: portal to <body> so it's a direct child of body.
          Print CSS hides every other top-level body child. */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="brief-print-only">
            <BriefPdfTemplate brief={briefWithOwner!} theme={briefTheme} tier={tier} />
          </div>,
          document.body,
        )}
    </>
  );
}
