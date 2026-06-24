import type { AiBriefExtractResult } from "@/lib/briefExtractTypes";

export type QualityGateResult = {
  score: number;
  issues: string[];
  shouldRetry: boolean;
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function meetingQualityGate(
  result: AiBriefExtractResult,
  transcript: string,
): QualityGateResult {
  const issues: string[] = [];
  let score = 1;

  if (!result.deliverables.length) {
    issues.push("ไม่พบ deliverables");
    score -= 0.5;
  }

  if (!result.proposition.trim() && !result.goal.trim()) {
    issues.push("ไม่พบโจทย์หรือเป้าหมาย");
    score -= 0.4;
  }

  const tx = norm(transcript);
  const budget = norm(result.budget);
  if (budget && budget !== "ยังไม่ระบุ" && !tx.includes(budget.replace(/[^\d]/g, "").slice(0, 4))) {
    issues.push("งบประมาณอาจถูกประมาณจากบริบท");
    score -= 0.15;
  }

  const brand = norm(result.client.brand || result.client.name);
  if (brand && brand.length >= 2 && !tx.includes(brand.slice(0, Math.min(brand.length, 6)))) {
    issues.push("ชื่อลูกค้า/แบรนด์อาจไม่ตรง transcript");
    score -= 0.1;
  }

  score = Math.max(0, Math.min(1, score));
  const shouldRetry = !result.deliverables.length;

  return { score, issues, shouldRetry };
}
