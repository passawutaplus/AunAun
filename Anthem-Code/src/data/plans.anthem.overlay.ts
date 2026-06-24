import type { Plan as VendoredPlan } from "./plans.vendored";

/** Pixel100-specific copy tweaks applied on top of Solo canonical plans. */
export function applyAnthemPlanOverlay(plans: VendoredPlan[]): VendoredPlan[] {
  return plans.map((plan) => {
    if (plan.id === "free") {
      return {
        ...plan,
        highlights: plan.highlights.map((h) =>
          h === "Job Tracker 3 งาน/เดือน" ? "Job Tracker 3 งาน/เดือน (So1o)" : h,
        ),
      };
    }
    if (plan.id === "inhouse") {
      return {
        ...plan,
        tagline: "สำหรับทีมและบริษัท · คิดรายที่นั่ง (workspace กำลังพัฒนา)",
        highlights: [
          "ทุกอย่างใน Pro",
          "AI 2,000 เครดิต/รอบบิล",
          "So1o 10 GB · Pixel100 8 GB",
          "Multi-user Workspace · Team Roles · Shared Asset Library (เร็วๆ นี้)",
          "Centralized Billing · Priority Support สำหรับทีม",
          "ขั้นต่ำ 2 ที่นั่ง · สูงสุด 50",
        ],
        details: [
          "แบบร่าง Pixel100 100 ชิ้น (vs 50 ใน Pro/Pro+)",
          "ฟีเจอร์ workspace กำลังพัฒนา — สมัครได้แล้ว ฟีเจอร์ทีมจะเปิดใช้เร็วๆ นี้",
        ],
      };
    }
    return plan;
  });
}
