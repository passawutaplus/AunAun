import type { PostgrestError } from "@supabase/supabase-js";

export type SafeResult<T> = {
  source: string;
  data: T | null;
  error: PostgrestError | Error | null;
};

export async function safeCount(
  source: string,
  promise: PromiseLike<{ count: number | null; error: PostgrestError | null }>,
): Promise<SafeResult<number>> {
  try {
    const res = await promise;
    if (res.error) return { source, data: null, error: res.error };
    return { source, data: res.count ?? 0, error: null };
  } catch (e) {
    return { source, data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function safeRows<T>(
  source: string,
  promise: PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<SafeResult<T[]>> {
  try {
    const res = await promise;
    if (res.error) return { source, data: null, error: res.error };
    return { source, data: res.data ?? [], error: null };
  } catch (e) {
    return { source, data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export function degradedLabels(sources: string[]): string[] {
  const labels: Record<string, string> = {
    profiles: "So1o profiles",
    support_tickets: "So1o tickets",
    feature_suggestions: "So1o suggestions",
    quotations: "So1o quotations",
    tester_applications: "So1o early access",
    app_feedback: "an1hem feedback",
    user_reports: "an1hem reports",
    projects: "an1hem projects",
    job_posts: "an1hem jobs",
    hiring_requests: "an1hem hiring",
    collab_requests: "an1hem collabs",
    cashout_requests: "ถอน Pixel",
    kyc_requests: "KYC",
    aml_flags: "AML",
    ops_issues: "Hub issues",
  };
  return sources.map((s) => labels[s] ?? s);
}
