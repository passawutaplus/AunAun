import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OutreachTemplate = "creator_publish" | "hirer_post_job" | "referral" | "custom";
export type OutreachChannel = "in_app" | "email" | "line";

export const OUTREACH_TEMPLATES: Record<
  OutreachTemplate,
  { title: string; body: string; link: string; labelTh: string }
> = {
  creator_publish: {
    labelTh: "Creator — publish ผลงานแรก",
    title: "ลอง publish ผลงานแรกบน Aplus1",
    body: "โปรไฟล์พร้อมแล้ว — อัปผลงานแรกเพื่อให้แบรนด์และทีมเห็นคุณในฟีด",
    link: "/projects/new",
  },
  hirer_post_job: {
    labelTh: "Hirer — โพสต์งาน",
    title: "โพสต์งานเพื่อหาครีเอทีฟบน Aplus1",
    body: "ประกาศจ้างงานฟรี — รับสมัครจากพอร์ตโฟลิโอจริงในชุมชน",
    link: "/jobs",
  },
  referral: {
    labelTh: "Referral — ชวนเพื่อน",
    title: "ชวนเพื่อนมา Aplus1 รับ PX",
    body: "แชร์ลิงก์ชวนเพื่อน: สมัคร 20px · โพสต์แรก 100px · ผู้ชวนได้ 50px เมื่อเพื่อนทำ first action",
    link: "/?ref=YOUR_CODE",
  },
  custom: {
    labelTh: "กำหนดเอง",
    title: "ข้อความจากทีม Marketing",
    body: "",
    link: "/",
  },
};

export function useMarketingOutreach(businessId: string | null) {
  return useMutation({
    mutationFn: async (input: {
      channel: OutreachChannel;
      userIds: string[];
      title: string;
      body: string;
      link?: string;
      template?: OutreachTemplate;
    }) => {
      if (!businessId) throw new Error("เลือก business ก่อนส่ง outreach");
      const { data, error } = await supabase.functions.invoke("marketing-outreach", {
        body: {
          event: input.channel,
          user_ids: input.userIds,
          title: input.title,
          body: input.body,
          link: input.link,
          business_id: businessId,
          template: input.template,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      return data as { sent: number; total: number };
    },
  });
}
