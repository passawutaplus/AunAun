import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { RouteError } from "@/components/RouteError";
import { HttpErrorPage } from "@/components/HttpErrorPage";
import * as React from "react";
import { createPortal } from "react-dom";
import { runPrintToPdf } from "@/lib/printPdf";
import { LineHeaderButton } from "@/components/LineContactButton";
import {
  getPublicTrackingJob,
  submitTrackingSlip,
  deleteTrackingSlip,
  replaceTrackingSlip,
} from "@/server/track.functions";
import { acceptQuotationByToken } from "@/server/portalEmail.functions";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogCloseButton,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Lock,
  Unlock,
  Download,
  Upload,
  CheckCircle2,
  Receipt,
  Copy,
  Hash,
  RefreshCw,
  LayoutDashboard,
  Wallet,
  Clock,
  FolderOpen,
  FileText,
  ClipboardList,
  ChevronDown,
  Printer,
  Trash2,
  RotateCw,
  ThumbsUp,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { celebrateFromEdges as celebrate } from "@/lib/celebrate";
import { JOB_STEPS } from "@/components/dashboard/jobtracker/steps";
import { uploadJobTrackerImage } from "@/components/dashboard/jobtracker/uploadImage";
import { StepComments } from "@/components/dashboard/jobtracker/StepComments";
import type { PortalBranding } from "@/lib/documentTheme/types";
import type { ClientPaymentEstimate } from "@/lib/stripeClientPaymentFees";
import {
  ThemedQuotationMiniPreview,
  ThemedQuotationPrintBody,
} from "@/components/dashboard/quotations/QuotationPrintDocument";

export const Route = createFileRoute("/track/$token")({
  head: ({ params }) => {
    const title = "ติดตามสถานะงาน | So1o Freelancer";
    const description =
      "ติดตามสถานะงานออกแบบของคุณแบบเรียลไทม์ ดูความคืบหน้าแต่ละขั้นตอน อัปโหลดสลิป และดาวน์โหลดไฟล์งานเมื่อปลดล็อกผ่าน So1o Freelancer";
    const url = `https://solofreelancer.com/track/${params.token}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex,nofollow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
      ],
    };
  },
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: TrackPage,
});

type Job = {
  id: string;
  share_token: string;
  tracking_code: string;
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
  updated_at: string;
};

type JobEvent = {
  id: string;
  kind: string;
  title: string;
  note: string;
  image_url: string | null;
  amount: number | null;
  created_at: string;
};

type Slip = {
  id: string;
  slip_url: string;
  note: string;
  verified: boolean;
  rejected: boolean;
  rejection_reason: string;
  uploaded_at: string;
};

type PublicQuotation = {
  id: string;
  number: string;
  project_name: string;
  start_date: string | null;
  end_date: string | null;
  items: Array<{ name: string; unit: string; quantity: number; unitPrice: number }>;
  milestones: Array<{ id?: string; label: string; date: string | null; percent: number }>;
  payment_terms: string;
  notes: string;
  status: string;
  deposit_percent: number;
  vat_enabled?: boolean;
  vat_rate?: number;
  wht_enabled?: boolean;
  wht_rate?: number;
  totals: {
    itemsSubtotal?: number;
    addonAmount?: number;
    diffAmount?: number;
    discountAmount?: number;
    preTax: number;
    vatAmount: number;
    whtAmount: number;
    grandTotal: number;
    depositAmount: number;
  };
};

type PublicBrief = {
  id: string;
  title: string;
  project_overview: Record<string, unknown>;
  audience: Record<string, unknown>;
  design_direction: Record<string, unknown>;
  tech_specs: Record<string, unknown>;
  timeline_budget: Record<string, unknown>;
  notes: string;
};

type PublicTrackingPayload = {
  job: Job | null;
  events: JobEvent[];
  slips: Slip[];
  quotation: PublicQuotation | null;
  brief: PublicBrief | null;
  portal: PortalBranding | null;
  payments?: {
    stripeEnabled: boolean;
    deposit?: ClientPaymentEstimate;
    final?: ClientPaymentEstimate;
  };
};

function TrackPage() {
  const { token } = Route.useParams();
  const [job, setJob] = React.useState<Job | null>(null);
  const [events, setEvents] = React.useState<JobEvent[]>([]);
  const [slips, setSlips] = React.useState<Slip[]>([]);
  const [quotation, setQuotation] = React.useState<PublicQuotation | null>(null);
  const [brief, setBrief] = React.useState<PublicBrief | null>(null);
  const [portal, setPortal] = React.useState<PortalBranding | null>(null);
  const [payments, setPayments] = React.useState<{
    stripeEnabled: boolean;
    deposit?: ClientPaymentEstimate;
    final?: ClientPaymentEstimate;
  }>({ stripeEnabled: false });
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const prevUnlocked = React.useRef(false);

  const load = React.useCallback(async () => {
    try {
      const res = (await getPublicTrackingJob({ data: { token } })) as PublicTrackingPayload;
      const j = res.job;
      if (!j) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const jt = j;
      if (jt.unlocked && !prevUnlocked.current && job) celebrate();
      prevUnlocked.current = jt.unlocked;
      setJob(jt);
      setEvents(res.events ?? []);
      setSlips(res.slips ?? []);
      setQuotation(res.quotation ?? null);
      setBrief(res.brief ?? null);
      setPortal(res.portal ?? null);
      setPayments(res.payments ?? { stripeEnabled: false });
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [token, job]);

  React.useEffect(() => { load(); }, [token]); // eslint-disable-line

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripe = params.get("stripe");
    if (stripe === "deposit") {
      toast.success("ชำระมัดจำสำเร็จ — กำลังอัปเดตสถานะงาน");
      celebrate();
      window.history.replaceState({}, "", `/track/${token}`);
      load();
    } else if (stripe === "final") {
      toast.success("ชำระยอดสุดท้ายสำเร็จ — ไฟล์งานจะปลดล็อกเมื่อฟรีแลนซ์ยืนยัน");
      celebrate();
      window.history.replaceState({}, "", `/track/${token}`);
      load();
    }
  }, [token]); // eslint-disable-line

  // Realtime subscription replaces polling.
  // for anonymous viewers, so we keep a slow 60s safety poll as fallback.
  React.useEffect(() => {
    if (!job?.id) return;
    const channel = supabase
      .channel(`track-${job.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_trackers", filter: `id=eq.${job.id}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_events", filter: `job_id=eq.${job.id}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_slips", filter: `job_id=eq.${job.id}` },
        () => load(),
      )
      .subscribe();
    const fallback = setInterval(load, 60000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(fallback);
    };
  }, [job?.id, load]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (notFound || !job) {
    return <HttpErrorPage kind="token" code={404} showRetry={false} />;
  }

  const stepIdx = job.current_step;
  const depositAmount = (job.total_amount * job.deposit_percent) / 100;
  // Fallback: if amount_due wasn't set (legacy data), compute from total - deposit
  const remainingDue =
    job.amount_due > 0 ? job.amount_due : Math.max(0, job.total_amount - depositAmount);

  // Show deposit block before preview; show final-pay block after preview.
  const showDepositBlock = !job.deposit_paid && depositAmount > 0;
  // Final-pay block: as soon as deposit is paid and final is unpaid — don't strictly require step === final-pay
  // (covers legacy jobs where step might still be "preview" but freelancer has sent a preview image).
  const showFinalPayBlock = job.deposit_paid && !job.final_paid && remainingDue > 0;

  // Lock button label
  const lockLabel = !job.final_paid
    ? "🔒 รอชำระยอดสุดท้ายก่อนปลดล็อก"
    : !job.final_file_url
      ? "🔒 รอฟรีแลนซ์อัปโหลดไฟล์งานจริง"
      : "🔒 รอปลดล็อกไฟล์";

  const portalPrimary = portal?.theme.colors.portalPrimary ?? undefined;

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-orange-50/40 via-background to-background"
      style={
        portalPrimary
          ? ({
              background: `linear-gradient(to bottom, color-mix(in srgb, ${portalPrimary} 12%, transparent), var(--background))`,
            } as React.CSSProperties)
          : undefined
      }
    >
      <div className="absolute top-3 right-3 z-20">
        <LineHeaderButton />
      </div>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8 space-y-4">
        {/* Header */}
        <div className="text-center">
          {!portal?.showPoweredBy && portal?.showLogo !== false && portal?.logoUrl && (
            <img
              src={portal.logoUrl}
              alt=""
              className="h-10 mx-auto mb-2 object-contain"
              loading="lazy"
              decoding="async"
            />
          )}
          <p className="text-[10px] font-semibold text-primary tracking-[0.2em]">
            {!portal?.showPoweredBy && portal?.brandName
              ? portal.brandName.toUpperCase()
              : "CLIENT PORTAL"}
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold mt-1 text-foreground">
            {job.title || "งานของคุณ"}
          </h1>
          {portal?.welcomeMessage && !portal.showPoweredBy && (
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              {portal.welcomeMessage}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {job.client_name && <>สำหรับ {job.client_name} • </>}
            <span className="font-mono">#{job.tracking_code}</span>
          </p>
          <p className="text-[10px] text-muted-foreground/80 mt-0.5">
            อัปเดตล่าสุด {new Date(job.updated_at).toLocaleString("th-TH")}
          </p>
          <Button size="sm" variant="outline" className="mt-2 h-7 text-xs gap-1" onClick={load}>
            <RefreshCw className="h-3 w-3" /> รีเฟรช
          </Button>
        </div>

        {/* Quick status banner — visible across all tabs */}
        <Card className="border-primary/30 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                {JOB_STEPS[stepIdx]?.label}
              </Badge>
              <span className="font-semibold text-foreground">{job.progress_percent}%</span>
            </div>
            <Progress value={job.progress_percent} className="h-2" />
            {job.deadline && (
              <p className="text-[11px] text-muted-foreground mt-2">
                📅 กำหนดส่ง {new Date(job.deadline).toLocaleDateString("th-TH")}
              </p>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid grid-cols-5 w-full bg-orange-50 border border-orange-100 h-auto p-1 rounded-2xl">
            <TabsTrigger
              value="summary"
              className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex flex-col gap-0.5 py-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="text-[10px] font-medium">สรุป</span>
            </TabsTrigger>
            <TabsTrigger
              value="brief"
              className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex flex-col gap-0.5 py-2"
            >
              <ClipboardList className="h-4 w-4" />
              <span className="text-[10px] font-medium">บรีฟ</span>
            </TabsTrigger>
            <TabsTrigger
              value="finance"
              className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex flex-col gap-0.5 py-2"
            >
              <Wallet className="h-4 w-4" />
              <span className="text-[10px] font-medium">การเงิน</span>
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex flex-col gap-0.5 py-2"
            >
              <Clock className="h-4 w-4" />
              <span className="text-[10px] font-medium">ไทม์ไลน์</span>
            </TabsTrigger>
            <TabsTrigger
              value="files"
              className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex flex-col gap-0.5 py-2"
            >
              <FolderOpen className="h-4 w-4" />
              <span className="text-[10px] font-medium">ไฟล์</span>
            </TabsTrigger>
          </TabsList>

          {/* ========== SUMMARY ========== */}
          <TabsContent value="summary" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-4 sm:p-5">
                <h3 className="text-sm font-semibold mb-3">ความคืบหน้า</h3>
                <div className="flex items-start justify-between gap-1">
                  {JOB_STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const done = i < stepIdx;
                    const active = i === stepIdx;
                    return (
                      <React.Fragment key={s.key}>
                        <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                          <div
                            className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center border-2 ${
                              active
                                ? "border-primary bg-primary/10 text-primary animate-pulse"
                                : done
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                                  : "border-muted text-muted-foreground/80"
                            }`}
                          >
                            {done ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Icon className="h-4 w-4" />
                            )}
                          </div>
                          <span
                            className={`text-[8px] sm:text-[10px] text-center leading-tight ${
                              active
                                ? "text-primary font-medium"
                                : done
                                  ? "text-emerald-600"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {s.label}
                          </span>
                        </div>
                        {i < JOB_STEPS.length - 1 && (
                          <div
                            className={`flex-1 h-0.5 mt-4 sm:mt-5 ${i < stepIdx ? "bg-emerald-500" : "bg-muted"}`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <StepComments token={token} stepIndex={stepIdx} authorRole="client" showAllSteps />

            {/* Finance quick summary + slip upload — so client can pay right after chatting */}
            <Card className="bg-white">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-primary" /> สรุปการเงิน
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-muted-foreground">ยอดรวม</p>
                    <p className="text-lg font-bold text-foreground">
                      ฿{job.total_amount.toLocaleString("th-TH")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3">
                    <p className="text-emerald-700/80">มัดจำ ({job.deposit_percent}%)</p>
                    <p className="text-lg font-bold text-emerald-700">
                      ฿{depositAmount.toLocaleString("th-TH")}
                      {job.deposit_paid && <span className="text-[10px] ml-1">✓</span>}
                    </p>
                  </div>
                  <div
                    className={`rounded-xl p-3 col-span-2 ${job.final_paid ? "bg-emerald-50" : "bg-orange-50"}`}
                  >
                    <p className={job.final_paid ? "text-emerald-700/80" : "text-orange-700/80"}>
                      คงเหลือ
                    </p>
                    <p
                      className={`text-2xl font-bold ${job.final_paid ? "text-emerald-700" : "text-orange-700"}`}
                    >
                      ฿{(job.final_paid ? 0 : remainingDue).toLocaleString("th-TH")}
                      {job.final_paid && <span className="text-xs ml-2">✓ ชำระครบแล้ว</span>}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {showDepositBlock && (
              <PaymentBlock
                kind="deposit"
                amount={depositAmount}
                job={job}
                token={token}
                slips={slips}
                onUploaded={load}
                stripeEnabled={payments.stripeEnabled}
                stripeEstimate={payments.deposit}
              />
            )}
            {showFinalPayBlock && (
              <PaymentBlock
                kind="final"
                amount={remainingDue}
                job={job}
                token={token}
                slips={slips}
                onUploaded={load}
                stripeEnabled={payments.stripeEnabled}
                stripeEstimate={payments.final}
              />
            )}

            {job.notes && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-1.5">หมายเหตุจากฟรีแลนซ์</h3>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{job.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ========== BRIEF ========== */}
          <TabsContent value="brief" className="space-y-4 mt-4">
            {brief ? (
              <BriefCard b={brief} defaultExpanded />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/60 mb-2" />
                  <p className="text-sm text-muted-foreground">ยังไม่มีใบบรีฟสำหรับงานนี้</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ========== FINANCE ========== */}
          <TabsContent value="finance" className="space-y-4 mt-4">
            <Card className="bg-white">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-primary" /> สรุปการเงิน
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-muted-foreground">ยอดรวม</p>
                    <p className="text-lg font-bold text-foreground">
                      ฿{job.total_amount.toLocaleString("th-TH")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3">
                    <p className="text-emerald-700/80">มัดจำ ({job.deposit_percent}%)</p>
                    <p className="text-lg font-bold text-emerald-700">
                      ฿{depositAmount.toLocaleString("th-TH")}
                      {job.deposit_paid && <span className="text-[10px] ml-1">✓</span>}
                    </p>
                  </div>
                  <div
                    className={`rounded-xl p-3 col-span-2 ${job.final_paid ? "bg-emerald-50" : "bg-orange-50"}`}
                  >
                    <p className={job.final_paid ? "text-emerald-700/80" : "text-orange-700/80"}>
                      คงเหลือ
                    </p>
                    <p
                      className={`text-2xl font-bold ${job.final_paid ? "text-emerald-700" : "text-orange-700"}`}
                    >
                      ฿{(job.final_paid ? 0 : remainingDue).toLocaleString("th-TH")}
                      {job.final_paid && <span className="text-xs ml-2">✓ ชำระครบแล้ว</span>}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {showDepositBlock && (
              <PaymentBlock
                kind="deposit"
                amount={depositAmount}
                job={job}
                token={token}
                slips={slips}
                onUploaded={load}
                stripeEnabled={payments.stripeEnabled}
                stripeEstimate={payments.deposit}
              />
            )}
            {showFinalPayBlock && (
              <PaymentBlock
                kind="final"
                amount={remainingDue}
                job={job}
                token={token}
                slips={slips}
                onUploaded={load}
                stripeEnabled={payments.stripeEnabled}
                stripeEstimate={payments.final}
              />
            )}

            {/* fallback: show all slips if neither payment block is shown but slips exist */}
            {!showDepositBlock && !showFinalPayBlock && slips.length > 0 && (
              <SlipsGallery slips={slips} token={token} onChanged={load} />
            )}

            {quotation && (
              <QuotationCard
                q={quotation}
                job={job}
                token={token}
                portal={portal}
                onAccepted={load}
              />
            )}
          </TabsContent>

          {/* ========== TIMELINE ========== */}
          <TabsContent value="timeline" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" /> ประวัติการดำเนินงาน
                </h3>
                {events.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">ยังไม่มีกิจกรรม</p>
                ) : (
                  <ol className="relative border-l-2 border-orange-100 pl-4 space-y-4">
                    {events.map((e, i) => {
                      const dotColor =
                        e.kind === "slip_rejected"
                          ? "bg-rose-500"
                          : e.kind === "slip_verified" ||
                              e.kind === "deposit_paid" ||
                              e.kind === "final_paid"
                            ? "bg-emerald-500"
                            : e.kind === "slip_uploaded"
                              ? "bg-amber-400"
                              : i === 0
                                ? "bg-primary"
                                : "bg-muted-foreground/40";
                      return (
                        <li key={e.id} className="relative">
                          <span
                            className={`absolute -left-[22px] top-1 h-3 w-3 rounded-full ring-2 ring-background ${dotColor}`}
                          />
                          <div className="text-xs space-y-1.5">
                            <div className="flex items-baseline justify-between gap-2 flex-wrap">
                              <span className="font-semibold">{e.title}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(e.created_at).toLocaleString("th-TH", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </span>
                            </div>
                            {e.note && (
                              <p
                                className={`whitespace-pre-wrap ${e.kind === "slip_rejected" ? "text-rose-700 bg-rose-50 border border-rose-200 rounded p-1.5" : "text-muted-foreground"}`}
                              >
                                {e.kind === "slip_rejected" && (
                                  <span className="font-semibold">เหตุผล: </span>
                                )}
                                {e.note}
                              </p>
                            )}
                            {e.image_url && (
                              <a
                                href={e.image_url}
                                target="_blank"
                                rel="noreferrer"
                                className="block"
                              >
                                <img
                                  src={e.image_url}
                                  alt=""
                                  className="rounded border max-h-40 object-contain"
                                />
                              </a>
                            )}
                            {e.amount != null && e.amount > 0 && (
                              <p className="text-emerald-600 font-medium">
                                + ฿{e.amount.toLocaleString("th-TH")}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== FILES ========== */}
          <TabsContent value="files" className="space-y-4 mt-4">
            {job.preview_image_url && (
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                    👁️ พรีวิว (มีลายน้ำ)
                  </p>
                  <div className="relative rounded-xl overflow-hidden bg-muted">
                    <img
                      src={job.preview_image_url}
                      alt={`พรีวิว ${job.title}`}
                      className="w-full h-auto select-none pointer-events-none"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span
                        className="text-white/80 font-bold text-3xl sm:text-5xl rotate-[-20deg] tracking-widest drop-shadow-lg"
                        style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
                      >
                        {job.watermark_text || "PREVIEW"}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center mt-2">
                    * รูปตัวอย่าง — ไฟล์จริงจะปลดล็อกหลังฟรีแลนซ์กดอนุมัติ
                  </p>
                </CardContent>
              </Card>
            )}

            <Card
              className={
                job.unlocked && job.final_file_url
                  ? "border-emerald-300 bg-emerald-50/50"
                  : "border-muted"
              }
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {job.unlocked && job.final_file_url ? (
                    <Unlock className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <h3 className="text-sm font-semibold">ไฟล์งานจริง</h3>
                </div>
                {job.unlocked && job.final_file_url ? (
                  <Button asChild className="w-full gap-2 h-12">
                    <a href={job.final_file_url} target="_blank" rel="noreferrer">
                      <Download className="h-4 w-4" /> ดาวน์โหลดไฟล์งานจริง
                    </a>
                  </Button>
                ) : (
                  <>
                    <Button disabled className="w-full gap-2 h-12">
                      <Lock className="h-4 w-4" /> {lockLabel}
                    </Button>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      ฟรีแลนซ์จะกดปลดล็อกให้หลังตรวจสอบการชำระเงินครบถ้วน
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {portal?.showPoweredBy !== false && (
          <p className="text-center text-[10px] text-muted-foreground pt-4">
            Powered by{" "}
            <a href="/" className="font-semibold text-primary">
              So1o Freelancer
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

function PaymentBlock({
  kind,
  amount,
  job,
  token,
  slips,
  onUploaded,
  stripeEnabled,
  stripeEstimate,
}: {
  kind: "deposit" | "final";
  amount: number;
  job: Job;
  token: string;
  slips: Slip[];
  onUploaded: () => void;
  stripeEnabled?: boolean;
  stripeEstimate?: ClientPaymentEstimate;
}) {
  const isFinal = kind === "final";
  return (
    <Card
      id={isFinal ? undefined : "deposit"}
      className={
        isFinal
          ? "border-orange-400 bg-orange-50/70 ring-2 ring-orange-200"
          : "border-orange-300 bg-orange-50/50"
      }
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-orange-600" />
          <h3 className="font-semibold text-sm">
            {isFinal ? "💰 ชำระยอดสุดท้ายเพื่อปลดล็อกไฟล์งานจริง" : "ยอดมัดจำที่ต้องโอน"}
          </h3>
        </div>
        <div>
          <p className="text-3xl font-bold text-orange-700">฿{amount.toLocaleString("th-TH")}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            ยอดรวมงานนี้ ฿{job.total_amount.toLocaleString("th-TH")} (มัดจำ {job.deposit_percent}%)
          </p>
          {isFinal && (
            <p className="text-[11px] text-orange-700 mt-1.5 leading-snug">
              📥 อัปโหลดสลิปแล้วรอฟรีแลนซ์กดยืนยัน —
              ระบบจะปลดล็อกไฟล์งานจริงให้ดาวน์โหลดทันทีหลังยืนยัน
            </p>
          )}
        </div>
        {job.payment_info && (
          <div className="rounded-lg bg-white p-3 text-xs whitespace-pre-wrap relative">
            {job.payment_info}
            <button
              onClick={() => {
                navigator.clipboard.writeText(job.payment_info);
                toast.success("คัดลอกแล้ว");
              }}
              className="absolute top-2 right-2 p-1 hover:bg-muted rounded"
              aria-label="คัดลอกข้อมูลการชำระ"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        )}
        {job.payment_qr_url && (
          <div className="rounded-lg bg-white p-3 flex flex-col items-center gap-1">
            <p className="text-[11px] font-medium text-muted-foreground">📱 สแกน QR PromptPay</p>
            <img
              src={job.payment_qr_url}
              alt="PromptPay QR"
              className="max-w-[220px] w-full h-auto rounded"
            />
          </div>
        )}

        {/* Slips already submitted by this customer */}
        {slips.length > 0 && (
          <SlipsGallery slips={slips} token={token} onChanged={onUploaded} compact />
        )}

        {/* Always allow uploading additional slip (handles partial payments / re-submission) */}
        <SlipUploader
          jobId={job.id}
          token={token}
          onUploaded={onUploaded}
          hasExisting={slips.length > 0}
        />

        {stripeEnabled && stripeEstimate && (
          <>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-dashed" />
              </div>
              <p className="relative flex justify-center text-[10px] uppercase tracking-wide text-muted-foreground bg-orange-50/50 px-2">
                หรือชำระออนไลน์
              </p>
            </div>
            <div className="rounded-xl bg-white border border-primary/20 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CreditCard className="h-4 w-4 text-primary" />
                ชำระด้วยบัตร / ออนไลน์
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                ค่างาน ฿{stripeEstimate.jobAmount.toLocaleString("th-TH")} + ค่าธรรมเนียม ฿
                {stripeEstimate.feeAmount.toLocaleString("th-TH")} = รวม{" "}
                <span className="font-semibold text-foreground">
                  ฿{stripeEstimate.totalAmount.toLocaleString("th-TH")}
                </span>
              </p>
              <Button
                asChild
                className="w-full gap-1.5 bg-gradient-primary text-primary-foreground"
              >
                <Link to="/track/$token/checkout" params={{ token }} search={{ payment: kind }}>
                  ดูรายละเอียดและชำระ
                </Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SlipUploader({
  jobId,
  token,
  onUploaded,
  hasExisting,
}: {
  jobId: string;
  token: string;
  onUploaded: () => void;
  hasExisting: boolean;
}) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("กรุณาเลือกรูปภาพ");
      return;
    }
    setBusy(true);
    try {
      const url = await uploadJobTrackerImage(f, `slips/${jobId}/${token}`);
      setPreviewUrl(url);
      toast.success("อัปโหลดรูปแล้ว — กดส่งเพื่อยืนยัน");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!previewUrl) {
      toast.error("เลือกรูปสลิปก่อน");
      return;
    }
    setBusy(true);
    try {
      await submitTrackingSlip({ data: { token, slip_url: previewUrl, note } });
      toast.success("ส่งสลิปแล้ว — รอฟรีแลนซ์ตรวจสอบ");
      setPreviewUrl(null);
      setNote("");
      onUploaded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ส่งสลิปไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 bg-white rounded-lg p-3">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      {previewUrl ? (
        <div className="relative">
          <img
            src={previewUrl}
            alt="พรีวิวสลิปโอนเงินก่อนอัปโหลด"
            className="w-full max-h-60 object-contain rounded border"
          />
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-1 right-1 bg-background rounded-full p-1 text-xs"
            aria-label="ลบรูปที่เลือก"
          >
            ✕
          </button>
        </div>
      ) : (
        <Button
          onClick={() => inputRef.current?.click()}
          className="w-full gap-2"
          variant="default"
          disabled={busy}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {hasExisting ? "➕ เพิ่มสลิป (โอนเพิ่ม / โอนไม่ครบ)" : "เลือกรูปสลิปจากเครื่อง"}
        </Button>
      )}
      <Textarea
        rows={2}
        placeholder="โน้ตเพิ่มเติม (ไม่บังคับ)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button className="w-full" onClick={submit} disabled={busy || !previewUrl}>
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />} ส่งสลิปให้ฟรีแลนซ์ตรวจสอบ
      </Button>
    </div>
  );
}

function SlipsGallery({
  slips,
  token,
  onChanged,
  compact,
}: {
  slips: Slip[];
  token: string;
  onChanged: () => void;
  compact?: boolean;
}) {
  const replaceInputRef = React.useRef<HTMLInputElement>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [replacingId, setReplacingId] = React.useState<string | null>(null);

  async function handleDelete(slipId: string) {
    if (!confirm("ลบสลิปนี้? (ใช้ได้เฉพาะสลิปที่ยังไม่ถูกตรวจสอบ)")) return;
    setBusyId(slipId);
    try {
      await deleteTrackingSlip({ data: { token, slip_id: slipId } });
      toast.success("ลบสลิปแล้ว");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  function triggerReplace(slipId: string) {
    setReplacingId(slipId);
    replaceInputRef.current?.click();
  }

  async function handleReplaceFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    const slipId = replacingId;
    setReplacingId(null);
    if (!f || !slipId) return;
    if (!f.type.startsWith("image/")) {
      toast.error("กรุณาเลือกรูปภาพ");
      return;
    }
    setBusyId(slipId);
    try {
      // Upload the new image first
      const newUrl = await uploadJobTrackerImage(f, `slips/replace/${token}`);
      await replaceTrackingSlip({ data: { token, slip_id: slipId, slip_url: newUrl } });
      toast.success("เปลี่ยนรูปสลิปแล้ว");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เปลี่ยนรูปไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={compact ? "space-y-1.5" : "rounded-lg bg-white p-3 space-y-2"}>
      <p className="text-[11px] font-semibold flex items-center gap-1.5 text-muted-foreground">
        📎 สลิปที่คุณส่งแล้ว ({slips.length})
      </p>
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleReplaceFile}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {slips.map((s) => {
          const state = s.verified ? "verified" : s.rejected ? "rejected" : "pending";
          const styles = {
            verified: {
              border: "border-emerald-400",
              bg: "bg-emerald-500 text-white",
              label: "✓ ยืนยันแล้ว",
            },
            rejected: {
              border: "border-rose-400",
              bg: "bg-rose-500 text-white",
              label: "✗ ปฏิเสธ",
            },
            pending: {
              border: "border-amber-300",
              bg: "bg-amber-400 text-amber-900",
              label: "⏳ รอตรวจสอบ",
            },
          }[state];
          const canEdit = state === "pending";
          const isBusy = busyId === s.id;
          return (
            <div key={s.id} className="space-y-1">
              <a
                href={s.slip_url}
                target="_blank"
                rel="noreferrer"
                className={`relative block rounded-lg overflow-hidden border-2 ${styles.border}`}
              >
                <img
                  src={s.slip_url}
                  alt={`สลิป ${styles.label}`}
                  className="w-full h-28 object-cover"
                />
                <div
                  className={`absolute bottom-0 inset-x-0 text-center text-[10px] py-0.5 font-semibold ${styles.bg}`}
                >
                  {styles.label}
                </div>
              </a>
              {canEdit && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 flex-1 text-[10px] gap-1 px-1.5"
                    onClick={() => triggerReplace(s.id)}
                    disabled={isBusy}
                  >
                    {isBusy ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCw className="h-3 w-3" />
                    )}
                    เปลี่ยน
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[10px] gap-1 text-rose-600 border-rose-200 hover:bg-rose-50"
                    onClick={() => handleDelete(s.id)}
                    disabled={isBusy}
                    aria-label="ลบสลิป"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {s.rejected && s.rejection_reason && (
                <p className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 rounded p-1.5 leading-tight">
                  <span className="font-semibold">เหตุผล:</span> {s.rejection_reason}
                </p>
              )}
              <p className="text-[9px] text-muted-foreground text-center">
                {new Date(s.uploaded_at).toLocaleString("th-TH", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuotationCard({
  q,
  job,
  token,
  portal,
  onAccepted,
}: {
  q: PublicQuotation;
  job: Job;
  token: string;
  portal: PortalBranding | null;
  onAccepted: () => void;
}) {
  const acceptFn = useServerFn(acceptQuotationByToken);
  const [fullOpen, setFullOpen] = React.useState(false);
  const [clientName, setClientName] = React.useState(job.client_name ?? "");
  const [accepting, setAccepting] = React.useState(false);
  const [accepted, setAccepted] = React.useState(
    q.status === "pending_payment" || q.status === "pending_receipt" || q.status === "completed",
  );
  const canAccept = !accepted && ["draft", "pending_approval", "sent"].includes(q.status);
  const itemsSubtotal =
    q.totals.itemsSubtotal ?? q.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const accent = portal?.theme.colors.primary ?? "#F37021";
  const accentBorder = portal?.theme.colors.primaryBorder ?? "#FDBA74";
  const accentSoft = portal?.theme.colors.primarySoft ?? "#FFF4EC";

  async function handleAccept() {
    if (!clientName.trim()) {
      toast.error("กรุณากรอกชื่อของคุณ");
      return;
    }
    setAccepting(true);
    try {
      await acceptFn({ data: { token, clientName: clientName.trim() } });
      setAccepted(true);
      toast.success("ยอมรับใบเสนอราคาแล้ว — ฟรีแลนซ์จะดำเนินการต่อให้ครับ/ค่ะ");
      celebrate();
      onAccepted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ยอมรับไม่สำเร็จ");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <Card
      className="bg-gradient-to-br to-white"
      style={{
        borderColor: accentBorder,
        background: `linear-gradient(to bottom right, color-mix(in srgb, ${accentSoft} 60%, white), white)`,
      }}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              className="text-[10px] font-semibold tracking-[0.15em] uppercase"
              style={{ color: accent }}
            >
              ใบเสนอราคา
            </p>
            <h3 className="text-sm font-semibold mt-0.5 truncate">{q.project_name || "โครงการ"}</h3>
            <p className="text-[11px] text-muted-foreground font-mono">{q.number}</p>
          </div>
          <FileText className="h-5 w-5 shrink-0" style={{ color: accent }} />
        </div>

        <ThemedQuotationMiniPreview q={q} itemsSubtotal={itemsSubtotal} branding={portal} />

        <Button
          variant="outline"
          className="w-full gap-1.5"
          style={{ borderColor: accentBorder, color: accent }}
          onClick={() => setFullOpen(true)}
        >
          <FileText className="h-3.5 w-3.5" /> ดู PDF ใบเสนอราคาฉบับเต็ม
        </Button>

        {canAccept && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 space-y-2">
            <p className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
              <ThumbsUp className="h-3.5 w-3.5" /> ยอมรับใบเสนอราคา
            </p>
            <p className="text-[11px] text-emerald-800/90 leading-relaxed">
              กดยอมรับเมื่อเห็นด้วยกับรายการและราคา — ฟรีแลนซ์จะได้รับแจ้งเตือนทันที
            </p>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="ชื่อของคุณ (สำหรับยืนยัน)"
              className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs"
            />
            <Button
              className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              disabled={accepting}
              onClick={handleAccept}
            >
              {accepting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              ยอมรับใบเสนอราคา
            </Button>
          </div>
        )}

        {accepted && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-100 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            ยอมรับใบเสนอราคาแล้ว — ชำระมัดจำได้ด้านบน
          </div>
        )}
      </CardContent>

      <QuotationFullDialog
        q={q}
        job={job}
        portal={portal}
        open={fullOpen}
        onOpenChange={setFullOpen}
      />
    </Card>
  );
}

function QuotationFullDialog({
  q,
  job,
  portal,
  open,
  onOpenChange,
}: {
  q: PublicQuotation;
  job: Job;
  portal: PortalBranding | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const itemsSubtotal =
    q.totals.itemsSubtotal ?? q.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const accent = portal?.theme.colors.primary ?? "#F37021";
  const handlePrint = () => {
    runPrintToPdf({ bodyClass: "printing-track", successMessage: "ส่งออก PDF สำเร็จ" });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-5 pt-5 pb-2 print:hidden flex flex-row items-center justify-between space-y-0 gap-3">
          <DialogTitle className="text-sm min-w-0 flex-1 pr-2">
            ใบเสนอราคาฉบับเต็ม · {q.number}
          </DialogTitle>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              className="gap-1.5 text-white"
              style={{ backgroundColor: accent }}
              onClick={handlePrint}
            >
              <Printer className="h-3.5 w-3.5" /> พิมพ์ / บันทึก PDF
            </Button>
            <DialogCloseButton />
          </div>
        </DialogHeader>

        <ThemedQuotationPrintBody
          q={q}
          clientName={job.client_name}
          itemsSubtotal={itemsSubtotal}
          branding={portal}
        />
      </DialogContent>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="track-print-only">
            <ThemedQuotationPrintBody
              q={q}
              clientName={job.client_name}
              itemsSubtotal={itemsSubtotal}
              branding={portal}
            />
          </div>,
          document.body,
        )}
    </Dialog>
  );
}

function BriefCard({ b, defaultExpanded = false }: { b: PublicBrief; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const overview = b.project_overview as Record<string, unknown>;
  const objective = typeof overview.objective === "string" ? overview.objective : "";
  const description = typeof overview.description === "string" ? overview.description : "";

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50/60 to-white">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-violet-600 tracking-[0.15em] uppercase">
              ใบบรีฟโปรเจกต์
            </p>
            <h3 className="text-sm font-semibold mt-0.5 truncate">{b.title || "บรีฟ"}</h3>
          </div>
          <ClipboardList className="h-5 w-5 text-violet-500 shrink-0" />
        </div>
        {(objective || description) && (
          <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {objective || description}
          </div>
        )}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-center gap-1 text-[11px] text-violet-700 hover:text-violet-800 py-1"
        >
          {expanded ? "ซ่อนรายละเอียด" : "ดูรายละเอียดเพิ่มเติม"}
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        {expanded && (
          <div className="space-y-2 pt-1 border-t border-violet-100 text-xs">
            <BriefSection title="ภาพรวมโครงการ" data={b.project_overview} />
            <BriefSection title="กลุ่มเป้าหมาย" data={b.audience} />
            <BriefSection title="ทิศทางการออกแบบ" data={b.design_direction} />
            <BriefSection title="สเปคเทคนิค" data={b.tech_specs} />
            <BriefSection title="ไทม์ไลน์ & งบประมาณ" data={b.timeline_budget} />
            {b.notes && (
              <div className="text-[11px] text-muted-foreground whitespace-pre-wrap pt-1.5 border-t border-violet-100/60">
                <span className="font-semibold text-foreground">หมายเหตุ: </span>
                {b.notes}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BriefSection({ title, data }: { title: string; data: Record<string, unknown> }) {
  const entries = Object.entries(data ?? {}).filter(
    ([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0),
  );
  if (entries.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-violet-700 uppercase tracking-wide">{title}</p>
      <ul className="space-y-0.5 text-[11px] text-muted-foreground">
        {entries.map(([k, v]) => (
          <li key={k}>
            <span className="font-medium text-foreground">{k}: </span>
            {Array.isArray(v)
              ? v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(", ")
              : typeof v === "object"
                ? JSON.stringify(v)
                : String(v)}
          </li>
        ))}
      </ul>
    </div>
  );
}
