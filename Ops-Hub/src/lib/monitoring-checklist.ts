import { ANTHEM_ADMIN, SO1O_ADMIN, anthemAdmin, so1oAdmin } from "@/lib/links";
import { getSupabaseProjectInfo, supabaseDashboardPath } from "@/lib/supabaseProject";

export type MonitorStatus = "live" | "partial" | "manual" | "missing";

export type MonitorCheckItem = {
  id: string;
  label: string;
  description: string;
  status: MonitorStatus;
  automated?: boolean;
  href?: string;
  /** Maps to health probe name for live override */
  healthKey?: string;
};

export type MonitorSite = {
  id: "so1o" | "an1hem" | "ops_hub" | "ecosystem";
  name: string;
  url: string;
  items: MonitorCheckItem[];
};

export const STATUS_LABEL: Record<MonitorStatus, string> = {
  live: "เชื่อมแล้ว",
  partial: "บางส่วน",
  manual: "ตรวจเอง",
  missing: "ยังไม่มี",
};

export const STATUS_STYLE: Record<MonitorStatus, string> = {
  live: "bg-emerald-100 text-emerald-800 border-emerald-200",
  partial: "bg-amber-100 text-amber-900 border-amber-200",
  manual: "bg-sky-100 text-sky-900 border-sky-200",
  missing: "bg-red-100 text-red-800 border-red-200",
};

export function buildMonitorSites(): MonitorSite[] {
  const { projectRef, url } = getSupabaseProjectInfo();
  const billingHref = supabaseDashboardPath(projectRef, "/settings/billing/usage");
  const functionsHref = supabaseDashboardPath(projectRef, "/functions");

  return [
  {
    id: "so1o",
    name: "So1o",
    url: "https://www.solofreelancer.com",
    items: [
      {
        id: "so1o-uptime",
        label: "Uptime (production)",
        description: "www.solofreelancer.com ตอบ HTTP 2xx/3xx",
        status: "live",
        automated: true,
        healthKey: "So1o",
        href: SO1O_ADMIN,
      },
      {
        id: "so1o-smoke",
        label: "Public smoke routes",
        description: "/, /pricing, /auth, /robots.txt, /sitemap.xml — npm run smoke:public",
        status: "partial",
        automated: false,
      },
      {
        id: "so1o-auth",
        label: "Auth & Supabase session",
        description: "Login, PKCE, RLS บน public schema",
        status: "live",
        automated: true,
        healthKey: "Supabase REST",
      },
      {
        id: "so1o-stripe",
        label: "Stripe & Pro subscription",
        description: "Webhook, subscription_tier, payments admin",
        status: "live",
        href: so1oAdmin("payments"),
      },
      {
        id: "so1o-ai",
        label: "AI / Gemini",
        description: "Probe + credits 7d/30d — admin-ai-monitor",
        status: "live",
        automated: true,
        href: so1oAdmin("ai_usage"),
      },
      {
        id: "so1o-line-email",
        label: "LINE & Email notifications",
        description: "line-notify-dispatch, Resend email queue",
        status: "partial",
        href: so1oAdmin("overview"),
      },
      {
        id: "so1o-seo",
        label: "SEO / Lighthouse CI",
        description: "Weekly GitHub Actions seo-lighthouse.yml",
        status: "manual",
      },
      {
        id: "so1o-migrations",
        label: "Migration gate",
        description: "check-migrations-pending.sh ก่อน production deploy",
        status: "live",
      },
      {
        id: "so1o-storage",
        label: "Storage quota per user",
        description: "storageUsage.server.ts + admin usage page",
        status: "live",
        href: so1oAdmin("usage"),
      },
    ],
  },
  {
    id: "an1hem",
    name: "Aplus1",
    url: "https://pixel100.com",
    items: [
      {
        id: "an1hem-uptime",
        label: "Uptime (production)",
        description: "pixel100.com (canonical) / aplus1-demo.vercel.app (demo)",
        status: "live",
        automated: true,
        healthKey: "an1hem",
        href: ANTHEM_ADMIN,
      },
      {
        id: "an1hem-smoke",
        label: "Public smoke routes",
        description: "/, /auth, /jobs, /robots.txt, /sitemap.xml — smoke-public.sh",
        status: "partial",
        automated: false,
      },
      {
        id: "an1hem-moderation",
        label: "Moderation queue (Reports)",
        description: "รายงานเนื้อหา open/reviewing — แอดมินกด approve/strike/ban เอง",
        status: "live",
        automated: true,
        href: anthemAdmin("/reports"),
      },
      {
        id: "an1hem-profanity-auto",
        label: "Profanity auto-strike",
        description: "record_profanity_strike — โทษเบาอัตโนมัติ (strike/ban) ไม่ต้องรอแอดมิน",
        status: "live",
        automated: true,
        href: anthemAdmin("/moderation"),
      },
      {
        id: "an1hem-kyc-ai",
        label: "KYC + AI Pre-review",
        description: "AI สรุปความเสี่ยง + คำแนะนำ — อนุมัติ/ปฏิเสธต้องกดเองเท่านั้น",
        status: "live",
        automated: false,
        href: anthemAdmin("/kyc"),
      },
      {
        id: "an1hem-community",
        label: "Community posts admin",
        description: "ซ่อนโพสต์ Tips/Q&A + profanity hint ฝั่ง user",
        status: "live",
        href: anthemAdmin("/community"),
      },
      {
        id: "an1hem-ai-monitor",
        label: "AI Monitor (admin)",
        description: "Gemini credits, by-feature usage — ไม่อนุมัติแทนคน",
        status: "live",
        href: anthemAdmin("/ai"),
      },
      {
        id: "an1hem-wallet",
        label: "Wallet / Cashout / KYC / AML",
        description: "คิวถอน Pixel, KYC (เอกสาร+AI pre-review), AML — Hub alerts",
        status: "live",
        automated: true,
        href: anthemAdmin("/kyc"),
      },
      {
        id: "an1hem-edge",
        label: "Edge Functions (20+)",
        description: "Deploy ผ่าน supabase functions deploy",
        status: "partial",
        href: functionsHref,
      },
      {
        id: "an1hem-realtime",
        label: "Realtime chat",
        description: "Chat threads + notifications",
        status: "live",
      },
      {
        id: "an1hem-ads",
        label: "Ads mock payment flag",
        description: "payment_settings.mock_topup_enabled ต้องปิดก่อน prod จริง",
        status: "manual",
        href: anthemAdmin("/ads"),
      },
      {
        id: "an1hem-supabase-usage",
        label: "Supabase Usage UI",
        description: "admin-supabase-usage + รวมใน Ops Hub /monitor",
        status: "live",
        automated: true,
      },
    ],
  },
  {
    id: "ops_hub",
    name: "Ops Hub",
    url: "https://so1o-ops-hub.vercel.app",
    items: [
      {
        id: "hub-uptime",
        label: "Uptime",
        description: "so1o-ops-hub.vercel.app health probe",
        status: "live",
        automated: true,
        healthKey: "Ops Hub",
      },
      {
        id: "hub-schema",
        label: "Multi-schema client",
        description: "public / anthem / shared / ops routing",
        status: "live",
        automated: true,
        healthKey: "Supabase REST",
      },
      {
        id: "hub-admin",
        label: "Admin gate",
        description: "has_role('admin') บังคับทุก route",
        status: "live",
      },
      {
        id: "hub-inbox",
        label: "Work queue (5 sources)",
        description: "support_tickets, feature_suggestions, app_feedback, user_reports, ops.issues",
        status: "live",
        href: "/inbox",
      },
      {
        id: "hub-realtime",
        label: "Realtime alert watcher",
        description: "shared.notifications INSERT → invalidate metrics",
        status: "live",
      },
      {
        id: "hub-ai-policy",
        label: "AI-assisted admin policy",
        description: "AI สรุป KYC/reports — อนุมัติต้องกดเอง · profanity auto-strike ยกเว้น",
        status: "live",
        href: "/tracking",
      },
      {
        id: "hub-infra",
        label: "Infra monitor page",
        description: "Vercel + Supabase usage + health รวมศูนย์",
        status: "live",
        automated: true,
        href: "/monitor",
      },
    ],
  },
  {
    id: "ecosystem",
    name: "Ecosystem",
    url: url || "https://supabase.com/dashboard",
    items: [
      {
        id: "eco-supabase",
        label: "Supabase (shared project)",
        description: `${projectRef || "—"} — plan, DB, storage, MAU, backups`,
        status: "live",
        automated: true,
        healthKey: "Supabase REST",
        href: billingHref,
      },
      {
        id: "eco-vercel",
        label: "Vercel (2 projects)",
        description: "aplus1-demo (Aplus1) + solo-demo-liart (So1o)",
        status: "live",
        automated: true,
        href: "https://vercel.com/dashboard",
      },
      {
        id: "eco-health-cron",
        label: "Health check script",
        description: "scripts/health-check.sh — cron ทุก 5 นาทีบน VPS",
        status: "partial",
      },
      {
        id: "eco-uptime-external",
        label: "External uptime (UptimeRobot)",
        description: "Monitor 3 URL แยก — ตั้งเองที่ UptimeRobot/Better Stack",
        status: "manual",
      },
      {
        id: "eco-backup",
        label: "Supabase backup",
        description: "supabase-backup-status.sh + pg_dump cron",
        status: "partial",
      },
      {
        id: "eco-lighthouse",
        label: "Weekly Lighthouse SEO",
        description: "GitHub Actions seo-lighthouse.yml",
        status: "manual",
      },
    ],
  },
  ];
}

/** Checklist with Supabase links from VITE_SUPABASE_* env */
export const MONITOR_SITES: MonitorSite[] = buildMonitorSites();

/** Merge live health probe results into checklist items. */
export function mergeHealthIntoChecklist(
  sites: MonitorSite[],
  health: Array<{ name: string; ok: boolean }> | undefined,
): MonitorSite[] {
  if (!health?.length) return sites;

  const healthMap = new Map(health.map((h) => [h.name, h.ok]));

  return sites.map((site) => ({
    ...site,
    items: site.items.map((item) => {
      if (!item.healthKey || !item.automated) return item;
      const ok = healthMap.get(item.healthKey);
      if (ok === undefined) return item;
      return {
        ...item,
        status: ok ? "live" : ("missing" as MonitorStatus),
      };
    }),
  }));
}
