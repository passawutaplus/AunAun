export type HealthProbeResult = {
  name: string;
  url: string;
  status: number;
  latencyMs: number;
  ok: boolean;
};

const DEFAULT_TARGETS: Array<{ name: string; url: string }> = [
  { name: "So1o", url: "https://www.solofreelancer.com" },
  { name: "Aplus1", url: "https://aplus1.app" },
  { name: "Ops Hub", url: "https://so1o-ops-hub.vercel.app" },
];

export async function probeHttp(
  name: string,
  url: string,
  timeoutMs = 10_000,
): Promise<HealthProbeResult> {
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const status = res.status;
    const ok = status >= 200 && status < 400;
    return {
      name,
      url,
      status,
      latencyMs: Math.round(performance.now() - t0),
      ok,
    };
  } catch {
    return {
      name,
      url,
      status: 0,
      latencyMs: Math.round(performance.now() - t0),
      ok: false,
    };
  }
}

export async function probeSupabaseRest(
  supabaseUrl: string,
  timeoutMs = 10_000,
): Promise<HealthProbeResult> {
  const url = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/`;
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const status = res.status;
    const ok = status === 200 || status === 401;
    return {
      name: "Supabase REST",
      url,
      status,
      latencyMs: Math.round(performance.now() - t0),
      ok,
    };
  } catch {
    return {
      name: "Supabase REST",
      url,
      status: 0,
      latencyMs: Math.round(performance.now() - t0),
      ok: false,
    };
  }
}

export async function runHealthProbes(supabaseUrl?: string): Promise<HealthProbeResult[]> {
  const siteResults = await Promise.all(DEFAULT_TARGETS.map((t) => probeHttp(t.name, t.url)));
  const supaUrl = supabaseUrl ?? Deno.env.get("SUPABASE_URL") ?? "";
  const supaResult = supaUrl ? await probeSupabaseRest(supaUrl) : null;
  return supaResult ? [...siteResults, supaResult] : siteResults;
}
