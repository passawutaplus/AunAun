import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import JobCoverUploadField from "@/components/jobs/JobCoverUploadField";
import JobCardPreview from "@/components/jobs/JobCardPreview";
import { toast } from "sonner";

const ROLE_OPTIONS = [
  "UI/UX", "Graphic", "Branding", "Illustration", "Motion", "Photography",
  "Video", "Audio", "Web/UI", "Content", "3D", "Copywriting", "Editorial", "Other",
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultMode?: "hiring" | "seeking";
}

const JobPostDialog = ({ open, onOpenChange, defaultMode = "hiring" }: Props) => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const qc = useQueryClient();
  const [mode, setMode] = useState<"hiring" | "seeking">(defaultMode);
  const [posterRole, setPosterRole] = useState<"studio" | "company" | "freelancer">(
    defaultMode === "seeking" ? "freelancer" : "company"
  );
  const [employment, setEmployment] = useState<"project" | "fulltime" | "parttime" | "internship">("project");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("UI/UX");
  const [desc, setDesc] = useState("");
  const [skills, setSkills] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [location, setLocation] = useState("Remote");
  const [locType, setLocType] = useState<"remote" | "onsite" | "hybrid">("remote");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const budgetType = employment === "fulltime" || employment === "parttime" ? "monthly" as const : "fixed" as const;

  const reset = () => {
    setTitle(""); setDesc(""); setSkills(""); setBudgetMin(""); setBudgetMax("");
    setCoverImageUrl(null);
    setCvFile(null);
  };

  const submit = async () => {
    if (!user) { toast.error("กรุณาเข้าสู่ระบบ"); return; }
    if (!title.trim()) { toast.error("กรุณาระบุชื่อประกาศ"); return; }
    setLoading(true);
    try {
      let cvUrl: string | null = null;
      if (mode === "seeking" && cvFile) {
        const path = `anthem/${user.id}/cv/${crypto.randomUUID()}-${cvFile.name}`;
        const { error: upErr } = await sharedStorage.storage
          .from(SHARED_MEDIA_BUCKET)
          .upload(path, cvFile);
        if (upErr) throw upErr;
        cvUrl = sharedStorage.storage
          .from(SHARED_MEDIA_BUCKET)
          .getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("job_posts").insert({
        posted_by: user.id,
        studio_id: null,
        title: title.trim(),
        role_category: role,
        description: desc.trim(),
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        budget_min: budgetMin ? parseInt(budgetMin) : null,
        budget_max: budgetMax ? parseInt(budgetMax) : null,
        budget_type: budgetType,
        location_type: locType,
        location,
        status: "open",
        post_type: mode,
        poster_role: posterRole,
        employment_type: employment,
        attached_cv_url: cvUrl,
        cover_image_url: coverImageUrl,
      } as any);
      if (error) throw error;
      toast.success(mode === "seeking" ? "ประกาศหางานเรียบร้อย" : "ลงประกาศงานเรียบร้อย");
      qc.invalidateQueries({ queryKey: ["jobs-open"] });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "ลงประกาศไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "hiring" ? "ลงประกาศหาคนทำงาน" : "ประกาศหางาน / ลง CV"}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-2">
          <Button
            type="button"
            variant={mode === "hiring" ? "default" : "outline"}
            size="sm"
            className={mode === "hiring" ? "bg-gradient-brand text-white" : ""}
            onClick={() => { setMode("hiring"); setPosterRole("company"); }}
          >หาคน/พนักงาน</Button>
          <Button
            type="button"
            variant={mode === "seeking" ? "default" : "outline"}
            size="sm"
            className={mode === "seeking" ? "bg-gradient-brand text-white" : ""}
            onClick={() => { setMode("seeking"); setPosterRole("freelancer"); }}
          >หางาน</Button>
        </div>

        <div className="space-y-3">
          {user && (
            <JobCoverUploadField
              userId={user.id}
              value={coverImageUrl}
              onChange={setCoverImageUrl}
            />
          )}

          <div>
            <Label className="text-xs">ชื่อประกาศ</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={mode === "hiring" ? "เช่น หา UI Designer ทำแอป Wellness" : "เช่น UI Designer มองหางานประจำ"} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">หมวดหมู่งาน</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">ประเภทการจ้าง</Label>
              <Select value={employment} onValueChange={(v) => setEmployment(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="fulltime">Full-time</SelectItem>
                  <SelectItem value="parttime">Part-time</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">{mode === "hiring" ? "ผู้โพสต์" : "ฉันคือ"}</Label>
            <Select value={posterRole} onValueChange={(v) => setPosterRole(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="studio">Studio</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="freelancer">Freelancer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">รายละเอียด</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} />
          </div>

          <div>
            <Label className="text-xs">ทักษะ (คั่นด้วย ,)</Label>
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Figma, Prototyping" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">งบ/ค่าจ้าง ต่ำสุด (฿)</Label>
              <Input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">สูงสุด (฿)</Label>
              <Input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">รูปแบบสถานที่</Label>
              <Select value={locType} onValueChange={(v) => setLocType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="onsite">Onsite</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">สถานที่</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>

          {mode === "seeking" && (
            <div>
              <Label className="text-xs">แนบ CV (PDF)</Label>
              <Input type="file" accept="application/pdf" onChange={(e) => setCvFile(e.target.files?.[0] ?? null)} />
            </div>
          )}

          <JobCardPreview
            data={{
              title,
              description: desc,
              role_category: role,
              skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
              budget_min: budgetMin ? parseInt(budgetMin) : null,
              budget_max: budgetMax ? parseInt(budgetMax) : null,
              budget_type: budgetType,
              location_type: locType,
              location,
              employment_type: employment,
              post_type: mode,
              cover_image_url: coverImageUrl,
              posterName: profile?.display_name ?? "ผู้ใช้",
              posterAvatar: profile?.avatar_url,
            }}
          />

          <Button
            disabled={loading}
            onClick={submit}
            className="w-full rounded-xl bg-gradient-brand text-white"
          >
            {loading ? "กำลังบันทึก..." : (mode === "seeking" ? "ประกาศหางาน" : "ลงประกาศงาน")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobPostDialog;
