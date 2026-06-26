import type { UpgradeVerdict } from "./supabase-usage.ts";

export type VercelUpgradeAdvice = {
  service: "vercel";
  currentPlan: string;
  verdict: UpgradeVerdict;
  reasons: string[];
  thresholds: Array<{
    metric: string;
    used: number;
    limit: number;
    percent: number;
  }>;
};

export type VercelProjectSnapshot = {
  slug: string;
  label: string;
  prodUrl: string;
  configured: boolean;
  error?: string;
  accountType?: string;
  plan?: string;
  framework?: string;
  latestDeployment?: {
    id: string;
    url: string;
    state: string;
    createdAt: string;
    target: string | null;
  } | null;
  dashboardUrl: string;
};

export type VercelUsageSnapshot = {
  configured: boolean;
  note?: string;
  teamId?: string;
  projects: VercelProjectSnapshot[];
  billing?: {
    periodStart: string;
    periodEnd: string;
    services: Array<{ name: string; usage: number; cost: number }>;
    totalCost: number;
  } | null;
  upgrade_advice: VercelUpgradeAdvice;
  console_links: {
    dashboard: string;
    usage: string;
  };
};

const VERCEL_PROJECTS = [
  { slug: "aplus1-prod", label: "Aplus1", prodUrl: "https://aplus1.app" },
  { slug: "aplus1-demo", label: "Aplus1 demo", prodUrl: "https://aplus1-demo.vercel.app" },
  { slug: "solo-demo", label: "So1o", prodUrl: "https://www.solofreelancer.com" },
] as const;

/** Hobby plan approximate monthly limits (for % estimation when billing API unavailable). */
const HOBBY_LIMITS = {
  bandwidthGb: 100,
  serverlessGbHours: 100,
};

async function vercelFetch(path: string, token: string, teamId?: string) {
  const url = new URL(`https://api.vercel.com${path}`);
  if (teamId) url.searchParams.set("teamId", teamId);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  return { ok: res.ok, status: res.status, body };
}

function buildVercelUpgradeAdvice(
  projects: VercelProjectSnapshot[],
  accountType: string | undefined,
  billingTotal: number | null,
): VercelUpgradeAdvice {
  const reasons: string[] = [];
  let verdict: UpgradeVerdict = "ok";
  const thresholds: VercelUpgradeAdvice["thresholds"] = [];
  const plan = accountType ?? "unknown";

  const soloProject = projects.find((p) => p.label === "So1o");
  const hasFailedDeploy = projects.some((p) => p.latestDeployment?.state === "ERROR");

  if (plan === "hobby" || plan === "free") {
    reasons.push("Vercel Hobby — ไม่มี spend management และอาจ pause เมื่อเกิน quota");
    if (soloProject) {
      reasons.push("So1o ใช้ SSR บน Vercel — ใช้ serverless มากกว่า static SPA (Aplus1)");
      verdict = "watch";
    }
  }

  if (hasFailedDeploy) {
    reasons.push("มี deployment ล่าสุดที่ ERROR — ตรวจ Vercel dashboard");
    if (verdict === "ok") verdict = "watch";
  }

  if (billingTotal != null && billingTotal > 15) {
    reasons.push(
      `ค่าใช้จ่าย billing period นี้ ~$${billingTotal.toFixed(2)} — พิจารณา Pro ($20 credit)`,
    );
    verdict = "upgrade_recommended";
  }

  if (plan === "pro" || plan === "enterprise") {
    reasons.push(`Plan ${plan} — มี included credit และ spend management`);
    if (verdict === "ok") verdict = "ok";
  }

  if (reasons.length === 0) {
    reasons.push("Vercel usage ยังอยู่ในเกณฑ์ปกติ");
  }

  thresholds.push({
    metric: "Bandwidth (Hobby ref)",
    used: 0,
    limit: HOBBY_LIMITS.bandwidthGb * 1024 ** 3,
    percent: 0,
  });

  return {
    service: "vercel",
    currentPlan: plan,
    verdict,
    reasons,
    thresholds,
  };
}

export async function fetchVercelUsage(): Promise<VercelUsageSnapshot> {
  const token = Deno.env.get("VERCEL_TOKEN")?.trim() ?? "";
  const teamId = Deno.env.get("VERCEL_TEAM_ID")?.trim() || undefined;

  if (!token) {
    return {
      configured: false,
      note: "ตั้ง VERCEL_TOKEN ใน Edge Function secrets เพื่อดู project status และ billing",
      projects: VERCEL_PROJECTS.map((p) => ({
        slug: p.slug,
        label: p.label,
        prodUrl: p.prodUrl,
        configured: false,
        dashboardUrl: `https://vercel.com/dashboard`,
      })),
      billing: null,
      upgrade_advice: {
        service: "vercel",
        currentPlan: "unknown",
        verdict: "watch",
        reasons: ["ยังไม่ได้ตั้ง VERCEL_TOKEN — ดู usage ที่ Vercel Dashboard ด้วยตนเอง"],
        thresholds: [],
      },
      console_links: {
        dashboard: "https://vercel.com/dashboard",
        usage: "https://vercel.com/account/usage",
      },
    };
  }

  let accountType: string | undefined;
  const userRes = await vercelFetch("/v2/user", token);
  if (userRes.ok) {
    const u = userRes.body as { user?: { billing?: { plan?: string } } };
    accountType = u.user?.billing?.plan;
  }

  const projects: VercelProjectSnapshot[] = await Promise.all(
    VERCEL_PROJECTS.map(async (cfg) => {
      const projRes = await vercelFetch(`/v9/projects/${cfg.slug}`, token, teamId);
      if (!projRes.ok) {
        return {
          slug: cfg.slug,
          label: cfg.label,
          prodUrl: cfg.prodUrl,
          configured: true,
          error: `project fetch ${projRes.status}`,
          dashboardUrl: `https://vercel.com/dashboard`,
        };
      }

      const proj = projRes.body as {
        accountId?: string;
        framework?: string;
        latestDeployments?: Array<{
          uid: string;
          url: string;
          state: string;
          createdAt: number;
          target: string | null;
        }>;
      };

      const latest = proj.latestDeployments?.[0];
      return {
        slug: cfg.slug,
        label: cfg.label,
        prodUrl: cfg.prodUrl,
        configured: true,
        accountType,
        plan: accountType,
        framework: proj.framework,
        latestDeployment: latest
          ? {
              id: latest.uid,
              url: `https://${latest.url}`,
              state: latest.state,
              createdAt: new Date(latest.createdAt).toISOString(),
              target: latest.target,
            }
          : null,
        dashboardUrl: `https://vercel.com/${cfg.slug}`,
      };
    }),
  );

  let billing: VercelUsageSnapshot["billing"] = null;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  if (teamId) {
    const from = monthStart.toISOString();
    const to = now.toISOString();
    try {
      const billingRes = await fetch(
        `https://api.vercel.com/v1/billing/charges?teamId=${encodeURIComponent(teamId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (billingRes.ok) {
        const text = await billingRes.text();
        const lines = text.trim().split("\n").filter(Boolean);
        let totalCost = 0;
        const serviceMap = new Map<string, { usage: number; cost: number }>();
        for (const line of lines) {
          try {
            const row = JSON.parse(line) as {
              ChargeCategory?: string;
              BilledCost?: number;
              ConsumedQuantity?: number;
              ServiceName?: string;
            };
            if (row.ChargeCategory === "Usage" && row.ServiceName) {
              const cur = serviceMap.get(row.ServiceName) ?? { usage: 0, cost: 0 };
              cur.usage += row.ConsumedQuantity ?? 0;
              cur.cost += row.BilledCost ?? 0;
              serviceMap.set(row.ServiceName, cur);
              totalCost += row.BilledCost ?? 0;
            }
          } catch {
            /* skip malformed line */
          }
        }
        billing = {
          periodStart: from,
          periodEnd: to,
          services: [...serviceMap.entries()].map(([name, v]) => ({
            name,
            usage: v.usage,
            cost: v.cost,
          })),
          totalCost,
        };
      }
    } catch {
      /* billing API optional */
    }
  }

  const upgradeAdvice = buildVercelUpgradeAdvice(projects, accountType, billing?.totalCost ?? null);

  return {
    configured: true,
    teamId,
    projects,
    billing,
    upgrade_advice: upgradeAdvice,
    console_links: {
      dashboard: "https://vercel.com/dashboard",
      usage: teamId
        ? `https://vercel.com/teams/${teamId}/settings/billing`
        : "https://vercel.com/account/usage",
    },
  };
}
