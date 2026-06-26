import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { useSubscription } from "@/hooks/useSubscription";
import { canCreateJob, countJobsCreatedThisMonth, jobLimitMessage } from "@/lib/planLimits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Copy,
  Loader2,
  Trash2,
  Pencil,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  UserPlus,
  Receipt,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  AlertCircle,
  FileText,
  Lock,
  Unlock,
  Kanban,
} from "lucide-react";
import type { FinanceSub } from "./FinanceTab";
import { toast } from "sonner";
import { formatTHB } from "@/data/mockData";
import { PageFooterActions } from "@/components/dashboard/PageFooterActions";
import { useClients } from "@/store/clients";
import { useQuotations, computeTotals } from "@/store/quotations";
import { ClientFormDialog } from "@/components/dashboard/clients/ClientFormDialog";
import { JOB_STEPS, progressPercentForStep } from "./jobtracker/steps";
import { ImageUploadField } from "./jobtracker/ImageUploadField";
import { uploadJobTrackerImage } from "./jobtracker/uploadImage";
import { StepComments } from "./jobtracker/StepComments";
import { JobLicenseCertificateButton } from "@/components/legal-desk/JobLicenseCertificateButton";
import { PostToAplus1Banner } from "@/components/dashboard/ecosystem/PostToAplus1Banner";

type JobSlip = {
  id: string;
  job_id: string;
  slip_url: string;
  note: string;
  verified: boolean;
  rejected: boolean;
  rejection_reason: string;
  uploaded_at: string;
};

type Job = {
  id: string;
  user_id: string;
  share_token: string;
  tracking_code: string;
  client_id: string | null;
  title: string;
  client_name: string;
  status: string;
  current_step: number;
  progress_percent: number;
  total_amount: number;
  deposit_percent: number;
  amount_due: number;
  deposit_paid: boolean;
  final_paid: boolean;
  payment_info: string;
  final_file_url: string | null;
  preview_image_url: string | null;
  watermark_text: string;
  unlocked: boolean;
  notes: string;
  deadline: string | null;
  start_date: string | null;
  payment_qr_url: string | null;
  created_at: string;
  updated_at: string;
  quotation_id: string | null;
};

type JobEvent = {
  id: string;
  job_id: string;
  kind: string;
  title: string;
  note: string;
  image_url: string | null;
  amount: number | null;
  created_at: string;
};

export function JobTrackerTab({ onSubChange }: { onSubChange?: (sub: FinanceSub) => void } = {}) {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const qc = useQueryClient();
  const userId = user?.id;

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["job_trackers", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async (): Promise<Job[]> => {
      const { data, error } = await supabase
        .from("job_trackers")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Job[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["job_trackers", userId ?? "anon"] });
  const jobsThisMonth = countJobsCreatedThisMonth(jobs);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดงานของคุณ…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!isPro && (
        <p className="text-xs text-muted-foreground rounded-lg border border-border/60 bg-muted/30 px-3 py-2 mx-1">
          แผน Free: สร้างงานได้ {jobsThisMonth}/3 งานในเดือนนี้ ·{" "}
          <a href="/pricing" className="text-primary hover:underline">
            อัพเกรด Pro
          </a>{" "}
          ไม่จำกัด
        </p>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-1">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm sm:text-base">Job Tracker</h3>
          <p className="text-xs text-muted-foreground mt-1">
            ติดตามทุกขั้นตอนของงาน ตั้งแต่รับงานจนส่งมอบ
            ลูกค้าเห็นความคืบหน้าแบบเรียลไทม์ผ่านลิงก์เฉพาะของงานนั้น
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onSubChange && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-xl"
              onClick={() => onSubChange("pipeline")}
            >
              <Kanban className="h-4 w-4 text-[#FF5F05]" /> Pipeline
            </Button>
          )}
          <JobFormDialog
            jobs={jobs}
            onSaved={refresh}
            trigger={
              <Button size="sm" className="gap-1.5 rounded-xl">
                <Plus className="h-4 w-4" /> สร้างงานใหม่
              </Button>
            }
          />
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground border-2 border-dashed rounded-2xl">
          ยังไม่มีงานในระบบ — กด "สร้างงานใหม่" เพื่อเริ่ม
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} allJobs={jobs} onChanged={refresh} />
          ))}
        </div>
      )}

      <PageFooterActions feature="job-tracker" label="Job Tracker" />
    </div>
  );
}

const PUBLIC_TRACK_HOSTS = new Set([
  "solofreelancer.com",
  "www.solofreelancer.com",
  "so1o-freelancer-managment.lovable.app",
]);

function trackUrl(token: string) {
  let base = "https://solofreelancer.com";
  if (typeof window !== "undefined") {
    try {
      const host = window.location.hostname;
      if (PUBLIC_TRACK_HOSTS.has(host)) {
        base = window.location.origin;
      }
    } catch {
      // fall back to default base
    }
  }
  return `${base}/track/${token}`;
}

function JobCard({ job, allJobs, onChanged }: { job: Job; allJobs: Job[]; onChanged: () => void }) {
  const [busy, setBusy] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [advanceOpen, setAdvanceOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(true);
  const qc = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ["job_events", job.id],
    queryFn: async (): Promise<JobEvent[]> => {
      const { data, error } = await supabase
        .from("job_events")
        .select("*")
        .eq("job_id", job.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobEvent[];
    },
  });

  const { data: slips = [] } = useQuery({
    queryKey: ["job_slips", job.id],
    queryFn: async (): Promise<JobSlip[]> => {
      const { data, error } = await supabase
        .from("job_slips")
        .select("*")
        .eq("job_id", job.id)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobSlip[];
    },
    refetchInterval: 20000,
  });
  const pendingSlips = slips.filter((s) => !s.verified && !s.rejected);

  const step = JOB_STEPS[job.current_step] ?? JOB_STEPS[0];
  const isLast = job.current_step >= JOB_STEPS.length - 1;
  const nextStep = JOB_STEPS[job.current_step + 1];

  async function copyLink() {
    await navigator.clipboard.writeText(trackUrl(job.share_token));
    toast.success("คัดลอกลิงก์ติดตามแล้ว");
  }
  async function copyCode() {
    await navigator.clipboard.writeText(job.tracking_code);
    toast.success(`คัดลอก ${job.tracking_code} แล้ว`);
  }
  async function remove() {
    if (!confirm("ลบงานนี้?")) return;
    const { error } = await supabase.from("job_trackers").delete().eq("id", job.id);
    if (error) toast.error(error.message);
    else {
      toast.success("ลบแล้ว");
      onChanged();
    }
  }
  async function toggleUnlock() {
    if (!job.final_file_url) {
      toast.error("ยังไม่มีลิงก์ไฟล์งานจริง — กดปุ่ม 'ถัดไป: ส่งงาน' เพื่อบันทึกลิงก์ก่อน");
      return;
    }
    const next = !job.unlocked;
    if (next && !confirm("ปลดล็อกไฟล์ให้ลูกค้าดาวน์โหลด? ใช้เมื่อรับเงินครบแล้ว")) return;
    setBusy(true);
    const { error } = await supabase
      .from("job_trackers")
      .update({ unlocked: next } as never)
      .eq("id", job.id);
    if (!error) {
      await supabase.from("job_events").insert({
        job_id: job.id,
        kind: next ? "delivered" : "preview_round",
        title: next ? "ปลดล็อกไฟล์ให้ลูกค้าแล้ว ✓" : "ล็อกไฟล์ใหม่ — รอชำระเงิน",
        note: "",
      });
    }
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(next ? "ปลดล็อกแล้ว" : "ล็อกแล้ว");
      onChanged();
    }
  }

  async function verifySlipAndAdvance(slipId: string) {
    setBusy(true);
    const { error: e1 } = await supabase
      .from("job_slips")
      .update({ verified: true })
      .eq("id", slipId);
    if (e1) {
      setBusy(false);
      toast.error(e1.message);
      return;
    }
    const currentKey = JOB_STEPS[job.current_step]?.key;
    if (currentKey === "deposit" || currentKey === "final-pay") {
      const newStep = job.current_step + 1;
      const updates: Record<string, unknown> = {
        current_step: newStep,
        progress_percent: progressPercentForStep(newStep),
      };
      let amount = 0;
      let evtKind = "deposit_paid";
      let evtTitle = "รับมัดจำเรียบร้อย ✓";
      if (currentKey === "deposit") {
        updates.deposit_paid = true;
        amount = (job.total_amount * job.deposit_percent) / 100;
        updates.amount_due = Math.max(0, job.total_amount - amount);
      } else {
        updates.final_paid = true;
        updates.amount_due = 0;
        evtKind = "final_paid";
        evtTitle = "รับยอดสุดท้ายเรียบร้อย ✓";
        amount = job.amount_due;
      }
      await supabase
        .from("job_trackers")
        .update(updates as never)
        .eq("id", job.id);
      await supabase.from("job_events").insert({
        job_id: job.id,
        kind: evtKind,
        title: evtTitle,
        note: "ยืนยันรับเงินจากสลิปแล้ว",
        amount,
      });
    }
    setBusy(false);
    toast.success("ยืนยันรับเงินแล้ว");
    onChanged();
    qc.invalidateQueries({ queryKey: ["job_slips", job.id] });
    qc.invalidateQueries({ queryKey: ["job_events", job.id] });
  }

  const [rejectingId, setRejectingId] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");

  async function rejectSlip(slipId: string, reason: string) {
    if (!reason.trim()) {
      toast.error("กรุณากรอกเหตุผล");
      return;
    }
    const { error } = await supabase
      .from("job_slips")
      .update({ rejected: true, rejection_reason: reason.trim() })
      .eq("id", slipId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("ปฏิเสธสลิปแล้ว — ลูกค้าจะเห็นเหตุผล");
    setRejectingId(null);
    setRejectReason("");
    qc.invalidateQueries({ queryKey: ["job_slips", job.id] });
    qc.invalidateQueries({ queryKey: ["job_events", job.id] });
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="min-w-0 flex-1 text-left group"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "ขยายรายการ" : "หุบรายการ"}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm truncate group-hover:text-primary transition-colors">
                {job.title || "(ไม่มีชื่องาน)"}
              </CardTitle>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  copyCode();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    copyCode();
                  }
                }}
                className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded hover:bg-muted/70 inline-flex items-center gap-1"
              >
                {job.tracking_code} <Copy className="h-2.5 w-2.5" />
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {job.client_name || "—"}
              {job.deadline && (
                <> • ครบกำหนด {new Date(job.deadline).toLocaleDateString("th-TH")}</>
              )}
            </p>
          </button>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className="text-[10px] gap-1">
              <step.icon className="h-3 w-3" /> {step.label}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "ขยายรายการ" : "หุบรายการ"}
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="p-4 pt-0 space-y-3">
          {/* Stepper */}
          <div className="flex items-center justify-between gap-1">
            {JOB_STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < job.current_step;
              const active = i === job.current_step;
              return (
                <React.Fragment key={s.key}>
                  <div
                    className={`flex flex-col items-center gap-0.5 ${active ? "text-primary" : done ? "text-emerald-600" : "text-muted-foreground/75"}`}
                  >
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center border-2 ${
                        active
                          ? "border-primary bg-primary/10"
                          : done
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-muted bg-background"
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Icon className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <span className="text-[8px] sm:text-[9px] text-center leading-tight">
                      {s.label}
                    </span>
                  </div>
                  {i < JOB_STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mb-3 ${i < job.current_step ? "bg-emerald-500" : "bg-muted"}`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <Progress value={job.progress_percent} className="h-1.5" />

          <StepComments
            token={job.share_token}
            stepIndex={job.current_step}
            authorRole="owner"
            showAllSteps
          />

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-muted/40 px-2 py-1.5">
              <div className="text-[10px] text-muted-foreground">ยอดรวม</div>
              <div className="font-semibold">฿{formatTHB(job.total_amount)}</div>
            </div>
            <div className="rounded-lg bg-muted/40 px-2 py-1.5">
              <div className="text-[10px] text-muted-foreground">มัดจำ {job.deposit_percent}%</div>
              <div
                className={`font-semibold ${job.deposit_paid ? "text-emerald-600" : "text-orange-600"}`}
              >
                {job.deposit_paid
                  ? "✓ รับแล้ว"
                  : `฿${formatTHB((job.total_amount * job.deposit_percent) / 100)}`}
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 px-2 py-1.5">
              <div className="text-[10px] text-muted-foreground">คงเหลือ</div>
              <div className={`font-semibold ${job.final_paid ? "text-emerald-600" : ""}`}>
                {job.final_paid ? "✓ ครบ" : `฿${formatTHB(job.amount_due)}`}
              </div>
            </div>
          </div>

          {pendingSlips.length > 0 && (
            <div className="rounded-lg border-2 border-orange-300 bg-orange-50/60 p-2.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-800">
                <AlertCircle className="h-3.5 w-3.5" /> มีสลิปใหม่จากลูกค้า ({pendingSlips.length})
                — ตรวจสอบกับแอปธนาคารก่อนยืนยัน
              </div>
              {pendingSlips.map((s) => (
                <div key={s.id} className="bg-white rounded-lg p-2 space-y-2">
                  <div className="flex gap-2">
                    <a href={s.slip_url} target="_blank" rel="noreferrer" className="shrink-0">
                      <img
                        src={s.slip_url}
                        alt="Payment slip document"
                        className="h-20 w-20 object-cover rounded border"
                      />
                    </a>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(s.uploaded_at).toLocaleString("th-TH")}
                        {s.note && (
                          <p className="text-foreground mt-0.5 whitespace-pre-wrap">"{s.note}"</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          className="h-7 text-[11px] flex-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => verifySlipAndAdvance(s.id)}
                          disabled={busy}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> ยืนยันรับเงิน
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          onClick={() => {
                            setRejectingId(rejectingId === s.id ? null : s.id);
                            setRejectReason("");
                          }}
                        >
                          ปฏิเสธ
                        </Button>
                      </div>
                    </div>
                  </div>
                  {rejectingId === s.id && (
                    <div className="space-y-1.5 pt-2 border-t">
                      <Textarea
                        rows={2}
                        className="text-xs"
                        placeholder="เหตุผล เช่น 'ยอดไม่ตรง' หรือ 'สลิปไม่ชัด'"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-[11px] flex-1"
                          onClick={() => rejectSlip(s.id, rejectReason)}
                        >
                          ส่งเหตุผลปฏิเสธ
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px]"
                          onClick={() => setRejectingId(null)}
                        >
                          ยกเลิก
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {(JOB_STEPS[job.current_step]?.key === "deposit" ||
            JOB_STEPS[job.current_step]?.key === "final-pay") &&
            pendingSlips.length === 0 && (
              <div className="space-y-1.5">
                {slips.some((s) => s.rejected) && (
                  <div className="text-[11px] rounded-md bg-rose-50 border border-rose-200 text-rose-700 px-2 py-1.5">
                    ⚠️ คุณปฏิเสธสลิปไปก่อนหน้านี้ — อัปโหลดสลิปใหม่จากลูกค้าได้ที่นี่
                  </div>
                )}
                <UploadSlipForOwner
                  jobId={job.id}
                  onUploaded={() => qc.invalidateQueries({ queryKey: ["job_slips", job.id] })}
                />
              </div>
            )}

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5 flex-1"
              onClick={copyLink}
            >
              <Copy className="h-3 w-3" /> คัดลอกลิงก์ติดตาม
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2"
              title="เปิดหน้าติดตามงานในแท็บใหม่"
              onClick={() =>
                window.open(trackUrl(job.share_token), "_blank", "noopener,noreferrer")
              }
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <JobFormDialog
              existing={job}
              jobs={allJobs}
              onSaved={onChanged}
              trigger={
                <Button size="sm" variant="outline" className="h-8 px-2">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 text-destructive"
              onClick={remove}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {job.quotation_id && <JobLicenseCertificateButton quotationId={job.quotation_id} />}

          {job.final_file_url && (
            <Button
              size="sm"
              variant={job.unlocked ? "outline" : "default"}
              className="h-9 w-full gap-1.5"
              onClick={toggleUnlock}
              disabled={busy}
            >
              {job.unlocked ? (
                <>
                  <Lock className="h-3.5 w-3.5" /> ล็อกไฟล์อีกครั้ง
                </>
              ) : (
                <>
                  <Unlock className="h-3.5 w-3.5" /> ปลดล็อกไฟล์ให้ลูกค้า
                </>
              )}
            </Button>
          )}
          {(isLast || job.status === "completed") && (
            <PostToAplus1Banner
              jobId={job.id}
              jobTitle={job.title}
              clientName={job.client_name}
              previewImageUrl={job.preview_image_url}
            />
          )}

          <div className="flex gap-1.5">
            {!isLast ? (
              <Button
                size="sm"
                className="h-9 flex-1 gap-1.5"
                onClick={() => setAdvanceOpen(true)}
                disabled={busy}
              >
                ถัดไป: {nextStep.label} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" className="h-9 flex-1" disabled variant="secondary">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> งานเสร็จสมบูรณ์
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-9" onClick={() => setOpen((o) => !o)}>
              Timeline ({events.length}){" "}
              {open ? (
                <ChevronUp className="h-3.5 w-3.5 ml-1" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              )}
            </Button>
          </div>

          {open && (
            <Timeline
              jobId={job.id}
              events={events}
              onChanged={() => qc.invalidateQueries({ queryKey: ["job_events", job.id] })}
            />
          )}

          <AdvanceDialog
            job={job}
            open={advanceOpen}
            onClose={() => setAdvanceOpen(false)}
            onDone={() => {
              onChanged();
              qc.invalidateQueries({ queryKey: ["job_events", job.id] });
            }}
          />
        </CardContent>
      )}
    </Card>
  );
}

function Timeline({
  jobId,
  events,
  onChanged,
}: {
  jobId: string;
  events: JobEvent[];
  onChanged: () => void;
}) {
  const [adding, setAdding] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");

  async function addPreview() {
    if (!imageUrl.trim() && !note.trim()) {
      toast.error("ใส่รายละเอียดก่อน");
      return;
    }
    const { error } = await supabase.from("job_events").insert({
      job_id: jobId,
      kind: "preview_round",
      title: "ส่งตัวอย่างเพิ่มเติม",
      note,
      image_url: imageUrl || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("เพิ่มลง Timeline แล้ว");
    setNote("");
    setImageUrl("");
    setAdding(false);
    onChanged();
  }
  async function deleteEvent(id: string) {
    const { error } = await supabase.from("job_events").delete().eq("id", id);
    if (error) toast.error(error.message);
    else onChanged();
  }

  return (
    <div className="border-t pt-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-muted-foreground">📜 Timeline</p>
        {!adding && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[11px] gap-1"
            onClick={() => setAdding(true)}
          >
            <ImagePlus className="h-3 w-3" /> ส่งตัวอย่างรอบใหม่
          </Button>
        )}
      </div>

      {adding && (
        <div className="space-y-1.5 bg-muted/30 rounded-lg p-2.5">
          <Input
            className="h-8 text-xs"
            placeholder="URL รูปตัวอย่าง (ไม่บังคับ)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <Textarea
            rows={2}
            className="text-xs"
            placeholder="หมายเหตุ เช่น 'แก้รอบ 2 ปรับสีโลโก้แล้ว'"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-1.5">
            <Button size="sm" className="h-7 text-xs flex-1" onClick={addPreview}>
              เพิ่ม
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setAdding(false)}
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">ยังไม่มีกิจกรรม</p>
      ) : (
        <ol className="relative border-l-2 border-muted pl-3 space-y-2">
          {events.map((e) => (
            <li key={e.id} className="text-xs relative">
              <span className="absolute -left-[17px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{e.title}</div>
                  {e.note && (
                    <div className="text-muted-foreground whitespace-pre-wrap text-[11px]">
                      {e.note}
                    </div>
                  )}
                  {e.image_url && (
                    <a
                      href={e.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary text-[11px] underline"
                    >
                      ดูรูป
                    </a>
                  )}
                  {e.amount != null && (
                    <div className="text-emerald-600 text-[11px]">+ ฿{formatTHB(e.amount)}</div>
                  )}
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {new Date(e.created_at).toLocaleString("th-TH")}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => deleteEvent(e.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function AdvanceDialog({
  job,
  open,
  onClose,
  onDone,
}: {
  job: Job;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const next = JOB_STEPS[job.current_step + 1];
  const [note, setNote] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [fileUrl, setFileUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setNote("");
      setImageUrl(null);
      setFileUrl(job.final_file_url ?? "");
    }
  }, [open, job.final_file_url]);

  if (!next) return null;
  const completing = JOB_STEPS[job.current_step];
  const isPayment =
    completing.eventKind === "deposit_paid" || completing.eventKind === "final_paid";
  const isPreview = completing.eventKind === "preview_sent";
  const isDeliver = completing.eventKind === "delivered";

  async function confirm() {
    if (isDeliver && !fileUrl.trim()) {
      toast.error("กรุณาใส่ลิงก์ไฟล์งานจริงก่อนปลดล็อก");
      return;
    }
    setBusy(true);
    const newStep = job.current_step + 1;
    const newProgress = progressPercentForStep(newStep);

    const updates: Record<string, unknown> = {
      current_step: newStep,
      progress_percent: newProgress,
    };
    if (completing.eventKind === "deposit_paid") updates.deposit_paid = true;
    if (completing.eventKind === "final_paid") {
      updates.final_paid = true;
      updates.amount_due = 0;
    }
    if (isPreview) {
      if (imageUrl) updates.preview_image_url = imageUrl;
      // Ensure amount_due is set so the public tracker can show final-pay block immediately
      if (!job.amount_due || job.amount_due <= 0) {
        const dep = (job.total_amount * job.deposit_percent) / 100;
        updates.amount_due = Math.max(0, job.total_amount - dep);
      }
    }
    if (isDeliver) {
      // ไฟล์งานจริงจะถูกบันทึก แต่ "ไม่" ปลดล็อกอัตโนมัติ
      // บอสต้องกดปุ่ม "ปลดล็อกไฟล์ให้ลูกค้า" บนการ์ดเอง (Manual unlock)
      updates.final_file_url = fileUrl.trim();
    }
    if (completing.eventKind === "completed" || newStep === JOB_STEPS.length - 1) {
      updates.status = "completed";
    } else if (completing.eventKind === "deposit_paid" || completing.eventKind === "work_started") {
      updates.status = "in-progress";
    } else if (completing.eventKind === "preview_sent") {
      updates.status = "review";
    } else if (completing.eventKind === "final_paid") {
      updates.status = "in-progress";
    }

    const { error: upErr } = await supabase
      .from("job_trackers")
      .update(updates as never)
      .eq("id", job.id);
    if (upErr) {
      setBusy(false);
      toast.error(upErr.message);
      return;
    }

    let amount: number | null = null;
    if (completing.eventKind === "deposit_paid")
      amount = (job.total_amount * job.deposit_percent) / 100;
    if (completing.eventKind === "final_paid") amount = job.amount_due;

    const { error: evErr } = await supabase.from("job_events").insert({
      job_id: job.id,
      kind: completing.eventKind,
      title: completing.eventTitle,
      note,
      image_url: isPreview ? imageUrl : null,
      amount,
    });
    setBusy(false);
    if (evErr) {
      toast.error(evErr.message);
      return;
    }
    toast.success(`อัปเดตเป็น "${next.label}" แล้ว`);
    onClose();
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ยืนยัน: {completing.eventTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {isPayment && (
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-2.5 text-[11px] text-orange-800 flex gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                โดยปกติให้รอลูกค้าอัปสลิป แล้วกด "ยืนยันรับเงิน" จากการ์ด — ระบบจะเลื่อนสถานะให้เอง
                การกดที่นี่ใช้กรณีรับเงินทางอื่น
              </span>
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            หลังจากกดยืนยัน สถานะจะเลื่อนไปเป็น <b className="text-foreground">{next.label}</b>{" "}
            และบันทึกลง Timeline ให้ลูกค้าเห็น
          </p>
          {isPreview && user && (
            <div>
              <Label className="text-xs">รูปตัวอย่างงาน (ติดลายน้ำให้อัตโนมัติ)</Label>
              <ImageUploadField
                value={imageUrl}
                onChange={setImageUrl}
                folder={`${user.id}/previews`}
                watermark={job.watermark_text || "PREVIEW"}
                hint="ลูกค้าจะเห็นรูปนี้บนหน้าติดตาม พร้อมลายน้ำ"
              />
            </div>
          )}
          {isDeliver && (
            <div>
              <Label className="text-xs">ลิงก์ไฟล์งานจริง (Drive / Dropbox / WeTransfer)</Label>
              <Input
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                บันทึกลิงก์ไว้ก่อน — ลูกค้าจะยังเห็นเป็น 🔒 จนกว่าคุณจะกดปุ่ม "ปลดล็อกไฟล์ให้ลูกค้า"
                บนการ์ด
              </p>
            </div>
          )}
          <div>
            <Label className="text-xs">หมายเหตุ (ไม่บังคับ)</Label>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น 'แก้ไขสีตัวอักษรแล้ว'"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={confirm} disabled={busy}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />} ยืนยัน & ไปขั้นถัดไป
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function JobFormDialog({
  existing,
  onSaved,
  trigger,
  jobs,
}: {
  existing?: Job;
  onSaved: () => void;
  trigger: React.ReactNode;
  jobs: Job[];
}) {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const clients = useClients();
  const quotations = useQuotations();
  const [open, setOpen] = React.useState(false);
  const [clientDialog, setClientDialog] = React.useState<"new" | null>(null);

  function applyQuotation(qid: string) {
    const q = quotations.list.find((x) => x.id === qid);
    if (!q) return;
    const totals = computeTotals(q);
    setForm((f) => ({
      ...f,
      quotation_id: qid,
      title: q.projectName || f.title,
      client_name: q.clientName || f.client_name,
      total_amount: Math.round(totals.grandTotal),
      deposit_percent: q.depositPreset,
      payment_info: q.paymentTerms || f.payment_info,
      start_date: q.startDate || f.start_date,
      deadline: q.endDate || f.deadline,
    }));
    toast.success(`เติมข้อมูลจาก ${q.number} แล้ว`);
  }
  const [form, setForm] = React.useState({
    title: existing?.title ?? "",
    quotation_id: "" as string,
    client_id: existing?.client_id ?? "",
    client_name: existing?.client_name ?? "",
    total_amount: existing?.total_amount ?? 0,
    deposit_percent: existing?.deposit_percent ?? 50,
    payment_info: existing?.payment_info ?? "",
    payment_qr_url: existing?.payment_qr_url ?? "",
    watermark_text: existing?.watermark_text ?? "PREVIEW",
    notes: existing?.notes ?? "",
    deadline: existing?.deadline ?? "",
    start_date: existing?.start_date ?? "",
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open && existing) {
      setForm({
        title: existing.title,
        quotation_id: existing.quotation_id ?? "",
        client_id: existing.client_id ?? "",
        client_name: existing.client_name,
        total_amount: existing.total_amount,
        deposit_percent: existing.deposit_percent,
        payment_info: existing.payment_info,
        payment_qr_url: existing.payment_qr_url ?? "",
        watermark_text: existing.watermark_text,
        notes: existing.notes,
        deadline: existing.deadline ?? "",
        start_date: existing.start_date ?? "",
      });
    }
  }, [open, existing]);

  function pickClient(id: string) {
    if (id === "__new__") {
      setClientDialog("new");
      return;
    }
    const c = clients.list.find((x) => x.id === id);
    setForm((f) => ({ ...f, client_id: id, client_name: c?.name ?? f.client_name }));
  }

  async function save() {
    if (!user) return;
    if (!form.title.trim()) {
      toast.error("ใส่ชื่องานก่อน");
      return;
    }

    if (form.quotation_id) {
      const q = quotations.list.find((x) => x.id === form.quotation_id);
      const needsContract =
        q &&
        (q.status === "pending_payment" ||
          q.status === "pending_receipt" ||
          q.status === "completed");
      if (needsContract && !q.contractAccepted) {
        toast.error("ยืนยันสัญญาจ้างใน Pipeline ก่อนสร้าง Job Tracker จากใบเสนอราคานี้");
        return;
      }
    }

    if (!existing) {
      const used = countJobsCreatedThisMonth(jobs);
      if (!canCreateJob(isPro, used)) {
        toast.error(jobLimitMessage(used), {
          action: {
            label: "ดูแผน Pro",
            onClick: () => {
              window.location.href = "/pricing";
            },
          },
        });
        return;
      }
    }

    setSaving(true);
    const depositAmount = (form.total_amount * form.deposit_percent) / 100;
    const amountDue = existing?.final_paid
      ? 0
      : existing?.deposit_paid
        ? form.total_amount - depositAmount
        : form.total_amount;
    const payload = {
      ...form,
      client_id: form.client_id || null,
      quotation_id: form.quotation_id || null,
      payment_qr_url: form.payment_qr_url || null,
      deadline: form.deadline || null,
      start_date: form.start_date || null,
      amount_due: amountDue,
      user_id: user.id,
    };
    const { error } = existing
      ? await supabase.from("job_trackers").update(payload).eq("id", existing.id)
      : await supabase.from("job_trackers").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(existing ? "บันทึกแล้ว" : "สร้างงานแล้ว — แชร์ลิงก์ติดตามให้ลูกค้าได้เลย");
    setOpen(false);
    onSaved();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{existing ? "แก้ไขงาน" : "สร้างงานใหม่"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">ชื่องาน *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="เช่น ออกแบบโลโก้ร้านกาแฟ"
              />
            </div>

            {!existing && quotations.list.length > 0 && (
              <div>
                <Label className="text-xs flex items-center gap-1">
                  <FileText className="h-3 w-3" /> สร้างจากใบเสนอราคา (ไม่บังคับ)
                </Label>
                <Select value="" onValueChange={applyQuotation}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกใบเสนอราคาเพื่อเติมข้อมูลอัตโนมัติ" />
                  </SelectTrigger>
                  <SelectContent>
                    {quotations.list.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.number} • {q.projectName || "(ไม่มีชื่อโปรเจกต์)"} — ฿
                        {Math.round(computeTotals(q).grandTotal).toLocaleString("th-TH")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  เลือกแล้วระบบจะเติมยอดรวม, % มัดจำ, ลูกค้า, วันที่ และเงื่อนไขการชำระให้
                </p>
              </div>
            )}

            <div>
              <Label className="text-xs flex items-center justify-between">
                <span>ลูกค้า</span>
                <button
                  type="button"
                  onClick={() => setClientDialog("new")}
                  className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline"
                >
                  <UserPlus className="h-3 w-3" /> เพิ่มลูกค้าใหม่
                </button>
              </Label>
              <Select
                value={form.client_id || "__none__"}
                onValueChange={(v) =>
                  v === "__none__" ? setForm({ ...form, client_id: "" }) : pickClient(v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกลูกค้าจากรายชื่อ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— ไม่ผูกลูกค้า —</SelectItem>
                  {clients.list.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="mt-1.5"
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                placeholder="ชื่อที่จะแสดงให้ลูกค้าเห็น (ไม่บังคับถ้าผูกแล้ว)"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">ยอดรวม (บาท)</Label>
                <Input
                  type="number"
                  value={form.total_amount}
                  onChange={(e) => setForm({ ...form, total_amount: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs">มัดจำ (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.deposit_percent}
                  onChange={(e) => setForm({ ...form, deposit_percent: Number(e.target.value) })}
                />
              </div>
            </div>
            {form.total_amount > 0 && (
              <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-2 flex justify-between">
                <span>มัดจำ ฿{formatTHB((form.total_amount * form.deposit_percent) / 100)}</span>
                <span>
                  คงเหลือ ฿{formatTHB((form.total_amount * (100 - form.deposit_percent)) / 100)}
                </span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">วันเริ่มงาน</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">กำหนดส่ง</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">ลายน้ำ</Label>
                <Input
                  value={form.watermark_text}
                  onChange={(e) => setForm({ ...form, watermark_text: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs flex items-center gap-1">
                <Receipt className="h-3 w-3" /> ข้อมูลการชำระเงิน (ข้อความ)
              </Label>
              <Textarea
                rows={2}
                value={form.payment_info}
                onChange={(e) => setForm({ ...form, payment_info: e.target.value })}
                placeholder="ธ.ไทยพาณิชย์ 123-4-56789-0 / นาย ก. หรือ PromptPay 0812345678"
              />
            </div>

            {user && (
              <div>
                <Label className="text-xs">QR PromptPay (ไม่บังคับ)</Label>
                <ImageUploadField
                  value={form.payment_qr_url || null}
                  onChange={(url) => setForm({ ...form, payment_qr_url: url ?? "" })}
                  folder={`${user.id}/qr`}
                  hint="ลูกค้าจะเห็น QR นี้บนหน้าติดตามเมื่อต้องชำระเงิน"
                />
              </div>
            )}
            <div>
              <Label className="text-xs">โน้ตเพิ่มเติม</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {existing ? "บันทึก" : "สร้าง & ออกลิงก์"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ClientFormDialog
        editing={clientDialog}
        onClose={() => setClientDialog(null)}
        onCreate={async (payload) => {
          const c = await clients.add(payload);
          setForm((f) => ({ ...f, client_id: c.id, client_name: c.name }));
          setClientDialog(null);
          toast.success("เพิ่มลูกค้าใหม่แล้ว");
        }}
        onUpdate={() => setClientDialog(null)}
      />
    </>
  );
}

function UploadSlipForOwner({ jobId, onUploaded }: { jobId: string; onUploaded: () => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    try {
      const url = await uploadJobTrackerImage(f, `slips/${jobId}`);
      const { error } = await supabase
        .from("job_slips")
        .insert({ job_id: jobId, slip_url: url, note: "อัปโหลดโดยฟรีแลนซ์" });
      if (error) throw error;
      toast.success("เพิ่มสลิปแล้ว — กดยืนยันรับเงินด้านบนได้เลย");
      onUploaded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-2">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      <Button
        size="sm"
        variant="ghost"
        className="w-full h-8 text-[11px] gap-1.5 text-muted-foreground"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
        อัปโหลดสลิปแทนลูกค้า (กรณีลูกค้าส่งทางอื่น)
      </Button>
    </div>
  );
}
