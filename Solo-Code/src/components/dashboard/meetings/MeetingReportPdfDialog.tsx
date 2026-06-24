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
import { Download } from "lucide-react";
import { MeetingReportPdfTemplate } from "./MeetingReportPdfTemplate";
import { runPrintToPdf } from "@/lib/printPdf";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  reportMarkdown: string;
  createdAt: string;
  durationSec?: number | null;
  autoPrint?: boolean;
}

export function MeetingReportPdfDialog({
  open,
  onOpenChange,
  title,
  reportMarkdown,
  createdAt,
  durationSec,
  autoPrint,
}: Props) {
  React.useEffect(() => {
    if (!open || !autoPrint) return;
    const t = window.setTimeout(() => {
      runPrintToPdf({
        bodyClass: "printing-meeting-report",
        successMessage: "ส่งออก PDF สำเร็จ",
        onAfterPrint: () => onOpenChange(false),
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [open, autoPrint, onOpenChange]);

  if (!reportMarkdown.trim()) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[min(96vw,800px)] h-[90vh] p-0 overflow-hidden rounded-2xl flex flex-col"
        >
          <DialogHeader className="no-print px-4 py-3 border-b flex flex-row items-center justify-between gap-3 space-y-0">
            <DialogTitle className="text-sm font-semibold">ตัวอย่าง PDF รายงาน</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  runPrintToPdf({
                    bodyClass: "printing-meeting-report",
                    successMessage: "ส่งออก PDF สำเร็จ",
                  })
                }
              >
                <Download className="h-4 w-4" />
                บันทึก PDF
              </Button>
              <DialogCloseButton />
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-6 bg-muted/30">
            <div className="mx-auto max-w-[210mm] bg-white shadow-lg rounded-sm p-8 min-h-[297mm]">
              <MeetingReportPdfTemplate
                title={title}
                reportMarkdown={reportMarkdown}
                createdAt={createdAt}
                durationSec={durationSec}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {open &&
        createPortal(
          <div className="meeting-report-print-only">
            <MeetingReportPdfTemplate
              title={title}
              reportMarkdown={reportMarkdown}
              createdAt={createdAt}
              durationSec={durationSec}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
