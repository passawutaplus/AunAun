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
import { buildAboutCvModel, type AboutCvProfile, type CvProjectInput } from "@/lib/aboutCvModel";
import {
  ABOUT_CV_THEMES,
  type AboutCvTheme,
  readAboutCvTheme,
  writeAboutCvTheme,
} from "@/lib/aboutCvTheme";
import { CvTemplateBody } from "@/components/profile/CvTemplates";
import CvSheetScaler from "@/components/profile/CvSheetScaler";
import { cn } from "@/lib/utils";

type ProfileAbout = AboutCvProfile;

export type CvDensity = "normal" | "compact";
export type CvFit = { density: CvDensity; overflow: boolean };

type DocProps = {
  profile: ProfileAbout;
  experience: ExperienceItem[];
  skills: string[];
  socialLinks?: SocialLinkItem[];
  profileUrl?: string | null;
  /** Owner's published projects, for the optional Selected Work section. */
  projects?: CvProjectInput[];
  theme?: AboutCvTheme;
  /** Owner print/PDF — always include application email/LINE/phone. */
  forceShowApplicationContact?: boolean;
  /** Spacing scale; the measuring sheet (onFit) picks its own. */
  density?: CvDensity;
  /** Set on the fixed-size print sheet only: reports which density fits A4. */
  onFit?: (fit: CvFit) => void;
};

export function AboutDocumentSheet({
  profile,
  experience,
  skills,
  socialLinks = [],
  profileUrl,
  projects,
  theme = "mono",
  forceShowApplicationContact = false,
  density = "normal",
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
    projects,
    forceShowApplicationContact,
  });
  const initials = displayInitials(model.name || profile.username || profile.display_name, 2);

  // The print root (fixed A4) is the source of truth for fit: try the normal
  // density, fall back to compact, and report whether it still overflows.
  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!onFit || !el) return;
    const overflows = () =>
      el.scrollHeight > el.clientHeight + 1 ||
      Array.from(el.querySelectorAll<HTMLElement>(".cv-fit")).some(
        (part) => part.scrollHeight > part.clientHeight + 1,
      );
    const measure = () => {
      el.dataset.density = "normal";
      let next: CvFit = { density: "normal", overflow: overflows() };
      if (next.overflow) {
        el.dataset.density = "compact";
        next = { density: "compact", overflow: overflows() };
      }
      const prev = lastFit.current;
      if (prev && prev.density === next.density && prev.overflow === next.overflow) return;
      lastFit.current = next;
      onFit(next);
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
      data-density={onFit ? undefined : density}
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
  onThemeChange?: (theme: AboutCvTheme) => void;
};

export default function AboutDocumentPreviewDialog({
  open,
  onOpenChange,
  onPrint,
  theme,
  onThemeChange,
  fit,
  ...doc
}: DialogProps) {
  const [localTheme, setLocalTheme] = useState<AboutCvTheme>(() => theme ?? readAboutCvTheme());
  const [downloading, setDownloading] = useState(false);
  const activeTheme = theme ?? localTheme;
  const themeMeta = ABOUT_CV_THEMES.find((item) => item.id === activeTheme) ?? ABOUT_CV_THEMES[0];
  const previewName = parseProfileCv(doc.profile.cv).fullName.trim() || "Creator";

  const setTheme = (next: AboutCvTheme) => {
    writeAboutCvTheme(next);
    setLocalTheme(next);
    onThemeChange?.(next);
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const { photoSkipped } = await downloadAboutCvDocument({
        input: doc,
        theme: activeTheme,
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
        style={{ background: themeMeta.frame }}
      >
        <DialogTitle className="sr-only">About Me preview for {previewName}</DialogTitle>
        <DialogDescription className="sr-only">
          A4 portrait preview for printing or job applications
        </DialogDescription>
        <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="ธีมพรีวิว">
            {ABOUT_CV_THEMES.filter((item) => item.id !== "slate").map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={activeTheme === item.id}
                onClick={() => setTheme(item.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] border bg-white transition-colors",
                  activeTheme === item.id
                    ? "border-black font-medium text-foreground"
                    : "border-black/20 text-foreground hover:border-black",
                )}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: item.swatch }}
                  aria-hidden
                />
                {item.label}
              </button>
            ))}
          </div>
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
            เนื้อหายาวเกิน 1 หน้า A4 — ลดข้อความ ปิดบางหัวข้อ หรือเลือกเทมเพลตอื่น
          </p>
        ) : null}
        <div className="about-cv-a4-frame">
          <CvSheetScaler>
            <AboutDocumentSheet {...doc} theme={activeTheme} />
          </CvSheetScaler>
        </div>
      </DialogContent>
    </Dialog>
  );
}
