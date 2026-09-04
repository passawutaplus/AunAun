import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { readAboutCvTheme, type AboutCvTheme } from "@/lib/aboutCvTheme";
import { aboutCvPdfFilename, downloadAboutCvPdf } from "@/lib/aboutCvPdf";
import { parseProfileCv } from "@/lib/profileCv";
import ProfileAboutReadOnly, { ProfileAboutToolbar } from "@/components/profile/ProfileAboutReadOnly";
import ProfileAboutEditor from "@/components/profile/ProfileAboutEditor";
import { cn } from "@/lib/utils";
import AboutDocumentPreviewDialog, {
  AboutDocumentSheet,
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
  mode?: "owner" | "public";
  profileUrl?: string | null;
  sectionClassName?: string;
};

function printAboutCv() {
  window.print();
}

export default function ProfileAboutPanel({
  userId,
  profile,
  experience,
  skills,
  socialLinks,
  mode = "public",
  profileUrl,
  sectionClassName,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [cvTheme, setCvTheme] = useState<AboutCvTheme>(readAboutCvTheme);
  const [downloading, setDownloading] = useState(false);
  const canEdit = mode === "owner" && !!userId;
  const publicTheme: AboutCvTheme = "orange";
  const sheetProps = {
    profile,
    experience,
    skills,
    socialLinks,
    profileUrl,
    theme: mode === "public" ? publicTheme : cvTheme,
    forceShowApplicationContact: mode === "owner",
  };
  const frameClass = cn(
    "glass-panel p-5 md:p-6",
    mode === "owner" ? "rounded-3xl" : "rounded-2xl",
    sectionClassName,
  );
  const pdfName = aboutCvPdfFilename(parseProfileCv(profile.cv).fullName.trim());

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadAboutCvPdf(pdfName);
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
          onSaved={() => setEditing(false)}
          sectionClassName={frameClass}
        />
      ) : mode === "public" ? (
        <>
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              disabled={downloading}
              onClick={() => void handleDownloadPdf()}
              className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" />
              {downloading ? "กำลังสร้าง PDF..." : "Download PDF"}
            </button>
            <button
              type="button"
              onClick={printAboutCv}
              className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
          </div>
          <div className="flex justify-center">
            <div className="about-cv-a4-frame">
              <AboutDocumentSheet {...sheetProps} />
            </div>
          </div>
        </>
      ) : (
        <>
          <ProfileAboutToolbar
            onEdit={canEdit ? () => setEditing(true) : undefined}
            onPreview={() => setPreviewOpen(true)}
            onPrint={printAboutCv}
          />
          <div className={frameClass}>
            <ProfileAboutReadOnly
              profile={profile}
              experience={experience}
              skills={skills}
              socialLinks={socialLinks}
              mode={mode}
              profileUrl={profileUrl}
              showToolbar={false}
            />
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
        />
      ) : null}
      <div id="about-cv-print" className="about-cv-print-root" aria-hidden="true">
        <AboutDocumentSheet {...sheetProps} />
      </div>
    </div>
  );
}
