/** Client-side mirror of public.report_ai_triage — for rows before migration/backfill. */

export type ReportTriageInput = {
  reason: string;
  target_type: string;
  details?: string | null;
  evidence_count?: number;
};

export type ReportTriageResult = {
  priority_score: number;
  summary: string;
  recommendation: "urgent" | "review" | "routine";
};

export function triageReport(input: ReportTriageInput): ReportTriageResult {
  const reason = input.reason || "other";
  const details = (input.details ?? "").trim();
  const ev = input.evidence_count ?? 0;

  let score = (
    {
      scam: 45,
      harassment: 40,
      impersonation: 35,
      nsfw: 30,
      copyright: 25,
      spam: 15,
    } as Record<string, number>
  )[reason] ?? 10;

  if (ev > 0) score += Math.min(15, ev * 5);
  if (details.length > 100) score += 5;
  if (details.length > 300) score += 5;
  if (
    ["message", "comment", "community_comment"].includes(input.target_type) &&
    reason === "harassment"
  ) {
    score += 10;
  }

  const priority_score = Math.min(100, score);

  let summary: string;
  switch (reason) {
    case "scam":
      summary =
        priority_score >= 70
          ? `รายงานหลอกลวง — ควรตรวจสอบด่วน${ev > 0 ? ` (มีหลักฐานแนบ ${ev} ไฟล์)` : ""}`
          : "รายงานหลอกลวง — ตรวจรายละเอียดและหลักฐาน";
      break;
    case "harassment":
      summary = "รายงานคุกคาม/คุกคาม — ตรวจเนื้อหาและพิจารณา strike/ban";
      break;
    case "copyright":
      summary = "รายงานลิขสิทธิ์ — ตรวจ license ของผลงานและหลักฐาน";
      break;
    case "impersonation":
      summary = "รายงานแอบอ้างตัวตน — เปรียบเทียบโปรไฟล์และเนื้อหา";
      break;
    case "nsfw":
      summary = "เนื้อหาไม่เหมาะสม — ตรวจภาพ/ข้อความตามนโยบายชุมชน";
      break;
    case "spam":
      summary = "รายงานสแปม — โทษเบา (strike) อาจเหมาะ แต่ต้องกดเอง";
      break;
    default:
      summary = "รายงานทั่วไป — อ่านรายละเอียดแล้วตัดสินใจ";
  }

  const recommendation: ReportTriageResult["recommendation"] =
    priority_score >= 70 ? "urgent" : priority_score >= 45 ? "review" : "routine";

  return { priority_score, summary, recommendation };
}

export const KYC_HIGH_RISK_THRESHOLD = 40;

export function kycRiskTone(score: number | null | undefined): "low" | "medium" | "high" {
  if (score == null) return "medium";
  if (score <= 15) return "low";
  if (score <= KYC_HIGH_RISK_THRESHOLD) return "medium";
  return "high";
}

export const REPORT_REC_LABEL: Record<string, string> = {
  urgent: "ด่วน",
  review: "ควรตรวจ",
  routine: "ปกติ",
};

export const KYC_REC_LABEL: Record<string, string> = {
  approve: "แนะนำอนุมัติ",
  review: "ควรตรวจสอบ",
  reject_or_review: "ความเสี่ยงสูง",
};
