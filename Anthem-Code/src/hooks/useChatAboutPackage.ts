import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useCreateHireRequest } from "@/hooks/useHiringRequests";
import { useOpenHireCollabChat } from "@/hooks/useChat";
import { formatServicePriceRange, type CreatorService } from "@/hooks/useCreatorServices";
import { isBlockedFromOpportunity } from "@/hooks/useCommunityPostInteractions";
import { buildHireContextMessage } from "@/lib/chatContext";
import { validateProjectInquiry } from "@/domain/inquiry";
import { navigateToAuth } from "@/lib/authRedirect";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { trackProductEvent } from "@/lib/productEvents";
import { isUuid } from "@/lib/uuid";

function deadlineFor(durationLabel: string | null | undefined): string {
  const days = Number.parseInt(String(durationLabel ?? "").replace(/[^\d]/g, ""), 10);
  const d = new Date();
  d.setDate(d.getDate() + (Number.isFinite(days) && days > 0 ? days : 14));
  return d.toISOString().slice(0, 10);
}

/**
 * "ทักแชท / ขอใช้บริการนี้" on a package: the package already carries the brief (title, price, summary,
 * time), so open the chat straight away — no hire form. Reuses an earlier request for the same package.
 */
export function useChatAboutPackage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const createReq = useCreateHireRequest();
  const openChat = useOpenHireCollabChat();
  const [busyId, setBusyId] = useState<string | null>(null);

  const start = useCallback(
    async (svc: CreatorService, creatorName?: string | null) => {
      if (!user) {
        navigateToAuth(navigate, { hire: "1" });
        return;
      }
      const freelancerId = svc.owner_id;
      if (!freelancerId || !isUuid(freelancerId)) {
        toast.error("แพ็กเกจนี้ยังไม่มีเจ้าของในระบบ");
        return;
      }
      if (freelancerId === user.id) {
        toast.info("ไม่สามารถจ้างตัวเองได้");
        return;
      }
      const inquiryErr = validateProjectInquiry({ source: "service", serviceId: svc.id });
      if (inquiryErr) {
        toast.error(inquiryErr);
        return;
      }
      const email = user.email?.trim() || (profile as { email?: string } | null | undefined)?.email?.trim() || "";
      if (!email) {
        toast.error("บัญชีนี้ยังไม่มีอีเมล — ตั้งค่าอีเมลในบัญชีก่อนส่งคำขอจ้าง");
        return;
      }
      const clientName =
        profile?.display_name?.trim() ||
        profile?.username?.trim() ||
        (user.user_metadata as { full_name?: string } | undefined)?.full_name?.trim() ||
        user.email?.split("@")[0] ||
        "ผู้ใช้";

      setBusyId(svc.id);
      try {
        if (await isBlockedFromOpportunity(user.id, freelancerId).catch(() => false)) {
          toast.error("คุณถูกบล็อก — ส่งคำขอไปยังผู้ใช้นี้ไม่ได้");
          return;
        }

        const priceMax = Math.max(0, Math.round(svc.price_thb));
        const priceMin = Math.max(0, Math.round(svc.price_min_thb || priceMax));

        // Talking about the same package again continues the same chat instead of opening a new request.
        let requestId: string | null = null;
        try {
          const { data: prev } = await supabase
            .from("hiring_requests")
            .select("id")
            .eq("client_id", user.id)
            .eq("freelancer_id", freelancerId)
            .eq("service_id" as never, svc.id as never)
            .order("created_at", { ascending: false })
            .limit(1);
          requestId = (prev as { id: string }[] | null)?.[0]?.id ?? null;
        } catch {
          requestId = null;
        }

        let isNew = false;
        if (!requestId) {
          requestId = (await createReq.mutateAsync({
            freelancer_id: freelancerId,
            client_id: user.id,
            target_type: "freelancer",
            project_id: null,
            project_title: svc.title,
            client_name: clientName,
            email,
            phone: profile?.phone?.trim() || null,
            budget_amount: priceMax || null,
            budget_min: priceMin || null,
            budget_max: priceMax || null,
            deadline: deadlineFor(svc.duration_label),
            message:
              `สนใจแพ็กเกจ «${svc.title}» (${formatServicePriceRange(priceMin, priceMax)})` +
              (svc.summary?.trim() ? `\n${svc.summary.trim()}` : "") +
              "\nอยากคุยรายละเอียดในแชท",
            job_type: "Service",
            job_type_other: null,
            job_post_id: null,
            service_id: svc.id,
            attachment_urls: null,
          } as never)) as string;
          isNew = true;
          void supabase.functions.invoke("notify-hire-request", { body: { request_id: requestId } });
        }

        const convId = await openChat.mutateAsync({
          kind: "hire",
          requestId,
          clientId: user.id,
          freelancerId,
          projectId: null,
          projectTitle: svc.title,
          serviceId: svc.id,
          contextMessage: buildHireContextMessage({
            source: "service",
            serviceTitle: svc.title,
            servicePriceThb: priceMax,
            profileName: creatorName ?? null,
            projectTitle: null,
          }),
        });

        if (isNew) {
          void trackProductEvent(
            "hire_submit",
            { project_id: null, freelancer_id: freelancerId, source: "service", service_id: svc.id },
            { debounceMs: 0 },
          );
        }
        navigate(`/chat/${convId}`);
      } catch (err) {
        toast.error(mapWriteFlowError(err, "เปิดแชทไม่สำเร็จ"));
      } finally {
        setBusyId(null);
      }
    },
    [user, profile, navigate, createReq, openChat],
  );

  return { start, busyId };
}
