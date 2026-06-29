import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RESEARCH_INTRO } from "@/data/uxResearchGuide";

type Props = {
  variant?: "banner" | "button" | "link";
  className?: string;
};

/** ลิงก์โหลดเช็คลิส UX PDF — ไฟล์อยู่ที่ public/ */
export default function UxChecklistPdfDownload({ variant = "button", className }: Props) {
  const href = RESEARCH_INTRO.checklistPdfPath;
  const download = RESEARCH_INTRO.checklistPdfName;

  if (variant === "link") {
    return (
      <a
        href={href}
        download={download}
        className={className ?? "text-primary font-medium hover:underline whitespace-nowrap inline-flex items-center gap-1"}
      >
        <Download className="w-3.5 h-3.5" aria-hidden />
        โหลด PDF
      </a>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={
          className ??
          "rounded-2xl border border-primary/35 bg-primary/8 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
        }
      >
        <div className="flex gap-3 min-w-0">
          <FileText className="w-8 h-8 shrink-0 text-primary" aria-hidden />
          <div className="space-y-0.5">
            <p className="font-semibold text-sm">เช็คลิส UX/UI (PDF)</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              พิมพ์หรือ tick ขณะทดสอบ — Journey, Tasks T1–T8, Features A–T
            </p>
          </div>
        </div>
        <Button asChild className="rounded-full gap-2 shrink-0 w-full sm:w-auto">
          <a href={href} download={download}>
            <Download className="w-4 h-4" aria-hidden />
            ดาวน์โหลด PDF
          </a>
        </Button>
      </div>
    );
  }

  return (
    <Button asChild variant="outline" size="sm" className={className ?? "rounded-full gap-2"}>
      <a href={href} download={download}>
        <Download className="w-4 h-4" aria-hidden />
        ดาวน์โหลด PDF
      </a>
    </Button>
  );
}
