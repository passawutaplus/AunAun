import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { formatLineTestMessage, LINE_TEST_SAMPLES } from "@/lib/lineTestSamples";

const PRO_TIERS = new Set(["pro", "pro_plus", "inhouse"]);

function loadLineAccessToken(): string | undefined {
  if (process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim()) {
    return process.env.LINE_CHANNEL_ACCESS_TOKEN.trim();
  }

  const serverDir = dirname(fileURLToPath(import.meta.url));
  const envLine = resolve(serverDir, "../../.env.line");
  if (!existsSync(envLine)) return undefined;

  for (const line of readFileSync(envLine, "utf8").split("\n")) {
    const m = line.match(/^LINE_CHANNEL_ACCESS_TOKEN=(.*)$/);
    if (!m) continue;
    let v = m[1].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    return v || undefined;
  }
  return undefined;
}

async function pushLineText(lineUserId: string, text: string) {
  const token = loadLineAccessToken();
  if (!token) return { ok: false as const, error: "line_not_configured" };

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "text", text: text.slice(0, 5000) }],
    }),
  });

  if (res.ok) return { ok: true as const };
  let error = res.statusText;
  try {
    error = await res.text();
  } catch {
    /* ignore */
  }
  return { ok: false as const, error };
}

export async function sendLineTestSamplesForUser(userId: string) {
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("line_messaging_user_id, subscription_tier, display_name, brand_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileErr) throw new Error(profileErr.message);
  if (!profile?.line_messaging_user_id) throw new Error("line_not_linked");

  const tier = profile.subscription_tier ?? "free";
  if (!PRO_TIERS.has(tier)) throw new Error("pro_required");

  const results: Array<{ kind: string; ok: boolean; error?: string }> = [];

  for (const sample of LINE_TEST_SAMPLES) {
    const text = formatLineTestMessage(sample.kind, sample.body, {
      displayName: profile.display_name,
      brandName: profile.brand_name,
    });
    const result = await pushLineText(profile.line_messaging_user_id, text);
    results.push({
      kind: sample.kind,
      ok: result.ok,
      error: result.ok ? undefined : result.error,
    });
    await new Promise((r) => setTimeout(r, 400));
  }

  const sent = results.filter((r) => r.ok).length;
  if (sent === 0) {
    const firstErr = results.find((r) => r.error)?.error ?? "line_push_failed";
    throw new Error(firstErr.length < 120 ? firstErr : "line_push_failed");
  }

  return {
    ok: true as const,
    sent,
    total: LINE_TEST_SAMPLES.length,
    results,
  };
}
