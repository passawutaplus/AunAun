import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ResponsiveOverlay } from "@/components/ui/ResponsiveOverlay";
import { Button } from "@/components/ui/button";
import { Briefcase, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { INQUIRY_PLATFORM_DISCLAIMER, PACKAGE_INQUIRY_PLATFORM_DISCLAIMER } from "@/lib/legalSignupCopy";
import { parseMoneyInput } from "@/lib/parseMoney";
import { isUuid } from "@/lib/uuid";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useCreateHireRequest } from "@/hooks/useHiringRequests";
import { useMyOpenJobPosts } from "@/hooks/useJobs";
import { useOpenHireCollabChat } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import {
  buildHireContextMessage,
  DEFAULT_HIRE_MESSAGE,
  type ChatEntrySource,
} from "@/lib/chatContext";
import { validateProjectInquiry } from "@/domain/inquiry";
import { hireInviteBriefSchema } from "@/lib/validators";
import HireInviteForm, {
  buildHireInviteMessage,
  emptyHireInviteForm,
} from "@/components/hiring/HireInviteForm";
import ProjectReferencePreview from "@/components/opportunity/ProjectReferencePreview";
import HireTargetProfilePreview from "@/components/opportunity/HireTargetProfilePreview";
import ServiceDetailDialog from "@/components/services/ServiceDetailDialog";
import {
  formatServicePriceRange,
  useCreatorServices,
  type CreatorService,
} from "@/hooks/useCreatorServices";
import { trackProductEvent } from "@/lib/productEvents";
import { isBlockedFromOpportunity } from "@/hooks/useCommunityPostInteractions";
import { navigateToAuth } from "@/lib/authRedirect";
import { cn } from "@/lib/utils";
import { isLocalDevSelfHirePreview } from "@/lib/localDevSelfHire";

type HireFieldErrorKey = "deadline" | "budgetMin" | "budgetMax" | "jobTypes" | "details";
type HirePanel = "message" | "services";

const HIRE_PANEL_TABS = [
  { id: "message" as const, label: "Brief" },
  { id: "services" as const, label: "Packages" },
] as const;

/** Same L/R slide feel as FeedModeToggle (Projects / Designers). */
const hireTabSlideTransition = {
  type: "spring" as const,
  stiffness: 380,
  damping: 34,
  mass: 0.7,
};

type HireTabIndicator = { x: number; width: number };

interface HireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectTitle?: string;
  projectId?: string;
  projectCoverUrl?: string | null;
  freelancerId?: string;
  source?: ChatEntrySource;
  profileName?: string;
  /** Creator username — used for local-only self-hire UI preview. */
  freelancerUsername?: string | null;
  /** When opening hire — Brief | Packages tabs. */
  initialPanel?: HirePanel;
  /** Open package detail when dialog opens (e.g. deep-link). */
  launchDetailServiceId?: string | null;
  onLaunchDetailHandled?: () => void;
  /** After profile detail Request — submit hire for this package when dialog opens. */
  autoSubmitServiceId?: string | null;
  onAutoSubmitHandled?: () => void;
}

function defaultServiceDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

const HireDialog = ({
  open,
  onOpenChange,
  projectTitle,
  projectId,
  projectCoverUrl,
  freelancerId,
  source = "project",
  profileName,
  freelancerUsername,
  initialPanel = "message",
  launchDetailServiceId = null,
  onLaunchDetailHandled,
  autoSubmitServiceId = null,
  onAutoSubmitHandled,
}: HireDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const createReq = useCreateHireRequest();
  const openChat = useOpenHireCollabChat();
  const { data: myJobs = [] } = useMyOpenJobPosts();
  const showServiceTabs = !!freelancerId && isUuid(freelancerId);
  const localSelfHirePreview =
    !!user &&
    !!freelancerId &&
    freelancerId === user.id &&
    isLocalDevSelfHirePreview(freelancerUsername);
  const { data: targetProfile } = useProfile(
    open && freelancerId && isUuid(freelancerId) ? freelancerId : undefined,
  );
  const { data: services = [], isLoading: servicesLoading } = useCreatorServices(
    showServiceTabs && open ? freelancerId : undefined,
    { includeDrafts: localSelfHirePreview },
  );
  const [panel, setPanel] = useState<HirePanel>(initialPanel);
  const [jobPostId, setJobPostId] = useState("");
  const [form, setForm] = useState(emptyHireInviteForm());
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<HireFieldErrorKey, string>>>({});
  const [serviceBusyId, setServiceBusyId] = useState<string | null>(null);
  const [detailService, setDetailService] = useState<CreatorService | null>(null);
  const busy = createReq.isPending || openChat.isPending;
  const reducedMotion = useReducedMotion();
  const hireTabTrackRef = useRef<HTMLDivElement>(null);
  const hireTabBtnRefs = useRef<Map<HirePanel, HTMLButtonElement>>(new Map());
  const [hireTabIndicator, setHireTabIndicator] = useState<HireTabIndicator | null>(null);

  useLayoutEffect(() => {
    if (!showServiceTabs || !open) {
      setHireTabIndicator(null);
      return;
    }
    const track = hireTabTrackRef.current;
    if (!track) return;

    const measure = () => {
      const btn = hireTabBtnRefs.current.get(panel);
      if (!btn) return;
      const btnRect = btn.getBoundingClientRect();
      if (btnRect.width < 1) return;
      const trackRect = track.getBoundingClientRect();
      const next = {
        x: btnRect.left - trackRect.left,
        width: btnRect.width,
      };
      setHireTabIndicator((prev) =>
        prev &&
        Math.abs(prev.x - next.x) < 0.5 &&
        Math.abs(prev.width - next.width) < 0.5
          ? prev
          : next,
      );
    };

    measure();
    // Dialog zoom-in can leave first measure wrong — remount after paint / animation.
    const raf1 = requestAnimationFrame(() => {
      measure();
      requestAnimationFrame(measure);
    });
    const t = window.setTimeout(measure, 220);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(track);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf1);
      window.clearTimeout(t);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [panel, showServiceTabs, open]);

  useEffect(() => {
    if (!open) return;
    setPanel(initialPanel);
    void trackProductEvent(
      "hire_open",
      { project_id: projectId ?? null, freelancer_id: freelancerId ?? null, source },
      { debounceMs: 1_000 },
    );
  }, [open, projectId, freelancerId, source, initialPanel]);

  useEffect(() => {
    if (!open || !launchDetailServiceId || servicesLoading) return;
    const match = services.find((s) => s.id === launchDetailServiceId);
    if (!match) {
      onLaunchDetailHandled?.();
      return;
    }
    setPanel("services");
    setDetailService(match);
    onLaunchDetailHandled?.();
  }, [open, launchDetailServiceId, services, servicesLoading, onLaunchDetailHandled]);

  const reset = () => {
    setForm(emptyHireInviteForm());
    setJobPostId("");
    setFieldErrors({});
    setServiceBusyId(null);
    setDetailService(null);
    setPanel(initialPanel);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const clearFieldError = (key: HireFieldErrorKey) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const resolvedTitle = () => {
    const selectedJob = myJobs.find((j) => j.id === jobPostId);
    return selectedJob?.title ?? projectTitle ?? (source === "profile" ? "โปรไฟล์" : "ผลงานในฟีด");
  };

  const resolveClientContact = () => {
    const clientName =
      profile?.display_name?.trim() ||
      profile?.username?.trim() ||
      user?.user_metadata?.full_name?.trim() ||
      user?.email?.split("@")[0] ||
      "ผู้ใช้";
    const email = user?.email?.trim() || profile?.email?.trim() || "";
    return { clientName, email };
  };

  const guardHireTarget = async (): Promise<boolean> => {
    if (!user) {
      navigateToAuth(navigate, { hire: "1" });
      return false;
    }
    if (!freelancerId || !isUuid(freelancerId)) {
      toast.error("ผลงานนี้ยังไม่มีเจ้าของในระบบ — ไม่สามารถส่งคำขอได้");
      return false;
    }
    if (freelancerId === user.id) {
      if (!localSelfHirePreview) {
        toast.info("ไม่สามารถจ้างตัวเองได้");
        return false;
      }
      return true;
    }
    try {
      if (await isBlockedFromOpportunity(user.id, freelancerId)) {
        toast.error("คุณถูกบล็อก — ส่งคำขอจ้างไปยังผู้ใช้นี้ไม่ได้");
        return false;
      }
    } catch {
      /* fall through to server check */
    }
    return true;
  };

  const submitHire = async () => {
    if (!(await guardHireTarget()) || !user || !freelancerId) return;

    const inquiryErr = validateProjectInquiry({ source, projectId });
    if (inquiryErr) {
      toast.error(inquiryErr);
      return;
    }

    const { clientName, email } = resolveClientContact();
    if (!email) {
      toast.error("บัญชีนี้ยังไม่มีอีเมล — ตั้งค่าอีเมลในบัญชีก่อนส่งคำขอจ้าง");
      return;
    }

    const budgetMin = parseMoneyInput(form.budgetMin) ?? undefined;
    const budgetMax = parseMoneyInput(form.budgetMax) ?? undefined;
    const briefCheck = hireInviteBriefSchema.safeParse({
      jobTypes: form.jobTypes,
      details: form.details,
      budgetMin,
      budgetMax,
      deadline: form.deadline.trim(),
    });
    if (!briefCheck.success) {
      const nextErrors: Partial<Record<HireFieldErrorKey, string>> = {};
      for (const issue of briefCheck.error.issues) {
        const path = issue.path[0];
        if (
          path === "deadline" ||
          path === "budgetMin" ||
          path === "budgetMax" ||
          path === "jobTypes" ||
          path === "details"
        ) {
          nextErrors[path] = issue.message;
        }
      }
      if (!form.deadline.trim() && !nextErrors.deadline) {
        nextErrors.deadline = "กรุณาเลือกกำหนดส่งงาน";
      }
      if (!form.jobTypes.length && !nextErrors.jobTypes) {
        nextErrors.jobTypes = "กรุณาเลือกประเภทงานอย่างน้อย 1 อย่าง";
      }
      setFieldErrors(nextErrors);
      const firstMsg =
        nextErrors.jobTypes ||
        nextErrors.details ||
        nextErrors.budgetMin ||
        nextErrors.budgetMax ||
        nextErrors.deadline ||
        briefCheck.error.issues[0]?.message ||
        "กรุณากรอกข้อมูลที่บังคับ";
      toast.error(firstMsg);
      const focusId = nextErrors.jobTypes
        ? "hire-job-types"
        : nextErrors.details
          ? "hire-details"
          : nextErrors.budgetMin
            ? "hire-budget-min"
            : nextErrors.budgetMax
              ? "hire-budget-max"
              : nextErrors.deadline
                ? "hire-deadline"
                : "hire-job-types";
      requestAnimationFrame(() => {
        const el = document.getElementById(focusId);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (focusId !== "hire-job-types") el?.focus();
      });
      return;
    }
    setFieldErrors({});
    const budgetNum = budgetMin ?? budgetMax;
    const inviteMessage = buildHireInviteMessage(form) ?? DEFAULT_HIRE_MESSAGE;
    const safeProjectId = projectId && isUuid(projectId) ? projectId : null;

    if (localSelfHirePreview) {
      toast.success("Local preview — ฟอร์มผ่านแล้ว (ไม่สร้างคำขอ / ไม่เปิดแชท)");
      handleOpenChange(false);
      return;
    }

    try {
      const title = resolvedTitle();
      const requestId = await createReq.mutateAsync({
        freelancer_id: freelancerId,
        client_id: user.id,
        target_type: "freelancer",
        project_id: safeProjectId,
        project_title: title,
        client_name: clientName,
        email,
        phone: profile?.phone?.trim() || null,
        budget_amount: budgetNum ?? null,
        budget_min: budgetMin ?? null,
        budget_max: budgetMax ?? null,
        deadline: form.deadline.trim(),
        message: inviteMessage,
        job_type: form.jobTypes.join(",") || null,
        job_type_other: null,
        job_post_id: jobPostId && isUuid(jobPostId) ? jobPostId : null,
        attachment_urls: form.attachmentUrls.length ? form.attachmentUrls : null,
      } as never);

      void supabase.functions.invoke("notify-hire-request", {
        body: { request_id: requestId },
      });

      const convId = await openChat.mutateAsync({
        kind: "hire",
        requestId,
        clientId: user.id,
        freelancerId,
        projectId: safeProjectId,
        projectTitle: title,
        contextMessage: buildHireContextMessage({
          source,
          projectTitle: title,
          profileName: profileName ?? profile?.display_name,
        }),
      });

      toast.success("เปิดแชทแล้ว — คุยรายละเอียดได้เลย");
      void trackProductEvent(
        "hire_submit",
        { project_id: projectId ?? null, freelancer_id: freelancerId ?? null, source },
        { debounceMs: 0 },
      );
      handleOpenChange(false);
      navigate(`/chat/${convId}`);
    } catch (err: unknown) {
      toast.error(mapWriteFlowError(err, "ส่งไม่สำเร็จ"));
    }
  };

  const submitServiceHire = async (svc: CreatorService) => {
    if (!(await guardHireTarget()) || !user || !freelancerId) return;

    const inquiryErr = validateProjectInquiry({ source: "service", serviceId: svc.id });
    if (inquiryErr) {
      toast.error(inquiryErr);
      return;
    }

    const { clientName, email } = resolveClientContact();
    if (!email) {
      toast.error("บัญชีนี้ยังไม่มีอีเมล — ตั้งค่าอีเมลในบัญชีก่อนส่งคำขอจ้าง");
      return;
    }

    const priceMax = Math.max(0, Math.round(svc.price_thb));
    const priceMin = Math.max(0, Math.round(svc.price_min_thb || priceMax));
    const days = Number.parseInt(String(svc.duration_label ?? "").replace(/[^\d]/g, ""), 10);
    const deadline =
      Number.isFinite(days) && days > 0
        ? (() => {
            const d = new Date();
            d.setDate(d.getDate() + days);
            return d.toISOString().slice(0, 10);
          })()
        : defaultServiceDeadline();
    const inviteMessage =
      `สนใจแพ็กเกจ «${svc.title}» (${formatServicePriceRange(priceMin, priceMax)})` +
      (svc.summary?.trim() ? `\n${svc.summary.trim()}` : "") +
      "\nอยากคุยรายละเอียดในแชท";

    setServiceBusyId(svc.id);
    if (localSelfHirePreview) {
      toast.success("Local preview — แพ็กเกจผ่านแล้ว (ไม่สร้างคำขอ / ไม่เปิดแชท)");
      setServiceBusyId(null);
      handleOpenChange(false);
      return;
    }
    try {
      const safeProjectId = projectId && isUuid(projectId) ? projectId : null;
      const requestId = await createReq.mutateAsync({
        freelancer_id: freelancerId,
        client_id: user.id,
        target_type: "freelancer",
        project_id: safeProjectId,
        project_title: svc.title,
        client_name: clientName,
        email,
        phone: profile?.phone?.trim() || null,
        budget_amount: priceMax || null,
        budget_min: priceMin || null,
        budget_max: priceMax || null,
        deadline,
        message: inviteMessage,
        job_type: "Service",
        job_type_other: null,
        job_post_id: null,
        service_id: svc.id,
        attachment_urls: null,
      } as never);

      void supabase.functions.invoke("notify-hire-request", {
        body: { request_id: requestId },
      });

      const convId = await openChat.mutateAsync({
        kind: "hire",
        requestId,
        clientId: user.id,
        freelancerId,
        projectId: safeProjectId,
        projectTitle: projectTitle?.trim() || svc.title,
        serviceId: svc.id,
        contextMessage: buildHireContextMessage({
          source: "service",
          serviceTitle: svc.title,
          servicePriceThb: priceMax,
          profileName: profileName ?? profile?.display_name,
          projectTitle: projectTitle ?? null,
        }),
      });

      toast.success("เปิดแชทจากแพ็กเกจแล้ว");
      void trackProductEvent(
        "hire_submit",
        {
          project_id: safeProjectId,
          freelancer_id: freelancerId,
          source: "service",
          service_id: svc.id,
        },
        { debounceMs: 0 },
      );
      handleOpenChange(false);
      navigate(`/chat/${convId}`);
    } catch (err: unknown) {
      toast.error(mapWriteFlowError(err, "ส่งไม่สำเร็จ"));
    } finally {
      setServiceBusyId(null);
    }
  };

  const autoSubmitStarted = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      autoSubmitStarted.current = null;
      return;
    }
    if (!autoSubmitServiceId || servicesLoading) return;
    if (autoSubmitStarted.current === autoSubmitServiceId) return;
    const match = services.find((s) => s.id === autoSubmitServiceId);
    if (!match) {
      onAutoSubmitHandled?.();
      return;
    }
    autoSubmitStarted.current = autoSubmitServiceId;
    setPanel("services");
    void submitServiceHire(match).finally(() => onAutoSubmitHandled?.());
    // intentionally once-per-open; submitServiceHire closes dialog on success
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoSubmitServiceId, services, servicesLoading]);

  const targetDisplayName =
    targetProfile?.display_name?.trim() ||
    profileName?.trim() ||
    (source === "profile" ? projectTitle?.trim() : "") ||
    targetProfile?.username?.trim() ||
    freelancerUsername?.trim() ||
    "";
  const targetUsername =
    targetProfile?.username?.trim() || freelancerUsername?.trim() || null;

  return (
    <>
    <ResponsiveOverlay
      open={open}
      onOpenChange={handleOpenChange}
      accessibleTitle="Hire Request"
      desktopClassName="max-w-lg max-h-[min(90dvh,90vh)]"
      bodyClassName="gap-4 pt-2"
      showGrabHandle
    >
        <DialogHeader className="space-y-2 text-left">
          <Briefcase className="h-8 w-8 text-primary" aria-hidden />
          <DialogTitle className="text-2xl leading-tight tracking-tight sm:text-[1.75rem]">
            Hire Request
          </DialogTitle>
          <DialogDescription className="sr-only">
            {targetDisplayName
              ? `ส่งคำขอจ้างงานถึง ${targetDisplayName}`
              : "ส่งคำขอจ้างงาน"}
          </DialogDescription>
          {localSelfHirePreview ? (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              Local only — ทดลองฟอร์มจ้างตัวเองได้ แต่จะไม่สร้างคำขอหรือเปิดแชท
            </p>
          ) : null}
        </DialogHeader>

        {targetDisplayName ? (
          <HireTargetProfilePreview
            name={targetDisplayName}
            username={targetUsername}
            avatarUrl={targetProfile?.avatar_url}
            role={targetProfile?.role}
            freelancerId={freelancerId}
          />
        ) : null}

        {showServiceTabs ? (
          <div
            ref={hireTabTrackRef}
            role="tablist"
            aria-label="โหมดคำขอจ้าง"
            className="relative flex w-full rounded-full bg-muted/60 p-1 shadow-[0_0_0_1px_hsl(var(--border)/0.35)]"
          >
            {hireTabIndicator ? (
              reducedMotion ? (
                <span
                  className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-background shadow-md shadow-primary/35 ring-1 ring-primary/30"
                  style={{
                    transform: `translateX(${hireTabIndicator.x}px)`,
                    width: hireTabIndicator.width,
                    boxShadow:
                      "0 0 16px 4px hsl(var(--primary) / 0.35), 0 4px 12px hsl(var(--primary) / 0.2)",
                  }}
                  aria-hidden
                />
              ) : (
                <motion.span
                  className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-background ring-1 ring-primary/30 will-change-transform"
                  initial={false}
                  animate={{ x: hireTabIndicator.x, width: hireTabIndicator.width }}
                  transition={hireTabSlideTransition}
                  style={{
                    boxShadow:
                      "0 0 18px 5px hsl(var(--primary) / 0.4), 0 4px 14px hsl(var(--primary) / 0.22)",
                  }}
                  aria-hidden
                />
              )
            ) : null}

            {HIRE_PANEL_TABS.map((tab) => {
              const active = panel === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  ref={(el) => {
                    if (el) hireTabBtnRefs.current.set(tab.id, el);
                    else hireTabBtnRefs.current.delete(tab.id);
                  }}
                  className={cn(
                    "relative z-10 flex-1 rounded-full py-2 text-sm font-medium transition-colors",
                    active
                      ? hireTabIndicator
                        ? "text-foreground"
                        : // Raised pill before slide indicator measures (open on Brief).
                          "bg-background text-foreground shadow-[0_0_18px_5px_hsl(var(--primary)/0.4),0_4px_14px_hsl(var(--primary)/0.22)] ring-1 ring-primary/30"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setPanel(tab.id)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Stack both panels so Packages keeps Brief size/position (no shrink jump). */}
        {showServiceTabs ? (
          <div className="grid">
            <div
              className={cn(
                "col-start-1 row-start-1 flex min-h-0 flex-col gap-4",
                panel !== "message" && "invisible pointer-events-none",
              )}
              aria-hidden={panel !== "message"}
              // Prevent tabbing into the hidden Brief form while on Packages.
              inert={panel !== "message" ? true : undefined}
            >
              {source === "project" && projectTitle ? (
                <ProjectReferencePreview title={projectTitle} coverUrl={projectCoverUrl} />
              ) : null}
              <div
                className={
                  source === "project" && projectTitle
                    ? "border-t border-border/60 pt-5"
                    : undefined
                }
              >
                <HireInviteForm
                  form={form}
                  setForm={setForm}
                  myJobs={myJobs}
                  jobPostId={jobPostId}
                  onJobPostIdChange={setJobPostId}
                  userId={user?.id}
                  fieldErrors={fieldErrors}
                  onClearFieldError={clearFieldError}
                />
              </div>
              <DialogFooter className="gap-2 sm:justify-end pt-2">
                <Button
                  type="button"
                  disabled={busy}
                  className="rounded-full gap-1.5"
                  onClick={() => void submitHire()}
                >
                  {busy && !serviceBusyId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                  {busy && !serviceBusyId ? "กำลังเปิด..." : "สนใจจ้างงาน"}
                </Button>
              </DialogFooter>
            </div>

            <div
              className={cn(
                "col-start-1 row-start-1 min-h-0 space-y-3",
                panel !== "services" && "invisible pointer-events-none",
              )}
              aria-hidden={panel !== "services"}
              inert={panel !== "services" ? true : undefined}
            >
              {servicesLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  กำลังโหลดบริการ...
                </div>
              ) : services.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  ยังไม่มีแพ็กเกจที่เผยแพร่ — ส่งบรีฟได้ที่แท็บ Brief
                </p>
              ) : (
                services.map((svc) => {
                  const cover = svc.cover_url?.trim() || svc.gallery_urls[0] || "";
                  return (
                    <div
                      key={svc.id}
                      className="rounded-xl border border-border/60 overflow-hidden"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-stretch">
                        <div className="relative w-full sm:w-[38%] sm:max-w-[9.5rem] aspect-[4/3] sm:aspect-auto sm:min-h-[7rem] bg-muted shrink-0">
                          {cover ? (
                            <img
                              src={cover}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                              <Briefcase className="h-6 w-6 opacity-40" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col gap-2 p-3 sm:border-l border-border/50">
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              Package
                            </p>
                            <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                              {svc.title}
                            </p>
                            <p className="text-sm font-semibold text-primary tabular-nums">
                              {formatServicePriceRange(svc.price_min_thb, svc.price_thb)}
                            </p>
                            {svc.summary?.trim() ? (
                              <p className="text-[11px] text-muted-foreground line-clamp-2">
                                {svc.summary}
                              </p>
                            ) : null}
                          </div>
                          <div className="mt-auto flex justify-end pt-1">
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-full h-8 px-3.5 text-xs gap-1.5"
                              disabled={busy || !!serviceBusyId}
                              onClick={() => setDetailService(svc)}
                            >
                              View details
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <>
            {source === "project" && projectTitle ? (
              <ProjectReferencePreview title={projectTitle} coverUrl={projectCoverUrl} />
            ) : null}
            <div
              className={
                source === "project" && projectTitle
                  ? "border-t border-border/60 pt-5"
                  : undefined
              }
            >
              <HireInviteForm
                form={form}
                setForm={setForm}
                myJobs={myJobs}
                jobPostId={jobPostId}
                onJobPostIdChange={setJobPostId}
                userId={user?.id}
                fieldErrors={fieldErrors}
                onClearFieldError={clearFieldError}
              />
            </div>
            <DialogFooter className="gap-2 sm:justify-end pt-2">
              <Button
                type="button"
                disabled={busy}
                className="rounded-full gap-1.5"
                onClick={() => void submitHire()}
              >
                {busy && !serviceBusyId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4" />
                )}
                {busy && !serviceBusyId ? "กำลังเปิด..." : "สนใจจ้างงาน"}
              </Button>
            </DialogFooter>
          </>
        )}

        <p className="text-[11px] leading-relaxed text-muted-foreground border-t border-border/40 pt-3">
          {showServiceTabs && panel === "services"
            ? PACKAGE_INQUIRY_PLATFORM_DISCLAIMER
            : INQUIRY_PLATFORM_DISCLAIMER}
        </p>
    </ResponsiveOverlay>

    <ServiceDetailDialog
      open={!!detailService}
      onOpenChange={(next) => {
        if (!next) setDetailService(null);
      }}
      service={detailService}
      creatorName={targetDisplayName || profileName}
      creatorUsername={targetUsername}
      creatorAvatarUrl={targetProfile?.avatar_url}
      creatorRole={targetProfile?.role}
      referrerProjectId={projectId}
      busy={busy && !!serviceBusyId}
      onRequest={(svc) => {
        void submitServiceHire(svc).then(() => setDetailService(null));
      }}
    />
    </>
  );
};

export default HireDialog;
