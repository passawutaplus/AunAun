/** Pure ops decisions (phase 09): link health, daily report, alerts. No I/O here, so it is cheap to test. */

export const HEALTH_HIDE_AFTER = 3; // consecutive failed weekly checks before an item is hidden
export const SOURCE_DOWN_DAYS = 2; // a source with no successful publish for this many days while enabled = "down"

export type HealthDecision = { failCount: number; hide: boolean; restore: boolean };

/**
 * One link-health check result -> next counters.
 * - ok: counter resets; an item that was hidden BY health checks comes back.
 * - fail: counter +1; at HEALTH_HIDE_AFTER consecutive failures the item is hidden.
 */
export function healthDecision(prevFailCount: number, ok: boolean, hiddenByHealth: boolean, hideAfter = HEALTH_HIDE_AFTER): HealthDecision {
  if (ok) return { failCount: 0, hide: false, restore: hiddenByHealth };
  const failCount = prevFailCount + 1;
  return { failCount, hide: failCount >= hideAfter, restore: false };
}

export type DailyStats = {
  day: string;
  fetched: number;
  published: number;
  review: number;
  rejected: Record<string, number>;
  hidden: number;
  failures: { job: string; error: string }[];
  aiCostUsd: number;
  aiCalls: number;
  monthUsd: number;
  monthlyBudgetUsd: number;
  capsReached: string[];
  killSwitch: boolean;
  failingSources: string[];
  topUnknownTerms: { term: string; lang: string; count: number }[];
  dsarDue: { id: string; due_at: string }[];
  reviewQueue: number;
  openReports: number;
  userAiUsage?: { users: number; calls: number };
  /** Weekly learning digest (phase 10), present on Mondays when LEARN_CAPTURE is on. */
  learning?: LearningDigest;
};

export type LearningDigest = {
  searches: number;
  top_queries: { query_text: string; n: number }[];
  zero_result_queries: { query_text: string; n: number }[];
  relaxed_queries: { query_text: string; n: number }[];
  reformulations: { first_query: string; then_query: string; n: number }[];
  unknown_words: { lang: string; term: string; count: number }[];
  sources: { source: string; views: number; saves: number; opens: number; reports: number }[];
  saved_but_thin: { id: string; title: string; saves: number; tags: number }[];
  relax_rate: number | null;
  zero_rate: number | null;
};

export type Alert = { severity: "urgent" | "warn"; text: string };

/** Urgent alerts only for real problems: cap reached, source down for days, kill switch on, DSAR overdue. */
export function alertsFor(s: DailyStats, now = new Date()): Alert[] {
  const out: Alert[] = [];
  if (s.killSwitch) out.push({ severity: "urgent", text: "Kill switch is ON: seeding, AI and email are stopped." });
  for (const cap of s.capsReached) out.push({ severity: "urgent", text: `Cap reached: ${cap}.` });
  for (const src of s.failingSources) out.push({ severity: "urgent", text: `Source ${src} has produced nothing for ${SOURCE_DOWN_DAYS}+ days.` });
  for (const d of s.dsarDue) if (new Date(d.due_at).getTime() < now.getTime()) out.push({ severity: "urgent", text: `Data request ${d.id} is overdue.` });
  if (s.monthlyBudgetUsd > 0 && s.monthUsd / s.monthlyBudgetUsd >= 0.8 && !s.capsReached.includes("monthly_budget")) out.push({ severity: "warn", text: `AI spend at ${Math.round((s.monthUsd / s.monthlyBudgetUsd) * 100)}% of the monthly budget.` });
  if (s.openReports > 0) out.push({ severity: "warn", text: `${s.openReports} open image report(s) to review.` });
  return out;
}

const n = (v: number) => String(Math.round(v));

/** Plain-text report (also the email body). Thai labels, short, one screen. */
export function formatReportText(s: DailyStats, alerts: Alert[]): string {
  const rejectedTotal = Object.values(s.rejected).reduce((a, b) => a + b, 0);
  const reasons = Object.entries(s.rejected).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ");
  const lines = [
    `A+ Vault รายงานประจำวัน ${s.day}`,
    ...(alerts.length ? ["", ...alerts.map(a => `${a.severity === "urgent" ? "[ด่วน]" : "[เฝ้าดู]"} ${a.text}`)] : ["", "ไม่มีเรื่องด่วน"]),
    "",
    `ดึงมา ${n(s.fetched)} · เผยแพร่ ${n(s.published)} · รอตรวจ ${n(s.review)} · ปฏิเสธ ${n(rejectedTotal)}${reasons ? ` (${reasons})` : ""} · ซ่อน ${n(s.hidden)}`,
    `ค่า AI วันนี้ ~$${s.aiCostUsd.toFixed(3)} (${n(s.aiCalls)} ครั้ง) · เดือนนี้ $${s.monthUsd.toFixed(2)} / $${s.monthlyBudgetUsd}`,
    ...(s.userAiUsage ? [`AI ของผู้ใช้เดือนนี้ ${n(s.userAiUsage.calls)} ครั้ง จาก ${n(s.userAiUsage.users)} คน`] : []),
    `คิวตรวจ ${n(s.reviewQueue)} · รายงานภาพค้าง ${n(s.openReports)}`,
  ];
  if (s.failures.length) lines.push("", "งานที่พลาด:", ...s.failures.slice(0, 5).map(f => `- ${f.job}: ${f.error.slice(0, 100)}`));
  if (s.topUnknownTerms.length) lines.push("", "คำค้นที่ระบบยังไม่รู้จัก:", ...s.topUnknownTerms.slice(0, 8).map(t => `- ${t.term} (${t.lang}) x${t.count}`));
  if (s.learning) {
    const l = s.learning;
    lines.push("", `สรุปการเรียนรู้รายสัปดาห์ (${l.searches} การค้นหา, ไม่ผูกกับตัวผู้ใช้):`);
    if (l.top_queries.length) lines.push("คำค้นยอดนิยม: " + l.top_queries.slice(0, 5).map(q => `${q.query_text} x${q.n}`).join(" | "));
    if (l.zero_result_queries.length) lines.push("ไม่เจอผลลัพธ์: " + l.zero_result_queries.slice(0, 5).map(q => `${q.query_text} x${q.n}`).join(" | "));
    if (l.reformulations.length) lines.push("ค้นซ้ำใน 60 วินาที (น่าจะพลาด): " + l.reformulations.slice(0, 3).map(r => `${r.first_query} -> ${r.then_query}`).join(" | "));
    if (l.sources.length) lines.push("แหล่ง (ดู/เซฟ/รายงาน): " + l.sources.map(x => `${x.source} ${x.views}/${x.saves}/${x.reports}`).join(" · "));
    if (l.saved_but_thin.length) lines.push("เซฟบ่อยแต่แท็กน้อย: " + l.saved_but_thin.slice(0, 3).map(t => t.title).join(" | "));
  }
  if (s.dsarDue.length) lines.push("", "คำขอข้อมูลส่วนบุคคลที่ใกล้ครบกำหนด:", ...s.dsarDue.slice(0, 5).map(d => `- ${d.id} ครบ ${d.due_at.slice(0, 10)}`));
  return lines.join("\n");
}

/** Sources that are enabled but have published nothing for `days` days. `lastPublished` maps source -> ISO or null. */
export function failingSources(enabled: string[], lastPublished: Record<string, string | null>, now = new Date(), days = SOURCE_DOWN_DAYS): string[] {
  const cutoff = now.getTime() - days * 86400000;
  return enabled.filter(src => {
    const t = lastPublished[src] ? new Date(lastPublished[src] as string).getTime() : 0;
    return t < cutoff;
  });
}
