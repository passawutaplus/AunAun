import type { DashSection } from "@/components/dashboard/layout/DashboardSidebar";

export type ProductTourTarget =
  | { kind: "dashboard"; tab: DashSection; sub?: string }
  | { kind: "labs"; to: "/labs" | "/labs/creative" | "/labs/doc" };

export type ProductTourStep = {
  id: string;
  feature: string;
  target: ProductTourTarget;
};

/** ลำดับทัวร์ — ครบทุกหมวดใน Solo */
export const PRODUCT_TOUR_STEPS: ProductTourStep[] = [
  { id: "overview", feature: "overview", target: { kind: "dashboard", tab: "overview" } },
  { id: "home", feature: "home", target: { kind: "dashboard", tab: "home" } },
  { id: "pipeline", feature: "pipeline", target: { kind: "dashboard", tab: "finance", sub: "pipeline" } },
  { id: "meeting", feature: "meeting", target: { kind: "dashboard", tab: "planner", sub: "meetings" } },
  { id: "brief", feature: "smart-brief", target: { kind: "dashboard", tab: "planner", sub: "briefs" } },
  {
    id: "quotation",
    feature: "ใบเสนอราคา",
    target: { kind: "dashboard", tab: "finance", sub: "quotations" },
  },
  { id: "jobs", feature: "job-tracker", target: { kind: "dashboard", tab: "finance", sub: "jobs" } },
  { id: "income", feature: "income", target: { kind: "dashboard", tab: "finance", sub: "income" } },
  { id: "tax", feature: "tax", target: { kind: "dashboard", tab: "finance", sub: "tax" } },
  { id: "subs", feature: "subscriptions", target: { kind: "dashboard", tab: "finance", sub: "subs" } },
  { id: "content", feature: "content", target: { kind: "dashboard", tab: "planner", sub: "content" } },
  { id: "todo", feature: "To Do List", target: { kind: "dashboard", tab: "planner", sub: "projects" } },
  { id: "feedback", feature: "Feedback", target: { kind: "dashboard", tab: "planner", sub: "feedback" } },
  { id: "portfolio", feature: "portfolio", target: { kind: "dashboard", tab: "mydata", sub: "portfolio" } },
  { id: "clients", feature: "ลูกค้า", target: { kind: "dashboard", tab: "mydata", sub: "clients" } },
  { id: "suppliers", feature: "Suppliers", target: { kind: "dashboard", tab: "mydata", sub: "suppliers" } },
  { id: "assets", feature: "assets", target: { kind: "dashboard", tab: "mydata", sub: "assets" } },
  { id: "legal", feature: "legal-desk", target: { kind: "dashboard", tab: "mydata", sub: "legal" } },
  { id: "labs", feature: "labs", target: { kind: "labs", to: "/labs" } },
  { id: "settings", feature: "settings", target: { kind: "dashboard", tab: "settings" } },
];

export const PRODUCT_TOUR_SESSION_KEY = "so1o.productTour.step";

export function getTourStepIndex(stepId: string): number {
  return PRODUCT_TOUR_STEPS.findIndex((s) => s.id === stepId);
}

export function readTourResumeIndex(): number | null {
  try {
    const raw = sessionStorage.getItem(PRODUCT_TOUR_SESSION_KEY);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && n < PRODUCT_TOUR_STEPS.length ? n : null;
  } catch {
    return null;
  }
}

export function writeTourResumeIndex(index: number | null): void {
  try {
    if (index == null) sessionStorage.removeItem(PRODUCT_TOUR_SESSION_KEY);
    else sessionStorage.setItem(PRODUCT_TOUR_SESSION_KEY, String(index));
  } catch {
    /* noop */
  }
}

export function tourFlags(data: Record<string, unknown> | undefined | null) {
  const d = data ?? {};
  return {
    completed: !!d.product_tour_completed,
    skipped: !!d.product_tour_skipped,
    welcomed: !!d.product_tour_welcomed,
  };
}
