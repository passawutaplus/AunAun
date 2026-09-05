import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useApplyToJob, type JobPost } from "@/hooks/useJobs";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyProjects } from "@/hooks/useProjects";
import { JOB_APPLY_PLATFORM_DISCLAIMER } from "@/lib/legalSignupCopy";
import { profileAboutPath, profileAboutUrl } from "@/lib/profileRoutes";
import { AboutDocumentSheet } from "@/components/profile/AboutDocumentPreview";
import JobApplySuccessPanel from "@/components/jobs/JobApplySuccessPanel";
import { parseProfileCv } from "@/lib/profileCv";
import { parseSocialLinks } from "@/lib/parseSocialLinks";
import { normalizeExperienceItem, type ExperienceItem } from "@/lib/validators";

type Props = {
  job: JobPost;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

const parseExperience = (raw: unknown): ExperienceItem[] =>
  Array.isArray(raw)
    ? raw.map(normalizeExperienceItem).filter((x): x is ExperienceItem => !!x)
    : [];

const JobApplyProfileDialog = ({ job, open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const { data: myProjects = [] } = useMyProjects(user?.id);
  const apply = useApplyToJob();
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  const published = myProjects.filter((p) => p.status === "Published");
  const cv = parseProfileCv(profile?.cv);
  const displayName = cv.fullName.trim() || profile?.display_name?.trim() || "";
  const desiredRole = cv.desiredRole.trim() || profile?.role?.trim() || "";
  const experience = parseExperience(profile?.experience);
  const skills = Array.isArray(profile?.skills)
    ? profile.skills.filter((s): s is string => typeof s === "string")
    : [];
  const socialLinks = parseSocialLinks(profile?.social_links);
  const cvUrl =
    user && profile
      ? profileAboutUrl({ user_id: user.id, username: profile.username })
      : "";
  const aboutPath =
    user && profile
      ? profileAboutPath({ user_id: user.id, username: profile.username })
      : "";
  const canSend = !!displayName && published.length >= 1;
  const company = job.hiring_org?.display_name || "บริษัท";

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

  const close = (next: boolean) => {
    if (!next) {
      setNote("");
      setSent(false);
    }
    onOpenChange(next);
  };

  const submit = async () => {
    if (!user || !canSend) return;
    const letter = [note.trim(), cvUrl ? `About Me: ${cvUrl}` : ""].filter(Boolean).join("\n\n");
    try {
      await apply.mutateAsync({
        job_id: job.id,
        cover_letter: letter,
        portfolio_project_ids: published.slice(0, 6).map((p) => p.id),
      });
      setNote("");
      setSent(true);
    } catch {
      // useApplyToJob already toasts
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="w-fit max-w-[min(210mm,calc(100vw-1.25rem))] max-h-[92vh] overflow-y-auto rounded-2xl">
        {sent ? (
          <>
            <DialogTitle className="sr-only">ส่งโปรไฟล์แล้ว</DialogTitle>
            <DialogDescription className="sr-only">รอบริษัทตอบกลับ</DialogDescription>
            <JobApplySuccessPanel
              title="ส่งโปรไฟล์แล้ว"
              body={`ส่งให้ ${company} แล้ว — รอบริษัทพิจารณาภายใน 2 สัปดาห์ ถ้าสนใจบริษัทจะทักแชทมาหาคุณ`}
              onClose={() => close(false)}
            />
          </>
        ) : (
          <>
            <DialogTitle className="thai-display pr-6">ส่งโปรไฟล์สมัคร {job.title}</DialogTitle>
            <DialogDescription>
              ส่งให้ {company} พิจารณา — ยังไม่เปิดแชท จนกว่าบริษัทจะตอบรับ
            </DialogDescription>
            <div className="space-y-3">
              {profileLoading ? (
                <div className="about-cv-a4-frame mx-auto bg-muted/30 animate-pulse" />
              ) : sheetProfile ? (
                <div className="space-y-2">
                  <div className="about-cv-a4-frame mx-auto bg-white">
                    <AboutDocumentSheet
                      profile={sheetProfile}
                      experience={experience}
                      skills={skills}
                      socialLinks={socialLinks}
                      theme="orange"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 text-xs text-muted-foreground truncate">
                      {displayName || "—"}
                      {desiredRole ? ` · ${desiredRole}` : ""}
                      {` · ผลงาน ${published.length} ชิ้น`}
                    </p>
                    {aboutPath ? (
                      <Link to={aboutPath} className="shrink-0 text-xs text-primary hover:underline">
                        ดู About Me
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">ยังโหลดโปรไฟล์ไม่ได้</p>
              )}
              {!canSend ? (
                <p className="text-sm text-destructive">
                  ใส่ชื่อในโปรไฟล์และเผยแพร่ผลงานอย่างน้อย 1 ชิ้นก่อนส่ง
                </p>
              ) : null}
              <div>
                <Label htmlFor="job-apply-note" className="text-xs">ข้อความถึงบริษัท — ไม่บังคับ</Label>
                <Textarea
                  id="job-apply-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="rounded-xl mt-1"
                  placeholder="แนะนำตัวสั้น ๆ ได้"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">{JOB_APPLY_PLATFORM_DISCLAIMER}</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="rounded-xl" onClick={() => close(false)}>ยกเลิก</Button>
              <Button className="rounded-xl" disabled={apply.isPending || !canSend} onClick={() => void submit()}>
                {apply.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                ส่งโปรไฟล์
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default JobApplyProfileDialog;
