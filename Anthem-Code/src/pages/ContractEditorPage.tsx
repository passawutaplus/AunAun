import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import RequireAuth from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileSignature, Sparkles, ArrowLeft, Save, Loader2, Wand2, Crown, Copy, Download, Scale,
} from "lucide-react";
import { PROJECT_DETAIL_SELECT } from "@/lib/dbSelects";
import {
  isLicenseType,
  licenseToContractNote,
  suggestIpOwner,
  getLicenseMeta,
  type LicenseType,
} from "@/lib/licenses";

type ContractType = "project" | "fulltime";

interface FormState {
  type: ContractType;
  title: string;
  hirer_name: string;
  hirer_id: string;
  hirer_address: string;
  contractor_name: string;
  contractor_id: string;
  contractor_address: string;
  job_title: string;
  scope: string;
  deliverables: string;
  start_date: string;
  end_date: string;
  payment_amount: string;
  payment_terms: string;
  currency: string;
  ip_owner: "hirer" | "contractor" | "shared";
  nda: boolean;
  termination_notice_days: number;
  governing_law: string;
  extra_notes: string;
}

const defaultForm: FormState = {
  type: "project",
  title: "ร่างสัญญาจ้างงาน",
  hirer_name: "",
  hirer_id: "",
  hirer_address: "",
  contractor_name: "",
  contractor_id: "",
  contractor_address: "",
  job_title: "",
  scope: "",
  deliverables: "",
  start_date: "",
  end_date: "",
  payment_amount: "",
  payment_terms: "แบ่งจ่าย 50% เมื่อเริ่มงาน และ 50% เมื่อส่งมอบงานครบ",
  currency: "THB",
  ip_owner: "hirer",
  nda: true,
  termination_notice_days: 30,
  governing_law: "กฎหมายแห่งราชอาณาจักรไทย",
  extra_notes: "",
};

const ContractEditorInner = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(defaultForm);
  const [draft, setDraft] = useState("");
  const [contractId, setContractId] = useState<string | null>(null);
  const [linkedProjectId, setLinkedProjectId] = useState<string | null>(searchParams.get("project"));

  const { data: myProjects = [] } = useQuery({
    queryKey: ["my-projects-contract", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, license_type, license_note, copyright_holder")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: linkedProject } = useQuery({
    queryKey: ["contract-project", linkedProjectId],
    enabled: !!linkedProjectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_DETAIL_SELECT)
        .eq("id", linkedProjectId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const fromUrl = searchParams.get("project");
    if (fromUrl) setLinkedProjectId(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (!linkedProject?.title) return;
    setForm((f) => (f.job_title ? f : { ...f, job_title: linkedProject.title }));
  }, [linkedProject?.id, linkedProject?.title]);

  const applyLicenseFromProject = () => {
    if (!linkedProject) {
      toast.error("เลือกผลงานก่อน");
      return;
    }
    const lt = isLicenseType(linkedProject.license_type ?? "")
      ? (linkedProject.license_type as LicenseType)
      : "all_rights";
    const ipOwner = suggestIpOwner(lt);
    const note = licenseToContractNote(
      lt,
      linkedProject.license_note ?? "",
      linkedProject.copyright_holder ?? "",
    );
    const meta = getLicenseMeta(lt);
    setForm((f) => ({
      ...f,
      ip_owner: ipOwner,
      job_title: f.job_title || linkedProject.title,
      extra_notes: f.extra_notes ? `${f.extra_notes}\n\n${note}` : note,
      scope: f.scope || `งานอ้างอิงผลงาน: ${linkedProject.title} (${meta.shortLabel})`,
    }));
    toast.success("ดึงข้อมูลลิขสิทธิ์จากผลงานแล้ว");
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-contract", {
        body: form,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return (data as { draft: string }).draft;
    },
    onSuccess: (md) => {
      setDraft(md);
      toast.success("ร่างสัญญาเรียบร้อย");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("ต้องเข้าสู่ระบบ");
      if (!draft.trim()) throw new Error("ยังไม่มีร่างสัญญา");
      const row = {
        user_id: user.id,
        type: form.type,
        title: form.title || "ร่างสัญญาจ้างงาน",
        payload: form as any,
        draft_md: draft,
        status: "draft" as const,
      };
      if (contractId) {
        const { error } = await supabase.from("contracts").update(row).eq("id", contractId);
        if (error) throw error;
        return contractId;
      }
      const { data, error } = await supabase
        .from("contracts")
        .insert(row)
        .select("id")
        .single();
      if (error) throw error;
      setContractId(data.id);
      return data.id;
    },
    onSuccess: () => {
      toast.success("บันทึกร่างแล้ว");
      qc.invalidateQueries({ queryKey: ["contracts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyDraft = async () => {
    await navigator.clipboard.writeText(draft);
    toast.success("คัดลอกแล้ว");
  };

  const downloadDraft = () => {
    const blob = new Blob([draft], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.title || "contract"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 backdrop-blur-md bg-background/60 sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-primary shrink-0" />
                <h1 className="font-semibold tracking-tight truncate">ร่างสัญญาจ้างงานด้วย AI</h1>
                <Badge variant="outline" className="gap-1 text-[10px] border-primary/30 text-primary">
                  <Crown className="h-3 w-3" /> PRO
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                กรอกข้อมูล → ให้ AI ช่วยร่าง → ปรับแก้ → บันทึก/ดาวน์โหลด
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link to="/contracts">ร่างของฉัน</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 grid lg:grid-cols-2 gap-6">
        {/* LEFT: FORM */}
        <div className="space-y-5">
          <div>
            <Label className="mb-2 block text-sm font-medium">ประเภทสัญญา</Label>
            <Tabs value={form.type} onValueChange={(v) => set("type", v as ContractType)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="project">จ้างเป็นโปรเจกต์ (Freelance)</TabsTrigger>
                <TabsTrigger value="fulltime">พนักงานประจำ</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div>
            <Label className="text-sm">ชื่อสัญญา</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>

          <Section title="ผู้ว่าจ้าง (Hirer)">
            <Input placeholder="ชื่อ/บริษัท" value={form.hirer_name} onChange={(e) => set("hirer_name", e.target.value)} />
            <Input placeholder="เลขบัตร/ทะเบียนนิติบุคคล" value={form.hirer_id} onChange={(e) => set("hirer_id", e.target.value)} />
            <Textarea placeholder="ที่อยู่" value={form.hirer_address} onChange={(e) => set("hirer_address", e.target.value)} rows={2} />
          </Section>

          <Section title="ผู้รับจ้าง (Contractor / Employee)">
            <Input placeholder="ชื่อ-นามสกุล" value={form.contractor_name} onChange={(e) => set("contractor_name", e.target.value)} />
            <Input placeholder="เลขบัตรประชาชน" value={form.contractor_id} onChange={(e) => set("contractor_id", e.target.value)} />
            <Textarea placeholder="ที่อยู่" value={form.contractor_address} onChange={(e) => set("contractor_address", e.target.value)} rows={2} />
          </Section>

          <Section title="รายละเอียดงาน">
            <Input placeholder={form.type === "fulltime" ? "ตำแหน่งงาน" : "ชื่อโปรเจกต์/งาน"} value={form.job_title} onChange={(e) => set("job_title", e.target.value)} />
            <Textarea placeholder="ขอบเขตงาน / หน้าที่รับผิดชอบ" value={form.scope} onChange={(e) => set("scope", e.target.value)} rows={3} />
            {form.type === "project" && (
              <Textarea placeholder="ส่งมอบงาน (เช่น ไฟล์ AI, PDF, source code...)" value={form.deliverables} onChange={(e) => set("deliverables", e.target.value)} rows={2} />
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">วันเริ่มงาน</Label>
                <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{form.type === "fulltime" ? "วันสิ้นสุด (ถ้ามี)" : "วันส่งมอบ"}</Label>
                <Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
              </div>
            </div>
          </Section>

          <Section title={form.type === "fulltime" ? "เงินเดือนและสวัสดิการ" : "ค่าจ้างและการชำระเงิน"}>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">{form.type === "fulltime" ? "เงินเดือน (ต่อเดือน)" : "ค่าจ้างรวม"}</Label>
                <Input type="number" inputMode="numeric" value={form.payment_amount} onChange={(e) => set("payment_amount", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">สกุล</Label>
                <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="THB">THB</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea placeholder="เงื่อนไขการชำระเงิน / สวัสดิการ" value={form.payment_terms} onChange={(e) => set("payment_terms", e.target.value)} rows={2} />
          </Section>

          <Section title="ทรัพย์สินทางปัญญา (IP)">
            <div>
              <Label className="text-xs text-muted-foreground">อ้างอิงผลงาน (ถ้ามี)</Label>
              <Select
                value={linkedProjectId ?? "_none"}
                onValueChange={(v) => setLinkedProjectId(v === "_none" ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="เลือกผลงานของคุณ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— ไม่ระบุ —</SelectItem>
                  {myProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={applyLicenseFromProject}
              disabled={!linkedProjectId}
            >
              <Scale className="h-4 w-4" />
              ดึงข้อมูลลิขสิทธิ์จากผลงาน
            </Button>
            <div>
              <Label className="text-xs text-muted-foreground">ทรัพย์สินทางปัญญาเป็นของ</Label>
              <Select value={form.ip_owner} onValueChange={(v) => set("ip_owner", v as FormState["ip_owner"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hirer">ผู้ว่าจ้าง</SelectItem>
                  <SelectItem value="contractor">ผู้รับจ้าง</SelectItem>
                  <SelectItem value="shared">ใช้ร่วมกัน</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
              <Label className="text-sm">รวมข้อ NDA (รักษาความลับ)</Label>
              <Switch checked={form.nda} onCheckedChange={(v) => set("nda", v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">แจ้งเลิกสัญญาล่วงหน้า (วัน)</Label>
                <Input type="number" value={form.termination_notice_days} onChange={(e) => set("termination_notice_days", parseInt(e.target.value || "0"))} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">กฎหมายที่ใช้บังคับ</Label>
                <Input value={form.governing_law} onChange={(e) => set("governing_law", e.target.value)} />
              </div>
            </div>
            <Textarea placeholder="หมายเหตุพิเศษ / ข้อตกลงเพิ่มเติม" value={form.extra_notes} onChange={(e) => set("extra_notes", e.target.value)} rows={2} />
          </Section>

          <Button
            className="w-full gap-2 bg-primary hover:bg-primary/90"
            size="lg"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
          >
            {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {draft ? "ร่างใหม่ด้วย AI" : "ให้ AI ร่างสัญญา"}
          </Button>
        </div>

        {/* RIGHT: DRAFT PREVIEW */}
        <div className="lg:sticky lg:top-24 self-start">
          <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">ร่างสัญญา</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={copyDraft} disabled={!draft} title="คัดลอก">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={downloadDraft} disabled={!draft} title="ดาวน์โหลด .md">
                  <Download className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || !draft} className="gap-1.5 ml-1">
                  {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  บันทึก
                </Button>
              </div>
            </div>
            {draft ? (
              <Textarea
                className="min-h-[70vh] border-0 rounded-none focus-visible:ring-0 font-mono text-sm leading-relaxed"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            ) : (
              <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                <FileSignature className="h-10 w-10 mx-auto mb-3 opacity-40" />
                ยังไม่มีร่างสัญญา<br />
                กรอกข้อมูลด้านซ้าย แล้วกด "ให้ AI ร่างสัญญา"
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            ⚠️ เอกสารนี้เป็นเพียงร่างที่สร้างด้วย AI ควรให้ทนายความตรวจสอบก่อนนำไปใช้จริง
          </p>
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2 rounded-lg border border-border/50 p-4 bg-card/30">
    <div className="text-sm font-semibold text-foreground/90">{title}</div>
    <div className="space-y-2">{children}</div>
  </div>
);

export default function ContractEditorPage() {
  return (
    <RequireAuth>
      <ContractEditorInner />
    </RequireAuth>
  );
}
