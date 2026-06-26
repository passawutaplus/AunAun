import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const PROJECT_REF = Deno.env.get("SUPABASE_PROJECT_REF") ?? "zkflkpbmbozrchqncpzi";
const MGMT = "https://api.supabase.com/v1";

export const PLAN_LIMITS: Record<
  string,
  { dbGb: number; storageGb: number; mau: number; label: string }
> = {
  free: { dbGb: 0.5, storageGb: 1, mau: 50_000, label: "Free" },
  pro: { dbGb: 8, storageGb: 100, mau: 100_000, label: "Pro" },
  team: { dbGb: 8, storageGb: 100, mau: 100_000, label: "Team" },
  enterprise: { dbGb: 8, storageGb: 100, mau: 100_000, label: "Enterprise" },
};

export type UpgradeVerdict = "ok" | "watch" | "upgrade_recommended" | "upgrade_required";

export type UpgradeAdvice = {
  service: "supabase";
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

export type SupabaseUsageSnapshot = {
  generated_at: string;
  project_ref: string;
  latency_ms: number;
  platform: Record<string, unknown>;
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

export function getMgmtToken(): string {
  return (
    Deno.env.get("MGMT_ACCESS_TOKEN")?.trim() ?? Deno.env.get("SUPABASE_ACCESS_TOKEN")?.trim() ?? ""
  );
}

async function mgmtGet(path: string, token: string) {
  const res = await fetch(`${MGMT}${path}`, {
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

async function mgmtQuery(token: string, query: string) {
  const res = await fetch(`${MGMT}/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
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

type ApiCountRow = {
  timestamp: string;
  total_auth_requests: number;
  total_realtime_requests: number;
  total_rest_requests: number;
  total_storage_requests: number;
};

async function fetchApiCounts(
  token: string,
  days: number,
): Promise<{
  rows: ApiCountRow[];
  error?: string;
}> {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);

  const paths = [
    `/projects/${PROJECT_REF}/analytics/endpoints/usage.api-counts?interval=1d&start=${start.toISOString()}&end=${end.toISOString()}`,
    `/projects/${PROJECT_REF}/endpoints/usage.api-counts?interval=1d`,
  ];

  for (const path of paths) {
    const { ok, body } = await mgmtGet(path, token);
    if (!ok) continue;
    const data = body as { result?: ApiCountRow[] };
    if (Array.isArray(data?.result)) return { rows: data.result };
  }

  return { rows: [], error: "usage API unavailable" };
}

async function sumStorageBytes(admin: SupabaseClient): Promise<{
  buckets: Array<{ name: string; objects: number; bytes: number; truncated: boolean }>;
  totalBytes: number;
}> {
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error || !buckets?.length) {
    return { buckets: [], totalBytes: 0 };
  }

  const out: Array<{ name: string; objects: number; bytes: number; truncated: boolean }> = [];
  let totalBytes = 0;

  for (const bucket of buckets) {
    let bytes = 0;
    let objects = 0;
    let truncated = false;
    const queue: string[] = [""];

    while (queue.length > 0 && objects < 5000) {
      const prefix = queue.shift()!;
      const { data: items } = await admin.storage.from(bucket.name).list(prefix, {
        limit: 200,
        sortBy: { column: "name", order: "asc" },
      });
      if (!items?.length) continue;

      for (const item of items) {
        if (item.id === null && item.metadata === null) {
          queue.push(prefix ? `${prefix}/${item.name}` : item.name);
          continue;
        }
        objects += 1;
        bytes += item.metadata?.size ?? 0;
        if (objects >= 5000) {
          truncated = true;
          break;
        }
      }
      if ((items?.length ?? 0) >= 200) truncated = true;
    }

    out.push({ name: bucket.name, objects, bytes, truncated });
    totalBytes += bytes;
  }

  return { buckets: out, totalBytes };
}

async function probeLatency(admin: SupabaseClient): Promise<number> {
  const t0 = performance.now();
  await admin.from("profiles").select("user_id", { count: "exact", head: true });
  return Math.round(performance.now() - t0);
}

export function buildSupabaseUpgradeAdvice(input: {
  plan: string;
  dbBytes: number;
  storageBytes: number;
  authUsers: number | null;
  backupCount: number;
}): UpgradeAdvice {
  const limits = PLAN_LIMITS[input.plan] ?? PLAN_LIMITS.free;
  const thresholds: UpgradeAdvice["thresholds"] = [];
  const reasons: string[] = [];
  let verdict: UpgradeVerdict = "ok";

  const dbLimitBytes = limits.dbGb * 1024 ** 3;
  const dbPercent = dbLimitBytes > 0 ? (input.dbBytes / dbLimitBytes) * 100 : 0;
  thresholds.push({
    metric: "Database",
    used: input.dbBytes,
    limit: dbLimitBytes,
    percent: dbPercent,
  });

  const storageLimitBytes = limits.storageGb * 1024 ** 3;
  const storagePercent = storageLimitBytes > 0 ? (input.storageBytes / storageLimitBytes) * 100 : 0;
  thresholds.push({
    metric: "File Storage",
    used: input.storageBytes,
    limit: storageLimitBytes,
    percent: storagePercent,
  });

  if (input.authUsers != null) {
    const mauPercent = limits.mau > 0 ? (input.authUsers / limits.mau) * 100 : 0;
    thresholds.push({
      metric: "Auth Users (MAU proxy)",
      used: input.authUsers,
      limit: limits.mau,
      percent: mauPercent,
    });
    if (mauPercent >= 90) {
      reasons.push(
        `Auth users ใกล้ limit (${input.authUsers.toLocaleString()} / ${limits.mau.toLocaleString()} MAU)`,
      );
      verdict = "upgrade_required";
    } else if (mauPercent >= 80) {
      reasons.push(`Auth users เกิน 80% ของ Free tier`);
      if (verdict === "ok") verdict = "watch";
    }
  }

  if (dbPercent >= 90) {
    reasons.push(`Database ใกล้เต็ม (${dbPercent.toFixed(0)}% ของ ${limits.dbGb} GB)`);
    verdict = "upgrade_required";
  } else if (dbPercent >= 70) {
    reasons.push(`Database ใช้ไป ${dbPercent.toFixed(0)}% — ควรวางแผนอัปเกรด`);
    if (verdict === "ok") verdict = "watch";
  }

  if (storagePercent >= 90) {
    reasons.push(`File storage ใกล้เต็ม (${storagePercent.toFixed(0)}%)`);
    verdict = "upgrade_required";
  } else if (storagePercent >= 70) {
    reasons.push(`File storage ใช้ไป ${storagePercent.toFixed(0)}%`);
    if (verdict === "ok") verdict = "watch";
  }

  if (input.plan === "free") {
    reasons.push("Free plan ไม่มี daily backup อัตโนมัติ — production ควรอัปเกรด Pro ($25/mo)");
    if (input.backupCount === 0) {
      if (verdict === "ok") verdict = "upgrade_recommended";
      else if (verdict === "watch") verdict = "upgrade_recommended";
    }
    reasons.push("Free plan อาจ pause โปรเจกต์หลัง inactive 1 สัปดาห์");
  }

  if (reasons.length === 0) {
    reasons.push(`Plan ${limits.label} ยังมี headroom เพียงพอ`);
  }

  return {
    service: "supabase",
    currentPlan: limits.label,
    verdict,
    reasons,
    thresholds,
  };
}

export async function fetchSupabaseUsage(admin: SupabaseClient): Promise<SupabaseUsageSnapshot> {
  const now = new Date();
  const mgmtToken = getMgmtToken();

  const [latencyMs, storage, profilesRes, projectsRes, messagesRes, authUsersRes] =
    await Promise.all([
      probeLatency(admin),
      sumStorageBytes(admin),
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin.from("projects").select("*", { count: "exact", head: true }),
      admin.from("messages").select("*", { count: "exact", head: true }),
      mgmtToken
        ? mgmtQuery(mgmtToken, "SELECT COUNT(*)::bigint AS count FROM auth.users;")
        : Promise.resolve({ ok: false, status: 0, body: null }),
    ]);

  let platform: Record<string, unknown> = {
    managementConfigured: !!mgmtToken,
    managementNote: mgmtToken
      ? undefined
      : "ตั้ง MGMT_ACCESS_TOKEN ใน Edge Function secrets เพื่อดู plan, backups และ API usage",
  };

  let dbBytes = 0;
  let topTables: Array<{ schema: string; table: string; rows: number }> = [];
  let plan = "free";
  let backupCount = 0;

  if (mgmtToken) {
    const [projectRes, dbSizeRes, tablesRes, backupsRes, apiCounts] = await Promise.all([
      mgmtGet(`/projects/${PROJECT_REF}`, mgmtToken),
      mgmtQuery(mgmtToken, "SELECT pg_database_size(current_database())::bigint AS db_bytes;"),
      mgmtQuery(
        mgmtToken,
        `SELECT schemaname AS schema, relname AS table, n_live_tup::bigint AS rows
         FROM pg_stat_user_tables
         WHERE schemaname IN ('public', 'anthem', 'shared', 'so1o', 'ops', 'auth', 'storage')
         ORDER BY n_live_tup DESC
         LIMIT 20;`,
      ),
      mgmtGet(`/projects/${PROJECT_REF}/database/backups`, mgmtToken),
      fetchApiCounts(mgmtToken, 7),
    ]);

    const project = projectRes.ok ? (projectRes.body as Record<string, unknown>) : null;
    let org: Record<string, unknown> | null = null;
    if (project?.organization_id) {
      const orgRes = await mgmtGet(`/organizations/${project.organization_id}`, mgmtToken);
      if (orgRes.ok) org = orgRes.body as Record<string, unknown>;
    }

    plan = String(org?.plan ?? "free");
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

    if (dbSizeRes.ok) {
      const rows = (dbSizeRes.body as { result?: Array<{ db_bytes: string | number }> })?.result;
      dbBytes = Number(rows?.[0]?.db_bytes ?? 0);
    }

    if (tablesRes.ok) {
      topTables = ((tablesRes.body as { result?: typeof topTables })?.result ?? []).map((r) => ({
        schema: r.schema,
        table: r.table,
        rows: Number(r.rows),
      }));
    }

    const backupItems = (backupsRes.body as { backups?: unknown[] })?.backups ?? [];
    backupCount = backupItems.length;
    const pitr = (backupsRes.body as { pitr_enabled?: boolean })?.pitr_enabled ?? false;

    const apiRows = apiCounts.rows;
    const sumRequests = (key: keyof ApiCountRow) =>
      apiRows.reduce((s, r) => s + (Number(r[key]) || 0), 0);

    platform = {
      ...platform,
      project: project
        ? {
            name: project.name,
            ref: PROJECT_REF,
            status: project.status,
            region: project.region,
            createdAt: project.created_at,
          }
        : null,
      organization: org
        ? {
            name: org.name,
            slug: org.slug,
            plan,
            planLabel: limits.label,
          }
        : null,
      limits: {
        databaseGb: limits.dbGb,
        storageGb: limits.storageGb,
        mau: limits.mau,
      },
      database: {
        bytes: dbBytes,
        percentOfLimit: limits.dbGb > 0 ? (dbBytes / (limits.dbGb * 1024 ** 3)) * 100 : null,
      },
      backups: {
        count: backupCount,
        pitrEnabled: pitr,
      },
      apiUsage7d: apiRows.length
        ? {
            rest: sumRequests("total_rest_requests"),
            auth: sumRequests("total_auth_requests"),
            storage: sumRequests("total_storage_requests"),
            realtime: sumRequests("total_realtime_requests"),
            total:
              sumRequests("total_rest_requests") +
              sumRequests("total_auth_requests") +
              sumRequests("total_storage_requests") +
              sumRequests("total_realtime_requests"),
            daily: apiRows.map((r) => ({
              date: r.timestamp?.slice?.(0, 10) ?? r.timestamp,
              rest: r.total_rest_requests,
              auth: r.total_auth_requests,
              storage: r.total_storage_requests,
              realtime: r.total_realtime_requests,
            })),
          }
        : null,
      apiUsageError: apiCounts.error,
      managementErrors: [
        !projectRes.ok ? `project:${projectRes.status}` : null,
        !dbSizeRes.ok ? `db_size:${dbSizeRes.status}` : null,
      ].filter(Boolean),
    };
  }

  const authUserCount =
    mgmtToken && authUsersRes.ok
      ? Number(
          (authUsersRes.body as { result?: Array<{ count: string | number }> })?.result?.[0]
            ?.count ?? 0,
        )
      : null;

  const upgradeAdvice = buildSupabaseUpgradeAdvice({
    plan,
    dbBytes,
    storageBytes: storage.totalBytes,
    authUsers: authUserCount,
    backupCount,
  });

  return {
    generated_at: now.toISOString(),
    project_ref: PROJECT_REF,
    latency_ms: latencyMs,
    platform,
    storage: {
      total_bytes: storage.totalBytes,
      buckets: storage.buckets,
    },
    counts: {
      profiles: profilesRes.count ?? 0,
      auth_users: authUserCount,
      projects: projectsRes.count ?? 0,
      messages: messagesRes.count ?? 0,
    },
    top_tables: topTables,
    console_links: {
      dashboard: `https://supabase.com/dashboard/project/${PROJECT_REF}`,
      usage: `https://supabase.com/dashboard/project/${PROJECT_REF}/settings/billing/usage`,
      storage: `https://supabase.com/dashboard/project/${PROJECT_REF}/storage/buckets`,
      backups: `https://supabase.com/dashboard/project/${PROJECT_REF}/database/backups/scheduled`,
      functions: `https://supabase.com/dashboard/project/${PROJECT_REF}/functions`,
      logs: `https://supabase.com/dashboard/project/${PROJECT_REF}/logs/explorer`,
    },
    upgrade_advice: upgradeAdvice,
  };
}
