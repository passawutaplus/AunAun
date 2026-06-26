/**
 * AI credit weights per feature — keep in sync with `public.ai_feature_costs`
 * and migration `20260609160000_ai_credit_weights_v2.sql`.
 */
export const AI_FEATURE_CREDITS = {
  ai_assistant_mentor: 1,
  ai_assistant_copy: 1,
  ai_assistant_legal: 2,
  ai_assistant_business: 5,
  planner_ai_assist: 2,
  color_mentor: 2,
  ai_price_suggest: 2,
  ai_design_chat: 1,
  generate_contract: 8,
  ai_brief_extract: 10,
  ai_brief_from_images: 8,
  ai_meeting_transcribe_15: 3,
  ai_meeting_transcribe_30: 4,
  ai_meeting_transcribe_45: 5,
  ai_meeting_transcribe_60: 6,
  ai_meeting_brief_extract_15: 9,
  ai_meeting_brief_extract_30: 14,
  ai_meeting_brief_extract_45: 19,
  ai_meeting_brief_extract_60: 24,
  ai_meeting_report_15: 5,
  ai_meeting_report_30: 7,
  ai_meeting_report_45: 9,
  ai_meeting_report_60: 10,
  anthem_portfolio_copy: 2,
  anthem_portfolio_from_images: 8,
  anthem_chat_draft: 1,
  anthem_brief_from_chat: 10,
  anthem_assistant_mentor: 1,
  design_drill_reroll: 1,
} as const;

export type AiFeatureKey = keyof typeof AI_FEATURE_CREDITS;

export const AI_FEATURE_LABELS: Record<AiFeatureKey, string> = {
  ai_assistant_mentor: "So1o Assistant — Mentor (เว็บ + LINE)",
  ai_assistant_copy: "So1o Assistant — Copywriter",
  ai_assistant_legal: "So1o Assistant — Legal",
  ai_assistant_business: "So1o Assistant — ธุรกิจ",
  planner_ai_assist: "Content Planner AI",
  color_mentor: "Color Mentor",
  ai_price_suggest: "AI แนะนำราคา",
  ai_design_chat: "AI Design Chat (legacy)",
  generate_contract: "สร้างสัญญา AI",
  ai_brief_extract: "Smart Brief — Quick Capture",
  ai_brief_from_images: "Smart Brief — วิเคราะห์รูป",
  ai_meeting_transcribe_15: "จดประชุม AI — ถอดเสียง ≤15 นาที",
  ai_meeting_transcribe_30: "จดประชุม AI — ถอดเสียง ≤30 นาที",
  ai_meeting_transcribe_45: "จดประชุม AI — ถอดเสียง ≤45 นาที",
  ai_meeting_transcribe_60: "จดประชุม AI — ถอดเสียง ≤60 นาที",
  ai_meeting_brief_extract_15: "จดประชุม AI — สรุปบรีฟ ≤15 นาที",
  ai_meeting_brief_extract_30: "จดประชุม AI — สรุปบรีฟ ≤30 นาที",
  ai_meeting_brief_extract_45: "จดประชุม AI — สรุปบรีฟ ≤45 นาที",
  ai_meeting_brief_extract_60: "Meeting — สรุปบรีฟ ≤60 นาที",
  ai_meeting_report_15: "Meeting — สรุปรายงาน ≤15 นาที",
  ai_meeting_report_30: "Meeting — สรุปรายงาน ≤30 นาที",
  ai_meeting_report_45: "Meeting — สรุปรายงาน ≤45 นาที",
  ai_meeting_report_60: "Meeting — สรุปรายงาน ≤60 นาที",
  anthem_portfolio_copy: "Aplus1 — เขียนผลงาน",
  anthem_portfolio_from_images: "Aplus1 — AI ช่วยลงผลงาน",
  anthem_chat_draft: "Aplus1 — ร่างตอบแชท",
  anthem_brief_from_chat: "Aplus1 — สรุปบรีฟจากแชท",
  anthem_assistant_mentor: "Aplus1 AI Mentor",
  design_drill_reroll: "Design Drill — สุ่มโจทย์ใหม่",
};

/** สมมติฐาน mix การใช้งานเฉลี่ย (ปรับจาก ledger จริงเมื่อมีข้อมูล) */
export const USAGE_MIX_ASSUMPTION: Partial<Record<AiFeatureKey, number>> = {
  ai_assistant_mentor: 0.6,
  ai_assistant_business: 0.25,
  planner_ai_assist: 0.1,
  ai_brief_extract: 0.05,
};

export function getFeatureCreditCost(feature: string): number {
  return AI_FEATURE_CREDITS[feature as AiFeatureKey] ?? 1;
}

/** เครดิตเฉลี่ยต่อ 1 ครั้งกดใช้ ตาม mix */
export function weightedCreditsPerAction(
  mix: Partial<Record<AiFeatureKey, number>> = USAGE_MIX_ASSUMPTION,
): number {
  const totalWeight = Object.values(mix).reduce((s, w) => s + (w ?? 0), 0);
  if (totalWeight <= 0) return 1;
  let sum = 0;
  for (const [feature, weight] of Object.entries(mix)) {
    const cost = AI_FEATURE_CREDITS[feature as AiFeatureKey] ?? 1;
    sum += (weight ?? 0) * cost;
  }
  return sum / totalWeight;
}

/** ประมาณจำนวนครั้งใช้งานจากแพ็กเครดิต */
export function estimateActionsFromCredits(
  credits: number,
  mix?: Partial<Record<AiFeatureKey, number>>,
): number {
  const perAction = weightedCreditsPerAction(mix);
  return Math.floor(credits / perAction);
}

/** ตารางสำหรับหน้า pricing — เรียงจากถูกไปแพง */
export const AI_CREDIT_TABLE = (Object.entries(AI_FEATURE_CREDITS) as [AiFeatureKey, number][])
  .filter(([k]) => k !== "ai_design_chat")
  .sort((a, b) => a[1] - b[1])
  .map(([feature, credits]) => ({
    feature,
    credits,
    label: AI_FEATURE_LABELS[feature],
  }));

/** สรุป margin ต่อแพ็ก top-up (ราคาเดิม ไม่เปลี่ยน) */
export const TOPUP_PACK_ANALYSIS = [
  { id: "credits_100", amount: 99, credits: 100 },
  { id: "credits_500", amount: 399, credits: 500 },
  { id: "credits_2000", amount: 1290, credits: 2000 },
].map((pack) => ({
  ...pack,
  perCreditThb: pack.amount / pack.credits,
  estActions: estimateActionsFromCredits(pack.credits),
}));
