export type UpgradeVerdict = "ok" | "watch" | "upgrade_recommended" | "upgrade_required";

export type UpgradeAdvice = {
  service: "supabase" | "vercel";
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

export type HealthProbeResult = {
  name: string;
  url: string;
  status: number;
  latencyMs: number;
  ok: boolean;
};

export type SupabaseUsageData = {
  generated_at: string;
  project_ref: string;
  latency_ms: number;
  platform: {
    managementConfigured?: boolean;
    managementNote?: string;
    project?: {
      name: string;
      ref: string;
      status: string;
      region: string;
    } | null;
    organization?: {
      name: string;
      plan: string;
      planLabel: string;
    } | null;
    limits?: {
      databaseGb: number;
      storageGb: number;
      mau?: number;
    };
    database?: {
      bytes: number;
      percentOfLimit: number | null;
    };
    backups?: {
      count: number;
      pitrEnabled: boolean;
    };
    apiUsage7d?: {
      rest: number;
      auth: number;
      storage: number;
      realtime: number;
      total: number;
      daily: Array<{
        date: string;
        rest: number;
        auth: number;
        storage: number;
        realtime: number;
      }>;
    } | null;
    apiUsageError?: string;
  };
  storage: {
    total_bytes: number;
    buckets: Array<{ name: string; objects: number; bytes: number; truncated: boolean }>;
  };
  counts: {
    profiles: number;
    auth_users: number | null;
    projects: number;
    messages: number;
  };
  top_tables: Array<{ schema: string; table: string; rows: number }>;
  console_links: {
    dashboard: string;
    usage: string;
    storage: string;
    backups: string;
    functions: string;
    logs: string;
  };
  upgrade_advice: UpgradeAdvice;
};

export type VercelProjectSnapshot = {
  slug: string;
  label: string;
  prodUrl: string;
  configured: boolean;
  error?: string;
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

export type VercelUsageData = {
  configured: boolean;
  note?: string;
  projects: VercelProjectSnapshot[];
  billing?: {
    periodStart: string;
    periodEnd: string;
    services: Array<{ name: string; usage: number; cost: number }>;
    totalCost: number;
  } | null;
  upgrade_advice: UpgradeAdvice;
  console_links: {
    dashboard: string;
    usage: string;
  };
};

export type AiSummaryData = {
  gemini: {
    configured: boolean;
    reachable: boolean;
    error?: string;
    modelFast: string;
    modelDefault: string;
  };
  summary: {
    creditsDebited7d: number;
    estCostThb7d: number;
    creditsDebited30d: number;
    estCostThb30d: number;
  };
};

export type InfraMonitorResponse = {
  generated_at: string;
  health: HealthProbeResult[];
  supabase: SupabaseUsageData;
  vercel: VercelUsageData;
  ai: AiSummaryData;
  upgrade_advice: UpgradeAdvice[];
  overall_verdict: UpgradeVerdict;
};

export const VERDICT_LABEL: Record<UpgradeVerdict, string> = {
  ok: "ปกติ",
  watch: "ควรจับตา",
  upgrade_recommended: "แนะนำอัปเกรด Pro",
  upgrade_required: "ควรอัปเกรดด่วน",
};

export const VERDICT_STYLE: Record<UpgradeVerdict, string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
  watch: "border-amber-200 bg-amber-50 text-amber-950",
  upgrade_recommended: "border-orange-200 bg-orange-50 text-orange-950",
  upgrade_required: "border-red-200 bg-red-50 text-red-950",
};
