import { useLayoutEffect, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { aboutCvPdfFilename } from "@/lib/aboutCvPdf";
import { downloadAboutCvDocument } from "@/lib/aboutCvDownload";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ExperienceItem, SocialLinkItem } from "@/lib/validators";
import { displayInitials } from "@/lib/avatarPool";
import { parseProfileCv } from "@/lib/profileCv";
import { buildAboutCvModel, CV_FIT_SCALES, type AboutCvProfile } from "@/lib/aboutCvModel";
import type { AboutCvTheme } from "@/lib/aboutCvTheme";
import { CvTemplateBody } from "@/components/profile/CvTemplates";
import CvSheetScaler from "@/components/profile/CvSheetScaler";
import { cn } from "@/lib/utils";

type ProfileAbout = AboutCvProfile;

/** Result of the auto-fit: the scale picked and whether it still overflows one A4 page. */
export type CvFit = { scale: number; overflow: boolean };

type DocProps = {
  profile: ProfileAbout;
  experience: ExperienceItem[];
  skills: string[];
  socialLinks?: SocialLinkItem[];
  profileUrl?: string | null;
  theme?: AboutCvTheme;
  /** Owner print/PDF — always include application email/LINE/phone. */
  forceShowApplicationContact?: boolean;
  /** Reports the auto-fit result (the sheet shrinks itself to fit one A4 page). */
  onFit?: (fit: CvFit) => void;
};

/**
 * True when something inside a clipping column ends below it. Measured from
 * rects rather than scrollHeight, which over-reports by a few px in some
 * templates even when every line is visible.
 */
function contentOverflows(part: HTMLElement): boolean {
  const box = part.getBoundingClientRect();
  if (!part.clientHeight || !box.height) return false;
  const k = box.height / part.clientHeight; // the sheet is CSS-scaled on screen
  const limit = box.bottom + 0.5 * k;
  for (const node of Array.from(part.querySelectorAll("*"))) {
    if (node.getBoundingClientRect().bottom > limit) return true;
  }
  return false;
}

export function AboutDocumentSheet({
  profile,
  experience,
  skills,
  socialLinks = [],
  profileUrl,
  theme = "mono",
  forceShowApplicationContact = false,
  onFit,
}: DocProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const lastFit = useRef<CvFit | null>(null);
  const model = buildAboutCvModel({
    profile,
    experience,
    skills,
    socialLinks,
    profileUrl,
    forceShowApplicationContact,
  });
  const initials = displayInitials(model.name || profile.username || profile.display_name, 2);

  // Every sheet sits in a fixed A4 box: try full size, then shrink step by step
  // until nothing overflows, and report whether even the smallest step does.
  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const overflows = () =>
      el.scrollHeight > el.clientHeight + 1 ||
      Array.from(el.querySelectorAll<HTMLElement>(".cv-fit")).some(contentOverflows);
    const measure = () => {
      let next: CvFit = { scale: CV_FIT_SCALES[0], overflow: true };
      for (const scale of CV_FIT_SCALES) {
        el.style.setProperty("--cv-scale", String(scale));
        next = { scale, overflow: overflows() };
        if (!next.overflow) break;
      }
      const prev = lastFit.current;
      if (prev && prev.scale === next.scale && prev.overflow === next.overflow) return;
      lastFit.current = next;
      onFit?.(next);
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(el);
    void document.fonts?.ready.then(measure);
    return () => observer?.disconnect();
  });

  return (
    <div
      ref={sheetRef}
      className="about-cv-sheet"
      data-cv-theme={theme}
      data-cv-template={model.template}
      data-cv-heading={model.headingFont}
    >
      <CvTemplateBody model={model} initials={initials} />
    </div>
  );
}

type DialogProps = DocProps & {
  /** Fit result of the print sheet — drives the "too long for one page" notice. */
  fit?: CvFit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrint?: () => void;
};

export default function AboutDocumentPreviewDialog({
  open,
  onOpenChange,
  onPrint,
  theme = "mono",
  fit,
  ...doc
}: DialogProps) {
  const [downloading, setDownloading] = useState(false);
  const previewName = parseProfileCv(doc.profile.cv).fullName.trim() || "Creator";

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const { photoSkipped } = await downloadAboutCvDocument({
        input: doc,
        theme,
        filename: aboutCvPdfFilename(previewName === "Creator" ? "" : previewName),
      });
      if (photoSkipped) toast.info("สร้าง PDF แล้ว แต่ใส่รูปโปรไฟล์ไม่ได้");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ดาวน์โหลด PDF ไม่สำเร็จ");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/55 print:hidden"
        className={cn(
          "w-fit max-w-[min(210mm,calc(100vw-1.25rem))] gap-2.5 rounded-2xl border-0 p-3 sm:p-3.5",
          "print:hidden",
        )}
        style={{ background: "#ffffff" }}
      >
        <DialogTitle className="sr-only">About Me preview for {previewName}</DialogTitle>
        <DialogDescription className="sr-only">
          A4 portrait preview for printing or job applications
        </DialogDescription>
        <div className="flex flex-wrap items-center justify-end gap-2 pr-8">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full bg-white text-foreground"
              style={{ borderColor: "#111111", color: "#111111" }}
              disabled={downloading}
              onClick={() => void handleDownloadPdf()}
            >
              <Download className="h-3.5 w-3.5" />
              {downloading ? "กำลังสร้าง PDF..." : "Download PDF"}
            </Button>
            {onPrint ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full bg-white text-foreground"
                style={{ borderColor: "#111111", color: "#111111" }}
                onClick={onPrint}
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </Button>
            ) : null}
          </div>
        </div>
        {fit?.overflow ? (
          <p role="status" className="rounded-lg bg-amber-100 px-2.5 py-1.5 text-[11px] text-amber-950">
            ย่อตัวอักษรอัตโนมัติสุดแล้วแต่ยังเกิน 1 หน้า A4 — PDF จะต่อเป็นหน้า 2 ลดข้อความหรือปิดบางหัวข้อได้
          </p>
        ) : fit && fit.scale < 1 ? (
          <p role="status" className="rounded-lg bg-black/5 px-2.5 py-1.5 text-[11px] text-black/70">
            ย่อตัวอักษรอัตโนมัติ {Math.round(fit.scale * 100)}% ให้พอดี 1 หน้า A4
          </p>
        ) : null}
        <div className="about-cv-a4-frame">
          <CvSheetScaler>
            <AboutDocumentSheet {...doc} theme={theme} />
          </CvSheetScaler>
        </div>
      </DialogContent>
    </Dialog>
  );
}
