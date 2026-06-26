import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { useUpdateOpenForWork } from "@/hooks/useJobs";
import JobCoverUploadField from "@/components/jobs/JobCoverUploadField";
import JobCardPreview from "@/components/jobs/JobCardPreview";
import SkillTagInput from "@/components/jobs/shared/SkillTagInput";
import RateFields, { type BudgetType } from "@/components/jobs/shared/RateFields";
import PortfolioPicker from "@/components/jobs/shared/PortfolioPicker";
import PostAsEntitySelect, { type PostAsSelection } from "@/components/jobs/shared/PostAsEntitySelect";
import { toast } from "sonner";
import { availabilityLabel } from "@/components/jobs/jobCardUtils";

const ROLE_OPTIONS = [
  "UI/UX", "Graphic", "Branding", "Illustration", "Motion", "Photography",
  "Video", "Audio", "Web/UI", "Content", "3D", "Copywriting", "Editorial", "Other",
];

interface Props {
  onSuccess: () => void;
}

const posterRoleFromEntity = (entity: PostAsSelection): "studio" | "company" | "freelancer" => {
  if (entity.entityType === "studio") return "studio";
  if (entity.entityType === "brand") return "company";
  return "freelancer";
};

const OpenForWorkForm = ({ onSuccess }: Props) => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const updateOfw = useUpdateOpenForWork(user?.id);
  const qc = useQueryClient();
  const [postAs, setPostAs] = useState<PostAsSelection>({ entityType: "personal", studioId: null });
  const [employment, setEmployment] = useState<"project" | "fulltime" | "parttime" | "internship" | "freelance">("freelance");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("UI/UX");
  const [desc, setDesc] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [budgetType, setBudgetType] = useState<BudgetType>("hourly");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [location, setLocation] = useState("");
  const [locType, setLocType] = useState<"remote" | "onsite" | "hybrid">("remote");
  const [readyToStart, setReadyToStart] = useState("immediate");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [portfolioIds, setPortfolioIds] = useState<string[]>([]);
  const [showBadge, setShowBadge] = useState(true);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user) { toast.error("กรุณาเข้าสู่ระบบ"); return; }
    if (!title.trim()) { toast.error("กรุณาระบุตำแหน่งที่รับงาน"); return; }
    setLoading(true);
    try {
      let cvUrl: string | null = null;
      if (cvFile) {
        const path = `anthem/${user.id}/cv/${crypto.randomUUID()}-${cvFile.name}`;
        const { error: upErr } = await sharedStorage.storage.from(SHARED_MEDIA_BUCKET).upload(path, cvFile);
        if (upErr) throw upErr;
        cvUrl = sharedStorage.storage.from(SHARED_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
      }

      if (showBadge) {
        await updateOfw.mutateAsync({
          open_for_work: true,
          open_for_work_badge: employment === "fulltime" ? "Looking for Full-time" : "Available for Freelance",
          availability_status: readyToStart,
          hourly_rate_min: budgetType === "hourly" && budgetMin ? parseInt(budgetMin) : null,
          daily_rate_min: budgetType === "fixed" && budgetMin ? parseInt(budgetMin) : null,
        } as never);
      }

      const { error } = await supabase.from("job_posts").insert({
        posted_by: user.id,
        studio_id: postAs.studioId,
        posted_as_studio_id: postAs.studioId,
        title: title.trim(),
        role_category: role,
        description: desc.trim(),
        skills,
        budget_min: budgetMin ? parseInt(budgetMin) : null,
        budget_max: budgetMax ? parseInt(budgetMax) : null,
        budget_type: budgetType,
        location_type: locType,
        location: location.trim(),
        status: "open",
        post_type: "seeking",
        poster_role: posterRoleFromEntity(postAs),
        poster_entity_type: postAs.entityType,
        employment_type: employment,
        attached_cv_url: cvUrl,
        attached_portfolio_ids: portfolioIds,
        cover_image_url: coverImageUrl,
        ready_to_start: readyToStart,
        show_profile_badge: showBadge,
      } as never);
      if (error) throw error;
      toast.success("เปิดรับงานเรียบร้อย");
      qc.invalidateQueries({ queryKey: ["jobs-open"] });
      qc.invalidateQueries({ queryKey: ["open-for-work-creators"] });
      onSuccess();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {user && (
        <JobCoverUploadField userId={user.id} value={coverImageUrl} onChange={setCoverImageUrl} />
      )}

      <div>
        <Label className="text-xs">ตำแหน่ง / สิ่งที่รับทำ</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="เช่น UI Designer · Photographer"
          className="rounded-xl"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">หมวดหมู่</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">ประเภทงานที่รับ</Label>
          <Select value={employment} onValueChange={(v) => setEmployment(v as typeof employment)}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="freelance">Freelance</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="fulltime">Full-time</SelectItem>
              <SelectItem value="parttime">Part-time</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <PostAsEntitySelect value={postAs} onChange={setPostAs} mode="seeking" />

      <RateFields
        budgetType={budgetType}
        onBudgetTypeChange={setBudgetType}
        budgetMin={budgetMin}
        budgetMax={budgetMax}
        onBudgetMinChange={setBudgetMin}
        onBudgetMaxChange={setBudgetMax}
        minLabel="เรทเริ่มต้น (฿)"
        maxLabel="สูงสุด (฿)"
      />

      <div>
        <Label className="text-xs">Skill tags</Label>
        <SkillTagInput value={skills} onChange={setSkills} />
      </div>

      <div>
        <Label className="text-xs">Portfolio จากโปรไฟล์</Label>
        <PortfolioPicker value={portfolioIds} onChange={setPortfolioIds} max={6} />
      </div>

      <div>
        <Label className="text-xs">แนบ CV (PDF, optional)</Label>
        <Input type="file" accept="application/pdf" onChange={(e) => setCvFile(e.target.files?.[0] ?? null)} className="rounded-xl" />
      </div>

      <div>
        <Label className="text-xs">พร้อมเริ่มงาน</Label>
        <Select value={readyToStart} onValueChange={setReadyToStart}>
          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(availabilityLabel).map(([k, label]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">รูปแบบสถานที่</Label>
          <Select value={locType} onValueChange={(v) => setLocType(v as typeof locType)}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="onsite">Onsite</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{locType === "remote" ? "ประเทศ / Timezone (optional)" : "สถานที่"}</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={locType === "remote" ? "Thailand, GMT+7" : "กรุงเทพฯ"} className="rounded-xl" />
        </div>
      </div>

      <div>
        <Label className="text-xs">รายละเอียด</Label>
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="rounded-xl" />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border/50 px-3 py-2.5">
        <div>
          <p className="text-sm font-medium thai-display">เปิด Badge บนโปรไฟล์</p>
          <p className="text-xs text-muted-foreground">Available for Work</p>
        </div>
        <Switch checked={showBadge} onCheckedChange={setShowBadge} />
      </div>

      <JobCardPreview
        data={{
          title,
          description: desc,
          role_category: role,
          skills,
          budget_min: budgetMin ? parseInt(budgetMin) : null,
          budget_max: budgetMax ? parseInt(budgetMax) : null,
          budget_type: budgetType,
          location_type: locType,
          location,
          employment_type: employment,
          post_type: "seeking",
          cover_image_url: coverImageUrl,
          posterName: profile?.display_name ?? "ผู้ใช้",
          posterAvatar: profile?.avatar_url,
        }}
      />

      <Button disabled={loading} onClick={submit} className="w-full rounded-xl bg-gradient-brand text-white">
        {loading ? "กำลังบันทึก..." : "เปิดรับงาน"}
      </Button>
    </div>
  );
};

export default OpenForWorkForm;
