export type SupabaseUsageResponse = {
  generated_at: string;
  project_ref: string;
  latency_ms: number;
  platform: {
    managementConfigured: boolean;
    managementNote?: string;
    project?: {
      name: string;
      ref: string;
      status: string;
      region: string;
      createdAt?: string;
    } | null;
    organization?: {
      name: string;
      slug?: string;
      plan: string;
      planLabel: string;
    } | null;
    limits?: {
      databaseGb: number;
      storageGb: number;
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
    managementErrors?: string[];
  };
  storage: {
    total_bytes: number;
    buckets: Array<{
      name: string;
      objects: number;
      bytes: number;
      truncated: boolean;
    }>;
  };
  counts: {
    profiles: number;
    auth_users: number | null;
    projects: number;
    messages: number;
  };
  top_tables: Array<{
    schema: string;
    table: string;
    rows: number;
  }>;
  console_links: {
    dashboard: string;
    usage: string;
    storage: string;
    backups: string;
    functions: string;
    logs: string;
  };
  upgrade_advice?: {
    service: string;
    currentPlan: string;
    verdict: "ok" | "watch" | "upgrade_recommended" | "upgrade_required";
    reasons: string[];
    thresholds: Array<{
      metric: string;
      used: number;
      limit: number;
      percent: number;
    }>;
  };
};
