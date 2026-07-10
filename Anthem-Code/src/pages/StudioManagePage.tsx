import BriefcaseIcon from "../components/icons/BriefcaseIcon";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useActiveStudio, useMyStudios, useStudioMembers, useSetActiveStudio, useTransferStudioOwnership } from "@/hooks/useStudios";
import { useStudioJobs, useCreateJob } from "@/hooks/useJobs";
import RequireAuth from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Building2, Loader2, Plus, Users, MessageCircle, Briefcase } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { useStudioConversation } from "@/hooks/useChat";
import JobCard from "@/components/jobs/JobCard";
import { StudioHireInbox } from "@/components/studio/StudioHireInbox";
import JobCoverUploadField from "@/components/jobs/JobCoverUploadField";
import PageLoader from "@/components/ui/PageLoader";
import JobCardPreview from "@/components/jobs/JobCardPreview";

const StudioManageInner = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: myStudios = [], isLoading } = useMyStudios();
  const { data: activeStudio } = useActiveStudio();
  const setActive = useSetActiveStudio();

  // pick active studio from active_studio_id, or first studio
  const studio = activeStudio ?? myStudios[0];

  useEffect(() => {
    if (myStudios.length > 0 && !activeStudio) {
      setActive.mutate(myStudios[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myStudios.length]);

  const { data: members = [] } = useStudioMembers(studio?.id);
  const { data: jobs = [] } = useStudioJobs(studio?.id);
  const studioChat = useStudioConversation();
  const [jobDialogOpen, setJobDialogOpen] = useState(params.get("new") === "1");

  if (isLoading) return <PageLoader />;

  if (myStudios.length === 0) {
    return (
      <div className="min-h-screen grid place-items-center bg-app-ambient px-4">
        <div className="glass-panel rounded-2xl p-8 max-w-md text-center">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-lg font-medium thai-display mb-2">คุณยังไม่ได้อยู่ในสตูดิโอ</h2>
          <p className="text-sm text-muted-foreground mb-5 thai-body">ก่อตั้งสตูดิโอกับเพื่อนๆ designer เพื่อรับงานในนามทีม</p>
          <Button onClick={() => navigate("/studio/new")} className="rounded-xl bg-gradient-brand text-white border-0">
            <Plus className="w-4 h-4 mr-1.5" /> สร้าง Studio
          </Button>
        </div>
      </div>
    );
  }

  if (!studio) return null;

  return (
    <div className="min-h-screen bg-app-ambient pb-24 lg:pb-12">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <BackButton to="/" label="กลับหน้าแรก" />
          <Avatar className="w-12 h-12 rounded-2xl">
            <AvatarImage src={studio.avatar_url} />
            <AvatarFallback className="bg-gradient-brand text-white rounded-2xl">
              <Building2 />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-medium tracking-tight thai-display truncate">{studio.name}</h1>
            <p className="text-xs text-muted-foreground">หลังบ้าน Studio · {members.length} สมาชิก</p>
          </div>
          {myStudios.length > 1 && (
            <Select value={studio.id} onValueChange={(v) => setActive.mutate(v)}>
              <SelectTrigger className="w-44 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {myStudios.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        <Tabs defaultValue={params.get("tab") ?? "jobs"} className="space-y-4">
          <TabsList className="rounded-xl">
            <TabsTrigger value="jobs" className="rounded-lg"><BriefcaseIcon className="w-3.5 h-3.5 mr-1.5" />ประกาศงาน</TabsTrigger>
            <TabsTrigger value="members" className="rounded-lg"><Users className="w-3.5 h-3.5 mr-1.5" />สมาชิก</TabsTrigger>
            <TabsTrigger value="hires" className="rounded-lg"><Briefcase className="w-3.5 h-3.5 mr-1.5" />คำขอจ้าง</TabsTrigger>
            <TabsTrigger value="chat" className="rounded-lg"><MessageCircle className="w-3.5 h-3.5 mr-1.5" />แชททีม</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg">ตั้งค่า</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{jobs.length} ประกาศ</p>
              <Button onClick={() => setJobDialogOpen(true)} className="rounded-xl bg-gradient-brand text-white border-0">
                <Plus className="w-4 h-4 mr-1.5" /> ลงประกาศใหม่
              </Button>
            </div>
            {jobs.length === 0 ? (
              <div className="text-center py-12 glass-panel rounded-2xl text-sm text-muted-foreground">
                ยังไม่มีประกาศงาน
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {jobs.map((j) => <JobCard key={j.id} job={j} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {members.map((m) => (
              <div key={m.user_id} className="glass-panel rounded-2xl p-4 flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                  <AvatarFallback>{m.profile?.display_name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{m.profile?.display_name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {m.role === "owner" ? "ผู้ก่อตั้ง" : m.role === "admin" ? "แอดมิน" : "สมาชิก"}
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="hires" className="space-y-3">
            <p className="text-sm text-muted-foreground">คำขอจ้าง Studio จากลูกค้า — ตอบรับแล้วเปิดแชทจ้างงาน</p>
            <StudioHireInbox studioId={studio.id} />
          </TabsContent>

          <TabsContent value="chat" className="space-y-4">
            <p className="text-sm text-muted-foreground">ห้องแชทภายในสำหรับสมาชิกสตูดิโอเท่านั้น</p>
            <Button
              className="rounded-xl bg-gradient-brand text-white border-0"
              disabled={studioChat.isPending}
              onClick={async () => {
                const convId = await studioChat.mutateAsync(studio.id);
                navigate(`/chat/${convId}`);
              }}
            >
              <MessageCircle className="w-4 h-4 mr-1.5" />
              {studioChat.isPending ? "กำลังเปิด..." : "เปิดแชททีม"}
            </Button>
          </TabsContent>

          <TabsContent value="settings">
            <StudioSettings studioId={studio.id} />
          </TabsContent>
        </Tabs>
      </div>

      <NewJobDialog
        open={jobDialogOpen}
        onOpenChange={setJobDialogOpen}
        studioId={studio.id}
        studio={{ name: studio.name, avatar_url: studio.avatar_url, verified: studio.verified }}
      />
    </div>
  );
};

const NewJobDialog = ({
  open,
  onOpenChange,
  studioId,
  studio,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  studioId: string;
  studio: { name: string; avatar_url: string; verified: boolean };
}) => {
  const { user } = useAuth();
  const create = useCreateJob();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [budgetType, setBudgetType] = useState<"fixed" | "hourly" | "monthly">("fixed");
  const [locationType, setLocationType] = useState<"remote" | "onsite" | "hybrid">("remote");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setDescription("");
    setSkills("");
    setBudgetMin("");
    setBudgetMax("");
    setCoverImageUrl(null);
  };

  const submit = () => {
    create.mutate(
      {
        studio_id: studioId,
        title: title.trim(),
        description: description.trim(),
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        budget_min: budgetMin ? Number(budgetMin) : null,
        budget_max: budgetMax ? Number(budgetMax) : null,
        budget_type: budgetType,
        location_type: locationType,
        cover_image_url: coverImageUrl,
      } as any,
      {
        onSuccess: () => {
          onOpenChange(false);
          reset();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="thai-display">ลงประกาศหา designer</DialogTitle>
        <DialogDescription className="thai-body">เขียนรายละเอียดให้ชัดเพื่อดึงดูดคนที่ใช่</DialogDescription>
        <div className="space-y-3 mt-2">
          {user && (
            <JobCoverUploadField
              userId={user.id}
              value={coverImageUrl}
              onChange={setCoverImageUrl}
            />
          )}
          <div>
            <Label className="text-xs">ตำแหน่ง *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น Senior UI/UX Designer" className="h-10 rounded-xl mt-1" />
          </div>
          <div>
            <Label className="text-xs">รายละเอียดงาน</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="rounded-xl mt-1" />
          </div>
          <div>
            <Label className="text-xs">ทักษะที่ต้องการ (คั่นด้วย ,)</Label>
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Figma, UI Design, Branding" className="h-10 rounded-xl mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">งบขั้นต่ำ</Label>
              <Input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} className="h-10 rounded-xl mt-1" />
            </div>
            <div>
              <Label className="text-xs">งบสูงสุด</Label>
              <Input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} className="h-10 rounded-xl mt-1" />
            </div>
            <div>
              <Label className="text-xs">ประเภท</Label>
              <Select value={budgetType} onValueChange={(v) => setBudgetType(v as any)}>
                <SelectTrigger className="h-10 rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">เหมา</SelectItem>
                  <SelectItem value="hourly">ต่อชั่วโมง</SelectItem>
                  <SelectItem value="monthly">ต่อเดือน</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">รูปแบบทำงาน</Label>
            <Select value={locationType} onValueChange={(v) => setLocationType(v as any)}>
              <SelectTrigger className="h-10 rounded-xl mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="onsite">Onsite</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <JobCardPreview
            data={{
              title,
              description,
              role_category: "Design",
              skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
              budget_min: budgetMin ? Number(budgetMin) : null,
              budget_max: budgetMax ? Number(budgetMax) : null,
              budget_type: budgetType,
              location_type: locationType,
              location: locationType === "remote" ? "Remote" : "Bangkok",
              employment_type: "project",
              post_type: "hiring",
              cover_image_url: coverImageUrl,
              posterName: studio.name,
              studio: { name: studio.name, avatar_url: studio.avatar_url, verified: studio.verified },
            }}
          />
        </div>
        <div className="flex gap-2 justify-end mt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">ยกเลิก</Button>
          <Button onClick={submit} disabled={!title.trim() || create.isPending} className="rounded-xl bg-gradient-brand text-white border-0">
            {create.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />} ลงประกาศ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const StudioSettings = ({ studioId }: { studioId: string }) => {
  const { data: members = [] } = useStudioMembers(studioId);
  const transfer = useTransferStudioOwnership();
  const [newOwnerId, setNewOwnerId] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const eligible = members.filter((m) => m.role !== "owner");
  const target = members.find((m) => m.user_id === newOwnerId);

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold thai-display">โอนสิทธิ์ผู้ก่อตั้ง</h3>
          <p className="text-xs text-muted-foreground thai-body mt-1">
            มอบสิทธิ์เป็นเจ้าของหลักให้สมาชิกคนอื่น คุณจะกลายเป็นแอดมินแทน
          </p>
        </div>
        {eligible.length === 0 ? (
          <p className="text-xs text-muted-foreground">ยังไม่มีสมาชิกคนอื่นในสตูดิโอ</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={newOwnerId} onValueChange={setNewOwnerId}>
              <SelectTrigger className="h-10 rounded-xl flex-1"><SelectValue placeholder="เลือกสมาชิก" /></SelectTrigger>
              <SelectContent>
                {eligible.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.profile?.display_name ?? m.user_id.slice(0, 6)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!newOwnerId || transfer.isPending}
              onClick={() => setConfirmOpen(true)}
              variant="outline"
              className="rounded-xl"
            >
              โอนสิทธิ์
            </Button>
          </div>
        )}
      </div>

      <div className="glass-panel rounded-2xl p-5 text-sm text-muted-foreground">
        แก้ชื่อ avatar bio และฟีเจอร์ escrow จะเปิดให้ใช้ในเฟสถัดไป
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogTitle className="thai-display">ยืนยันโอนสิทธิ์</DialogTitle>
          <DialogDescription className="thai-body">
            หลังจากนี้ <strong>{target?.profile?.display_name}</strong> จะเป็นผู้ก่อตั้ง คุณจะเปลี่ยนสถานะเป็นแอดมินทันที
          </DialogDescription>
          <div className="flex gap-2 justify-end mt-3">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="rounded-xl">ยกเลิก</Button>
            <Button
              disabled={transfer.isPending}
              onClick={() =>
                transfer.mutate(
                  { studioId, newOwnerId },
                  { onSuccess: () => { setConfirmOpen(false); setNewOwnerId(""); } }
                )
              }
              className="rounded-xl bg-gradient-brand text-white border-0"
            >
              {transfer.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              ยืนยันโอนสิทธิ์
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StudioManagePage = () => (
  <RequireAuth><StudioManageInner /></RequireAuth>
);

export default StudioManagePage;
