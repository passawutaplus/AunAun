import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useCreateJob } from "@/hooks/useJobs";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { parseMoneyInput } from "@/lib/parseMoney";
import JobCoverUploadField from "@/components/jobs/JobCoverUploadField";
import JobCardPreview from "@/components/jobs/JobCardPreview";
import SkillTagInput from "@/components/jobs/shared/SkillTagInput";
import RateFields, { type BudgetType } from "@/components/jobs/shared/RateFields";
import PostAsEntitySelect, { type PostAsSelection } from "@/components/jobs/shared/PostAsEntitySelect";
import { toast } from "sonner";

const ROLE_OPTIONS = [
  "UI/UX", "Graphic", "Branding", "Illustration", "Motion", "Photography",
  "Video", "Audio", "Web/UI", "Content", "3D", "Copywriting", "Editorial", "Other",
];

const APP_METHODS = [
  { id: "portfolio", label: "ส่ง Portfolio" },
  { id: "cv", label: "ส่ง CV" },
  { id: "quote", label: "แนบราคาเสนอ" },
];

interface Props {
  onSuccess: () => void;
}

const posterRoleFromEntity = (entity: PostAsSelection): "studio" | "company" | "freelancer" => {
  if (entity.entityType === "studio") return "studio";
  if (entity.entityType === "brand") return "company";
  return "freelancer";
};

const PostOpportunityForm = ({ onSuccess }: Props) => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const createJob = useCreateJob();
  const [postAs, setPostAs] = useState<PostAsSelection>({ entityType: "personal", studioId: null });
  const [employment, setEmployment] = useState<"project" | "fulltime" | "parttime" | "internship" | "freelance">("project");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("UI/UX");
  const [desc, setDesc] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [deliverables, setDeliverables] = useState("");
  const [budgetType, setBudgetType] = useState<BudgetType>("fixed");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [location, setLocation] = useState("");
  const [locType, setLocType] = useState<"remote" | "onsite" | "hybrid">("remote");
  const [deadline, setDeadline] = useState("");
  const [headcount, setHeadcount] = useState("1");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [appMethods, setAppMethods] = useState<string[]>(["portfolio"]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const parsedBudgetMin = parseMoneyInput(budgetMin);
  const parsedBudgetMax = parseMoneyInput(budgetMax);

  const toggleMethod = (id: string) => {
    setAppMethods((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async () => {
    if (!user) { toast.error("กรุณาเข้าสู่ระบบ"); return; }
    if (!title.trim()) {
      const msg = "กรุณาระบุชื่อประกาศ";
      setSubmitError(msg);
      toast.error(msg);
      return;
    }
    if (!desc.trim()) {
      const msg = "กรุณากรอกรายละเอียดงาน";
      setSubmitError(msg);
      toast.error(msg);
      return;
    }
    if (parsedBudgetMin != null && parsedBudgetMax != null && parsedBudgetMin > parsedBudgetMax) {
      const msg = "งบต่ำสุดต้องไม่มากกว่างบสูงสุด";
      setSubmitError(msg);
      toast.error(msg);
      return;
    }
    setSubmitError(null);
    try {
      await createJob.mutateAsync({
        posted_by: user.id,
        studio_id: postAs.studioId,
        posted_as_studio_id: postAs.studioId,
        title: title.trim(),
        role_category: role,
        description: desc.trim(),
        skills,
        deliverables: deliverables.split("\n").map((s) => s.trim()).filter(Boolean),
        budget_min: parsedBudgetMin,
        budget_max: parsedBudgetMax,
        budget_type: budgetType,
        location_type: locType,
        location: location.trim(),
        deadline: deadline || null,
        headcount: headcount ? parseInt(headcount, 10) : 1,
        status: "open",
        post_type: "hiring",
        poster_role: posterRoleFromEntity(postAs),
        poster_entity_type: postAs.entityType,
        employment_type: employment,
        cover_image_url: coverImageUrl,
        application_methods: appMethods.length ? appMethods : ["portfolio"],
      } as never);
      onSuccess();
    } catch (e: unknown) {
      const msg = mapWriteFlowError(e, "บันทึกไม่สำเร็จ");
      setSubmitError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-3">
      {user && (
        <JobCoverUploadField userId={user.id} value={coverImageUrl} onChange={setCoverImageUrl} />
      )}

      <div>
        <Label htmlFor="job-post-title" className="text-xs">ชื่อประกาศ</Label>
        <Input
          id="job-post-title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="เช่น หา UI Designer ทำแอป Wellness"
          className="rounded-xl"
        />
      </div>

      <PostAsEntitySelect value={postAs} onChange={setPostAs} mode="hiring" />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">หมวดหมู่</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">ประเภทงาน</Label>
          <Select value={employment} onValueChange={(v) => setEmployment(v as typeof employment)}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="freelance">Freelance</SelectItem>
              <SelectItem value="fulltime">Full-time</SelectItem>
              <SelectItem value="parttime">Part-time</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="job-post-desc" className="text-xs">รายละเอียดงาน</Label>
        <Textarea
          id="job-post-desc"
          name="description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={4}
          className="rounded-xl"
        />
      </div>

      <div>
        <Label className="text-xs">สิ่งที่ต้องส่งมอบ (บรรทัดละ 1 รายการ)</Label>
        <Textarea
          value={deliverables}
          onChange={(e) => setDeliverables(e.target.value)}
          placeholder={"5 หน้า UI\nLogo 3 แบบ"}
          rows={3}
          className="rounded-xl"
        />
      </div>

      <div>
        <Label className="text-xs">Skill ที่ต้องการ</Label>
        <SkillTagInput value={skills} onChange={setSkills} />
      </div>

      <RateFields
        budgetType={budgetType}
        onBudgetTypeChange={setBudgetType}
        budgetMin={budgetMin}
        budgetMax={budgetMax}
        onBudgetMinChange={setBudgetMin}
        onBudgetMaxChange={setBudgetMax}
        minLabel="งบต่ำสุด (฿)"
        maxLabel="งบสูงสุด (฿)"
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="job-deadline" className="text-xs">กำหนดส่งงาน</Label>
          <Input
            id="job-deadline"
            name="deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div>
          <Label className="text-xs">จำนวนคนที่ต้องการ</Label>
          <Input type="number" min={1} value={headcount} onChange={(e) => setHeadcount(e.target.value)} className="rounded-xl" />
        </div>
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
          <Input value={location} onChange={(e) => setLocation(e.target.value)} className="rounded-xl" />
        </div>
      </div>

      <div>
        <Label className="text-xs">วิธีสมัคร</Label>
        <div className="flex flex-wrap gap-3 mt-1.5">
          {APP_METHODS.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={appMethods.includes(m.id)} onCheckedChange={() => toggleMethod(m.id)} />
              {m.label}
            </label>
          ))}
        </div>
      </div>

      <JobCardPreview
        data={{
          title,
          description: desc,
          role_category: role,
          skills,
          budget_min: parsedBudgetMin,
          budget_max: parsedBudgetMax,
          budget_type: budgetType,
          location_type: locType,
          location,
          employment_type: employment,
          post_type: "hiring",
          cover_image_url: coverImageUrl,
          posterName: profile?.display_name ?? "ผู้ใช้",
          posterAvatar: profile?.avatar_url,
        }}
      />

      {submitError && (
        <p className="text-sm text-destructive rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2" role="alert">
          {submitError}
        </p>
      )}

      <Button disabled={createJob.isPending} onClick={() => void submit()} className="w-full rounded-xl bg-gradient-brand text-white">
        {createJob.isPending ? "กำลังบันทึก..." : "ลงประกาศโอกาสงาน"}
      </Button>
    </div>
  );
};

export default PostOpportunityForm;
