import { useState } from "react";
import { Download, Link2, Printer } from "lucide-react";
import { toast } from "sonner";
import { readAboutCvTheme, type AboutCvTheme } from "@/lib/aboutCvTheme";
import { aboutCvPdfFilename } from "@/lib/aboutCvPdf";
import { downloadAboutCvDocument } from "@/lib/aboutCvDownload";
import { parseProfileCv } from "@/lib/profileCv";
import { ProfileAboutToolbar } from "@/components/profile/ProfileAboutReadOnly";
import type { CvProjectInput } from "@/lib/aboutCvModel";
import ProfileTabHeading from "@/components/profile/ProfileTabHeading";
import ProfileAboutEditor from "@/components/profile/ProfileAboutEditor";
import { cn } from "@/lib/utils";
import AboutDocumentPreviewDialog, {
  AboutDocumentSheet,
  type CvFit,
} from "@/components/profile/AboutDocumentPreview";
import type { ExperienceItem, SocialLinkItem } from "@/lib/validators";

type ProfileAbout = {
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  cv_photo_url?: string | null;
  cv?: unknown;
  role: string | null;
  location: string | null;
  profile_address?: unknown;
  bio: string | null;
  email: string | null;
  website: string | null;
  line_id: string | null;
  facebook: string | null;
  instagram: string | null;
  phone?: string | null;
};

type Props = {
  userId?: string;
  profile: ProfileAbout;
  experience: ExperienceItem[];
  skills: string[];
  socialLinks?: SocialLinkItem[];
  /** Published projects for the CV's Selected Work block. */
  projects?: CvProjectInput[];
  mode?: "owner" | "public";
  profileUrl?: string | null;
  sectionClassName?: string;
};

function printAboutCv() {
  window.print();
}

/** Public link that opens straight on the About Me tab. */
function cvShareUrl(profileUrl: string | null | undefined): string | null {
  if (!profileUrl) return null;
  try {
    const url = new URL(profileUrl, window.location.origin);
    url.searchParams.set("tab", "about");
    return url.toString();
  } catch {
    return null;
  }
}

export default function ProfileAboutPanel({
  userId,
  profile,
  experience,
  skills,
  socialLinks,
  projects,
  mode = "public",
  profileUrl,
  sectionClassName,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [cvTheme, setCvTheme] = useState<AboutCvTheme>(readAboutCvTheme);
  const [downloading, setDownloading] = useState(false);
  const [fit, setFit] = useState<CvFit>({ density: "normal", overflow: false });
  const canEdit = mode === "owner" && !!userId;
  // Owners see (and print) the theme they picked; visitors always get the default look.
  const liveTheme: AboutCvTheme = mode === "owner" ? cvTheme : "orange";
  const sheetProps = {
    profile,
    experience,
    skills,
    socialLinks,
    profileUrl,
    projects,
    density: fit.density,
  };
  // Print/PDF are for job applications: the owner's copy always carries application contacts.
  const printProps = { ...sheetProps, theme: liveTheme, forceShowApplicationContact: mode === "owner" };
  const handleFit = (next: CvFit) =>
    setFit((prev) => (prev.density === next.density && prev.overflow === next.overflow ? prev : next));
  const frameClass = cn(
    "glass-panel p-5 md:p-6",
    mode === "owner" ? "rounded-3xl" : "rounded-2xl",
    sectionClassName,
  );
  const aboutActionClass =
    "inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs text-foreground hover:bg-black/5 disabled:opacity-60";
  const pdfName = aboutCvPdfFilename(parseProfileCv(profile.cv).fullName.trim());

  const shareUrl = cvShareUrl(profileUrl);
  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("คัดลอกลิงก์ CV แล้ว");
    } catch {
      toast.error("คัดลอกลิงก์ไม่สำเร็จ");
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const { photoSkipped } = await downloadAboutCvDocument({
        input: printProps,
        theme: liveTheme,
        filename: pdfName,
      });
      if (photoSkipped) toast.info("สร้าง PDF แล้ว แต่ใส่รูปโปรไฟล์ไม่ได้");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ดาวน์โหลด PDF ไม่สำเร็จ");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-3">
      {editing && canEdit ? (
        <ProfileAboutEditor
          userId={userId!}
          profile={profile}
          projects={projects}
          profileUrl={profileUrl}
          onSaved={() => setEditing(false)}
          sectionClassName={frameClass}
        />
      ) : (
        <>
          {mode === "public" ? (
            <ProfileTabHeading
              title="About Me"
              actions={
                <>
                  {shareUrl ? (
                    <button type="button" onClick={() => void handleCopyLink()} className={aboutActionClass}>
                      <Link2 className="h-3.5 w-3.5" />
                      Copy link
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={downloading}
                    onClick={() => void handleDownloadPdf()}
                    className={aboutActionClass}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {downloading ? "กำลังสร้าง PDF..." : "Download PDF"}
                  </button>
                  <button type="button" onClick={printAboutCv} className={aboutActionClass}>
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </button>
                </>
              }
            />
          ) : (
            <ProfileAboutToolbar
              onEdit={canEdit ? () => setEditing(true) : undefined}
              onPreview={() => setPreviewOpen(true)}
              onPrint={printAboutCv}
              onCopyLink={shareUrl ? () => void handleCopyLink() : undefined}
            />
          )}
          {mode === "owner" && fit.overflow ? (
            <p role="status" className="rounded-xl bg-amber-100 px-3 py-2 text-xs text-amber-950">
              เนื้อหายาวเกิน 1 หน้า A4 — ลดข้อความ ปิดบางหัวข้อ หรือเลือกคอลัมน์เดียวในหน้าแก้ไข
            </p>
          ) : null}
          <div className="flex justify-center">
            <div className="about-cv-a4-frame about-cv-a4-frame--page">
              <AboutDocumentSheet {...sheetProps} theme={liveTheme} />
            </div>
          </div>
        </>
      )}
      {canEdit ? (
        <AboutDocumentPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          onPrint={printAboutCv}
          onThemeChange={setCvTheme}
          {...sheetProps}
          forceShowApplicationContact
          fit={fit}
          theme={cvTheme}
        />
      ) : null}
      <div id="about-cv-print" className="about-cv-print-root" aria-hidden="true">
        <AboutDocumentSheet {...printProps} onFit={handleFit} />
      </div>
    </div>
  );
}
