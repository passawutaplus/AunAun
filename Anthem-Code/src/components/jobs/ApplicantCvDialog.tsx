import { useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AboutDocumentSheet } from "@/components/profile/AboutDocumentPreview";
import { useProfile } from "@/hooks/useProfile";
import { parseProfileCv } from "@/lib/profileCv";
import { parseSocialLinks } from "@/lib/parseSocialLinks";
import { normalizeExperienceItem, type ExperienceItem } from "@/lib/validators";

type Props = {
  userId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const parseExperience = (raw: unknown): ExperienceItem[] =>
  Array.isArray(raw)
    ? raw.map(normalizeExperienceItem).filter((x): x is ExperienceItem => !!x)
    : [];

export default function ApplicantCvDialog({ userId, open, onOpenChange }: Props) {
  const { data: profile, isLoading } = useProfile(open ? userId ?? undefined : undefined);
  const cv = parseProfileCv(profile?.cv);
  const experience = parseExperience(profile?.experience);
  const skills = Array.isArray(profile?.skills)
    ? profile.skills.filter((s): s is string => typeof s === "string")
    : [];
  const socialLinks = parseSocialLinks(profile?.social_links);
  const sheetProfile = useMemo(() => {
    if (!profile) return null;
    return {
      display_name: profile.display_name,
      username: profile.username,
      avatar_url: profile.avatar_url,
      cv_photo_url: profile.cv_photo_url,
      cv: profile.cv,
      role: profile.role,
      location: profile.location,
      profile_address: profile.profile_address,
      bio: profile.bio,
      website: profile.website,
      line_id: profile.line_id,
      facebook: profile.facebook,
      instagram: profile.instagram,
    };
  }, [profile]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-fit max-w-[min(210mm,calc(100vw-1.25rem))] max-h-[92vh] overflow-y-auto rounded-2xl">
        <DialogTitle className="thai-display pr-6">
          {cv.fullName.trim() || profile?.display_name || "About Me"}
        </DialogTitle>
        <DialogDescription className="sr-only">CV ที่ผู้สมัครส่งมาพร้อมใบสมัคร</DialogDescription>
        {isLoading ? (
          <div className="about-cv-a4-frame mx-auto bg-muted/30 animate-pulse" />
        ) : sheetProfile ? (
          <div className="about-cv-a4-frame mx-auto bg-white">
            <AboutDocumentSheet
              profile={sheetProfile}
              experience={experience}
              skills={skills}
              socialLinks={socialLinks}
              theme="orange"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">ยังโหลด CV ไม่ได้</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
