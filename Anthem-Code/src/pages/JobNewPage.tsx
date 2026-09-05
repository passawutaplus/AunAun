import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import RequireAuth from "@/components/RequireAuth";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useCreateJob } from "@/hooks/useJobs";
import { postingGate, useMyHiringOrgs } from "@/hooks/useHiringOrgs";
import PhoneCountryField from "@/components/hiring/PhoneCountryField";
import JobCoverUploadField from "@/components/jobs/JobCoverUploadField";
import JobGalleryUploadField from "@/components/jobs/JobGalleryUploadField";
import SkillTagInput from "@/components/jobs/shared/SkillTagInput";
import RateFields, { type BudgetType } from "@/components/jobs/shared/RateFields";
import { JOB_ROLE_CATEGORIES } from "@/lib/jobConstants";
import { composeWorkplace, linesOf, normalizeApplyMethods, type JobApplyMethod } from "@/lib/jobBrief";
import { parseMoneyInput } from "@/lib/parseMoney";
import { DEFAULT_HIRING_PHONE, isValidHiringEmail, isValidHiringPhone, normalizeSocialUrl, type JobSocialKind, type JobSocialLink } from "@/lib/hiringOrg";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import PageLoader from "@/components/ui/PageLoader";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

const APPLY_OPTIONS: { id: JobApplyMethod; label: string }[] = [
  { id: "portfolio", label: "ส่งพอร์ต" },
  { id: "resume", label: "ส่งเรซูเม่ / About Me" },
  { id: "rate", label: "ให้ผู้สมัครระบุเรท" },
  { id: "per_piece", label: "คิดราคาต่อชิ้น / ต่อคลิป" },
];

const JobNewInner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: orgs, isLoading } = useMyHiringOrgs();
  const createJob = useCreateJob();
  const gate = postingGate(orgs);
  const approved = gate.orgs;

  const [orgId, setOrgId] = useState("");
  const selectedOrg = useMemo(
    () => approved.find((o) => o.id === (orgId || approved[0]?.id)) ?? approved[0],
    [approved, orgId],
  );

  const [title, setTitle] = useState("");
  const [role, setRole] = useState("Graphic");
  const [employment, setEmployment] = useState<"fulltime" | "parttime" | "freelance" | "project" | "internship">("fulltime");
  const [locType, setLocType] = useState<"remote" | "hybrid" | "onsite">("hybrid");
  const [desc, setDesc] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [budgetType, setBudgetType] = useState<BudgetType>("monthly");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [deadline, setDeadline] = useState("");
  const [headcount, setHeadcount] = useState("1");
  const [cover, setCover] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(DEFAULT_HIRING_PHONE);
  const [venue, setVenue] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [meeting, setMeeting] = useState("");
  const [socials, setSocials] = useState<JobSocialLink[]>([{ kind: "website", url: "" }]);

  const [duties, setDuties] = useState("");
  const [mustHave, setMustHave] = useState("");
  const [niceHave, setNiceHave] = useState("");
  const [perks, setPerks] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [applyMethods, setApplyMethods] = useState<JobApplyMethod[]>(["portfolio"]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedOrg) return;
    setEmail((prev) => prev.trim() ? prev : selectedOrg.contact_email);
    setPhone((prev) => {
      const trimmed = prev.trim();
      if (trimmed && trimmed !== DEFAULT_HIRING_PHONE.trim()) return prev;
      return selectedOrg.contact_phone || DEFAULT_HIRING_PHONE;
    });
    setSocials((prev) => {
      const filled = prev.some((s) => s.url.trim());
      if (filled || selectedOrg.social_links.length === 0) return prev;
      return selectedOrg.social_links;
    });
    setVenue((prev) => prev.trim() ? prev : selectedOrg.display_name);
    setAddress((prev) => {
      if (prev.trim()) return prev;
      return [selectedOrg.address, selectedOrg.district, selectedOrg.province].filter(Boolean).join(", ");
    });
  }, [selectedOrg]);

  if (isLoading) return <PageLoader />;
  if (gate.kind === "register") return <Navigate to="/org/register" replace />;
  if (gate.kind === "pending") return <Navigate to="/org/status" replace />;
  if (!selectedOrg) return <Navigate to="/org/register" replace />;

  const filledEmail = email.trim() || selectedOrg.contact_email;
  const filledPhone = phone.trim() || selectedOrg.contact_phone;

  const submit = async () => {
    const must = linesOf(mustHave);
    const socialOk = socials.map((s) => ({ ...s, url: normalizeSocialUrl(s.url) || s.url.trim() })).filter((s) => s.url);
    const workplaceVal = composeWorkplace({ venue, address, landmark });
    const meetingVal = meeting.trim() || workplaceVal;
    if (!title.trim()) return fail("กรุณาระบุชื่อตำแหน่ง");
    if (!desc.trim()) return fail("กรุณากรอกรายละเอียดงาน");
    if (!isValidHiringEmail(filledEmail)) return fail("ใส่อีเมลรับสมัครให้ถูกต้อง");
    if (!isValidHiringPhone(filledPhone)) return fail("ใส่เบอร์โทรให้ครบ");
    if (!workplaceVal) return fail("ใส่ชื่อสถานที่ หรือที่อยู่");
    if (locType === "remote" && !meeting.trim()) {
      return fail("งาน WFH ก็ต้องมีที่นัดเจอ เช่น ออฟิศหรือจุดสัมภาษณ์");
    }
    if (!meetingVal) return fail("ใส่จุดนัดเจอ — แม้ WFH ก็ต้องมีที่นัดสัมภาษณ์");
    if (socialOk.length < 1) return fail("ใส่ลิงก์โซเชียลอย่างน้อย 1 ช่อง");
    if (must.length < 3) return fail("คุณสมบัติที่ต้องมีอย่างน้อย 3 ข้อ");
    const min = parseMoneyInput(budgetMin);
    const max = parseMoneyInput(budgetMax);
    if (min != null && max != null && min > max) return fail("เงินเดือนต่ำสุดต้องไม่มากกว่าสูงสุด");
    setSubmitError(null);
    try {
      const created = await createJob.mutateAsync({
        posted_by: user!.id,
        hiring_org_id: selectedOrg.id,
        title: title.trim(),
        role_category: role,
        description: desc.trim(),
        skills,
        deliverables: linesOf(duties),
        perks: linesOf(perks),
        budget_min: min,
        budget_max: max,
        budget_type: budgetType,
        location_type: locType,
        location: workplaceVal,
        workplace_address: workplaceVal,
        meeting_location: meetingVal,
        deadline: deadline || null,
        headcount: headcount ? parseInt(headcount, 10) : 1,
        status: "open",
        post_type: "hiring",
        poster_role: "company",
        employment_type: employment,
        cover_image_url: cover,
        gallery_urls: gallery,
        contact_email: filledEmail,
        contact_phone: filledPhone,
        social_links: socialOk,
        requirements_must: must,
        requirements_nice: linesOf(niceHave),
        exclusions_note: exclusions.trim() || null,
        application_methods: normalizeApplyMethods(applyMethods),
      } as never);
      navigate(`/hiring/${(created as { id: string }).id}`);
    } catch (e: unknown) {
      const msg = mapWriteFlowError(e, "ลงประกาศไม่สำเร็จ");
      fail(msg);
    }
  };

  function fail(msg: string) {
    setSubmitError(msg);
    toast.error(msg);
  }

  return (
    <div className="min-h-screen bg-app-ambient pb-28">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <BackButton to="/hiring" />
        <div>
          <h1 className="text-2xl font-semibold thai-display">ลงประกาศจ้างงาน</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ลงในนาม {selectedOrg.display_name} · นิติบุคคลยืนยันแล้ว
          </p>
        </div>

        {approved.length > 1 ? (
          <div>
            <Label>องค์กร</Label>
            <Select value={selectedOrg.id} onValueChange={setOrgId}>
              <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {approved.map((o) => <SelectItem key={o.id} value={o.id}>{o.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <section className="space-y-3 rounded-2xl border border-border/60 p-4">
          <h2 className="font-semibold">งานนี้คืออะไร</h2>
          {user ? <JobCoverUploadField userId={user.id} value={cover} onChange={setCover} /> : null}
          {user ? <JobGalleryUploadField userId={user.id} value={gallery} onChange={setGallery} /> : null}
          <div>
            <Label htmlFor="job-title">ชื่อตำแหน่ง</Label>
            <Input id="job-title" className="rounded-xl mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>สายงาน</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{JOB_ROLE_CATEGORIES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>รูปแบบงาน</Label>
              <Select value={employment} onValueChange={(v) => setEmployment(v as typeof employment)}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fulltime">Full-time</SelectItem>
                  <SelectItem value="parttime">Contract</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>สถานที่ทำงาน</Label>
            <Select value={locType} onValueChange={(v) => setLocType(v as typeof locType)}>
              <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="remote">WFH 100%</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="onsite">Onsite</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="job-deadline">ปิดรับเมื่อ</Label>
              <Input id="job-deadline" type="date" className="rounded-xl mt-1" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div>
              <Label>จำนวนที่รับ</Label>
              <Input type="number" min={1} className="rounded-xl mt-1" value={headcount} onChange={(e) => setHeadcount(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/60 p-4">
          <h2 className="font-semibold">รายละเอียด</h2>
          <div>
            <Label htmlFor="job-desc">รายละเอียดงาน</Label>
            <Textarea
              id="job-desc"
              rows={3}
              className="rounded-xl mt-1"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="สั้น ๆ ว่างานนี้คืออะไร"
            />
            <p className="text-xs text-muted-foreground mt-1">เกริ่นสั้น ๆ พอ — หน้าที่ไปใส่ช่องด้านล่าง</p>
          </div>
          <div>
            <Label htmlFor="job-duties">หน้าที่หลัก (บรรทัดละ 1)</Label>
            <Textarea
              id="job-duties"
              rows={4}
              className="rounded-xl mt-1"
              value={duties}
              onChange={(e) => setDuties(e.target.value)}
              placeholder={"โมเดล / ปรับโมเดลสินค้า\nจัดแสงแล้วเรนเดอร์ภาพใช้ขาย\nส่งไฟล์ตามสเปกเว็บ"}
            />
          </div>
          <div>
            <Label>สกิล</Label>
            <SkillTagInput value={skills} onChange={setSkills} />
          </div>
          <RateFields
            budgetType={budgetType}
            onBudgetTypeChange={setBudgetType}
            budgetMin={budgetMin}
            budgetMax={budgetMax}
            onBudgetMinChange={setBudgetMin}
            onBudgetMaxChange={setBudgetMax}
            minLabel={applyMethods.includes("per_piece") ? "ต่ำสุดต่อชิ้น (฿)" : "เงินเดือนต่ำสุด (฿)"}
            maxLabel={applyMethods.includes("per_piece") ? "สูงสุดต่อชิ้น (฿)" : "สูงสุด (฿)"}
          />
          <div>
            <Label>วิธีสมัครและคิดราคา</Label>
            <div className="flex flex-wrap gap-3 mt-2">
              {APPLY_OPTIONS.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={applyMethods.includes(m.id)}
                    disabled={m.id === "portfolio"}
                    onCheckedChange={(checked) => {
                      setApplyMethods((prev) => {
                        if (checked === true) return normalizeApplyMethods([...prev, m.id]);
                        return normalizeApplyMethods(prev.filter((id) => id !== m.id));
                      });
                    }}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/60 p-4">
          <h2 className="font-semibold">ติดต่อบริษัท</h2>
          <div>
            <Label htmlFor="job-email">อีเมลรับสมัคร</Label>
            <Input id="job-email" className="rounded-xl mt-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={selectedOrg.contact_email} />
          </div>
          <div>
            <Label htmlFor="job-phone">เบอร์โทร</Label>
            <PhoneCountryField id="job-phone" value={phone} onChange={setPhone} />
          </div>
          <div>
            <Label htmlFor="job-venue">ชื่อสถานที่</Label>
            <Input id="job-venue" className="rounded-xl mt-1" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="สตูดิโอ / ร้าน / ออฟิศ" />
          </div>
          <div>
            <Label htmlFor="job-address">ที่อยู่</Label>
            <Input id="job-address" className="rounded-xl mt-1" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="เลขที่ ถนน เขต จังหวัด" />
          </div>
          <div>
            <Label htmlFor="job-landmark">จุดสังเกต / BTS / MRT</Label>
            <Input id="job-landmark" className="rounded-xl mt-1" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="เช่น MRT หัวลำโพง ทางออก 1" />
          </div>
          <div>
            <Label htmlFor="job-meet">จุดนัดเจอ</Label>
            <Input id="job-meet" className="rounded-xl mt-1" value={meeting} onChange={(e) => setMeeting(e.target.value)} placeholder={locType === "remote" ? "ออฟิศ สำนักงานสาขา หรือจุดสัมภาษณ์" : "ใช้ที่ทำงานนี้ได้"} />
            {locType === "remote" ? (
              <p className="text-xs text-muted-foreground mt-1">งาน WFH ก็ต้องมีที่นัดเจอ เช่น ออฟิศ สำนักงานสาขา หรือจุดสัมภาษณ์</p>
            ) : (
              <button type="button" className="text-xs text-primary mt-1" onClick={() => setMeeting(composeWorkplace({ venue, address, landmark }))}>ใช้ที่ทำงานนี้</button>
            )}
          </div>
          <div className="space-y-2">
            <Label>ลิงก์โซเชียล อย่างน้อย 1 ช่อง</Label>
            {socials.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Select value={s.kind} onValueChange={(kind) => setSocials((prev) => prev.map((row, idx) => idx === i ? { ...row, kind: kind as JobSocialKind } : row))}>
                  <SelectTrigger className="rounded-xl w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">เว็บไซต์</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="line">Line OA</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                  </SelectContent>
                </Select>
                <Input className="rounded-xl" value={s.url} onChange={(e) => setSocials((prev) => prev.map((row, idx) => idx === i ? { ...row, url: e.target.value } : row))} placeholder="https://" />
                {socials.length > 1 ? (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setSocials((prev) => prev.filter((_, idx) => idx !== i))} aria-label="ลบลิงก์">
                    <X className="w-4 h-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setSocials((prev) => [...prev, { kind: "instagram", url: "" }])}>
              <Plus className="w-3 h-3 mr-1" /> เพิ่มลิงก์
            </Button>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/60 p-4">
          <h2 className="font-semibold">คุณสมบัติที่จำเป็น</h2>
          <div>
            <Label htmlFor="job-must">คุณสมบัติที่ต้องมี (อย่างน้อย 3 ข้อ บรรทัดละ 1)</Label>
            <Textarea id="job-must" rows={4} className="rounded-xl mt-1" value={mustHave} onChange={(e) => setMustHave(e.target.value)} placeholder={"ประสบการณ์ 2 ปีขึ้นไป\nใช้ Illustrator ได้\nมีพอร์ตงานที่เกี่ยวข้อง"} />
          </div>
          <div>
            <Label htmlFor="job-nice">จะมีด้วยดี</Label>
            <Textarea id="job-nice" rows={3} className="rounded-xl mt-1" value={niceHave} onChange={(e) => setNiceHave(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="job-perks">สิ่งที่ตำแหน่งนี้ได้</Label>
            <Textarea id="job-perks" rows={3} className="rounded-xl mt-1" value={perks} onChange={(e) => setPerks(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="job-ex">งานนี้ไม่รวม</Label>
            <Textarea id="job-ex" rows={2} className="rounded-xl mt-1" value={exclusions} onChange={(e) => setExclusions(e.target.value)} />
          </div>
        </section>

        {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}

        <div className="sticky bottom-4 z-10">
          <Button className="w-full rounded-full min-h-12" disabled={createJob.isPending} onClick={() => void submit()}>
            ส่งประกาศ
          </Button>
        </div>
      </div>
    </div>
  );
};

const JobNewPage = () => (
  <RequireAuth>
    <JobNewInner />
  </RequireAuth>
);

export default JobNewPage;
