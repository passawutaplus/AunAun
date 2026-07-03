/**
 * VirusTotal helpers for project asset scanning (Edge Functions only).
 * Set VIRUSTOTAL_API_KEY in Supabase secrets; falls back to basic pass when unset.
 */

const API_BASE = "https://www.virustotal.com/api/v3";

export type VtScanResult = {
  clean: boolean;
  reason: string | null;
  positives?: number;
  total?: number;
};

function apiKey(): string | undefined {
  const k = Deno.env.get("VIRUSTOTAL_API_KEY")?.trim();
  return k || undefined;
}

async function vtFetch(path: string, init?: RequestInit): Promise<Response> {
  const key = apiKey();
  if (!key) throw new Error("no_vt_key");
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "x-apikey": key,
      ...(init?.headers ?? {}),
    },
  });
}

async function pollAnalysis(analysisId: string, maxAttempts = 12): Promise<VtScanResult> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await vtFetch(`/analyses/${analysisId}`);
    if (!res.ok) {
      return { clean: true, reason: null };
    }
    const json = await res.json();
    const status = json?.data?.attributes?.status;
    if (status === "completed") {
      const stats = json?.data?.attributes?.stats ?? {};
      const malicious = Number(stats.malicious ?? 0);
      const suspicious = Number(stats.suspicious ?? 0);
      const total = Number(stats.harmless ?? 0) + malicious + suspicious + Number(stats.undetected ?? 0);
      if (malicious > 0 || suspicious > 2) {
        return {
          clean: false,
          reason: "พบเนื้อหาที่อาจไม่ปลอดภัยจากการสแกนไฟล์",
          positives: malicious + suspicious,
          total,
        };
      }
      return { clean: true, reason: null, positives: 0, total };
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return { clean: true, reason: null };
}

export async function virusTotalScanUrl(url: string): Promise<VtScanResult> {
  if (!apiKey()) return { clean: true, reason: null };

  try {
    const body = new URLSearchParams();
    body.set("url", url);
    const submit = await vtFetch("/urls", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!submit.ok) return { clean: true, reason: null };

    const submitted = await submit.json();
    const analysisId = submitted?.data?.id as string | undefined;
    if (!analysisId) return { clean: true, reason: null };

    return await pollAnalysis(analysisId, 8);
  } catch {
    return { clean: true, reason: null };
  }
}

export async function virusTotalScanFile(bytes: Uint8Array): Promise<VtScanResult> {
  if (!apiKey()) return { clean: true, reason: null };

  try {
    const form = new FormData();
    form.append("file", new Blob([bytes]), "asset.bin");
    const submit = await vtFetch("/files", { method: "POST", body: form });
    if (!submit.ok) return { clean: true, reason: null };

    const submitted = await submit.json();
    const analysisId = submitted?.data?.id as string | undefined;
    if (!analysisId) return { clean: true, reason: null };

    return await pollAnalysis(analysisId, 15);
  } catch {
    return { clean: true, reason: null };
  }
}
