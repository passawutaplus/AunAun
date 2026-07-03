import { supabase } from "@/integrations/supabase/client";
import type { MarketingAiOutput, MarketingAiTask, MarketingInsightType } from "./types";

const COMPLIANCE_NOTE =
  "ข้อมูลช่วยตัดสินใจ ไม่ใช่ข้อเท็จจริง 100% — ตรวจสอบ source URL และสิทธิ์ข้อมูลก่อนใช้งาน";

export function buildPrompt(task: MarketingAiTask, context: Record<string, string>): string {
  const ctx = Object.entries(context)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return `Task: ${task}\nContext:\n${ctx}\nOutput: structured JSON with summary, keyFindings[], recommendedAction, confidenceScore, riskComplianceNote`;
}

export function isMarketingAiMock(): boolean {
  const primary = import.meta.env.VITE_MARKETING_AI_MOCK;
  const legacy = import.meta.env.VITE_KUY_RADAR_AI_MOCK;
  const flag = primary ?? legacy;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return import.meta.env.DEV;
}

export function mockAiOutput(task: MarketingAiTask, insightType?: MarketingInsightType): MarketingAiOutput {
  const byTask: Partial<Record<MarketingAiTask, MarketingAiOutput>> = {
    analyze_lead_intent: {
      summary: "Lead แสดง intent เปรียบเทียบราคาและถามรีวิวจริง",
      keyFindings: ["ถามราคาโดยตรง", "กังวลผลข้างเคียง", "ต้องการ proof"],
      recommendedAction: "ส่ง FAQ + case study + consult ฟรี",
      confidenceScore: 0.84,
      riskComplianceNote: COMPLIANCE_NOTE,
    },
    score_lead_quality: {
      summary: "คะแนน lead สูงจาก keyword match และ buying signal",
      keyFindings: ["engagement ปานกลาง", "pain point ตรงกับ offer", "platform ตรงเป้า"],
      recommendedAction: "จัดลำดับ outreach ภายใน 24 ชม.",
      confidenceScore: 0.79,
      riskComplianceNote: COMPLIANCE_NOTE,
    },
    summarize_competitor: {
      summary: "คู่แข่งโตเร็วด้วย short-form + testimonial",
      keyFindings: ["offer consult ฟรี", "ราคาไม่โปร่งใส", "retarget ดี"],
      recommendedAction: "ทำ comparison content และ landing ที่ตอบ objection",
      confidenceScore: 0.81,
      riskComplianceNote: COMPLIANCE_NOTE,
    },
    generate_marketing_insight: {
      summary: "โอกาสอยู่ที่ proof + transparency + limited slot",
      keyFindings: ["FAQ ลดความกังวล", "before/after เพิ่ม conversion", "retarget คนอ่าน source"],
      recommendedAction: "แยก funnel Awareness / Consideration / Conversion",
      confidenceScore: 0.77,
      riskComplianceNote: COMPLIANCE_NOTE,
    },
    generate_ads_plan: {
      summary: "Audience หลัก: คนเปรียบเทียบราคาและถามรีวิว",
      keyFindings: ["hook จาก pain point", "creative testimonial", "KPI: CPL + consult booked"],
      recommendedAction: "ยิง campaign แยกตาม funnel stage",
      confidenceScore: 0.75,
      riskComplianceNote: COMPLIANCE_NOTE,
    },
    generate_outreach_message: {
      summary: "ข้อความ outreach ควรสั้น โปร่งใส และมี opt-out",
      keyFindings: ["อ้างอิง public post", "ไม่เก็บข้อมูลส่วนตัวเกินจำเป็น", "มีลิงก์นโยบาย"],
      recommendedAction: "ส่งเฉพาะ lead qualified พร้อม template A/B",
      confidenceScore: 0.73,
      riskComplianceNote: COMPLIANCE_NOTE,
    },
    generate_daily_report: {
      summary: "สรุปรายวัน: lead ใหม่ 12, qualified 4, outreach due 3",
      keyFindings: ["TikTok intent สูงสุด", "competitor ใหม่ 1", "content gap: comparison"],
      recommendedAction: "โฟกัส retarget + comparison landing",
      confidenceScore: 0.7,
      riskComplianceNote: COMPLIANCE_NOTE,
    },
  };

  const fallback: MarketingAiOutput = {
    summary: `Mock output for ${task}${insightType ? ` (${insightType})` : ""}`,
    keyFindings: ["Finding 1", "Finding 2", "Finding 3"],
    recommendedAction: "Review and validate with source URLs",
    confidenceScore: 0.65,
    riskComplianceNote: COMPLIANCE_NOTE,
  };

  return byTask[task] ?? fallback;
}

export async function runMarketingAiTask(
  task: MarketingAiTask,
  context: Record<string, string>,
  insightType?: MarketingInsightType,
  businessId?: string | null,
): Promise<MarketingAiOutput> {
  buildPrompt(task, context);
  if (isMarketingAiMock()) {
    await new Promise((r) => setTimeout(r, 400));
    return mockAiOutput(task, insightType);
  }

  const { data, error } = await supabase.functions.invoke("marketing-ai", {
    body: {
      task,
      context,
      insight_type: insightType,
      business_id: businessId ?? undefined,
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  const output = data?.output as MarketingAiOutput | undefined;
  if (!output?.summary) throw new Error("marketing_ai_empty_response");
  return output;
}
