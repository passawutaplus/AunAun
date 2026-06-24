import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { AssistantPreset } from "@/context/AssistantContext";
import {
  ASSISTANT_MAX_OUTPUT_TOKENS,
  persistAssistantMessages,
  prepareAssistantRequest,
} from "@/lib/aiAssistantCore";
import { debitAiCredits, getAiUsageSummary, refundAiCredits } from "@/lib/aiCreditsServer";
import { defaultFastModel, geminiChatStream } from "@/lib/geminiServer";
import { guardIpRateLimit, IP_RATE_LIMITS } from "@/lib/rateLimit.server";

const PRESETS = new Set<AssistantPreset>(["mentor", "business", "copy", "legal"]);

async function authenticateRequest(request: Request) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return Response.json({ error: "server_misconfiguration" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  return { supabase, userId: data.claims.sub };
}

function sseLine(event: string | null, payload: unknown): string {
  const data = JSON.stringify(payload);
  return event ? `event: ${event}\ndata: ${data}\n\n` : `data: ${data}\n\n`;
}

export const Route = createFileRoute("/api/assistant/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const limited = guardIpRateLimit(request, IP_RATE_LIMITS.assistantStream);
        if (limited) return limited;

        const auth = await authenticateRequest(request);
        if (auth instanceof Response) return auth;

        const { supabase, userId } = auth;

        let body: { message?: string; preset?: string; request_id?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }

        const message = String(body?.message ?? "")
          .trim()
          .slice(0, 500);
        const requestId = String(body?.request_id ?? "")
          .trim()
          .slice(0, 64);
        if (!message) {
          return Response.json({ error: "empty_message" }, { status: 400 });
        }

        const preset =
          body?.preset && PRESETS.has(body.preset as AssistantPreset)
            ? (body.preset as AssistantPreset)
            : undefined;

        let prepared;
        try {
          prepared = await prepareAssistantRequest(supabase, userId, { message, preset });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "prepare_failed";
          return Response.json({ error: msg }, { status: 500 });
        }

        const preview = await getAiUsageSummary(userId);
        if (preview.total_remaining < prepared.config.cost) {
          return Response.json({ error: "limit_reached" }, { status: 429 });
        }

        const idempotencyKey = requestId
          ? `assistant-stream:${userId}:${requestId}`
          : `assistant-stream:${userId}:${prepared.preset}:${message}`;

        const quota = await debitAiCredits({
          userId,
          feature: prepared.config.feature,
          idempotencyKey,
        });
        if (!quota.allowed) {
          return Response.json({ error: "limit_reached" }, { status: 429 });
        }

        const refundKey = `refund:${idempotencyKey}`;
        const maybeRefund = async () => {
          try {
            await refundAiCredits({
              userId,
              originalIdempotencyKey: idempotencyKey,
              refundIdempotencyKey: refundKey,
            });
          } catch {
            // refund is best-effort; user may need support if this fails
          }
        };

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            let fullReply = "";
            try {
              for await (const delta of geminiChatStream({
                model: defaultFastModel(),
                messages: prepared.chatMessages,
                maxOutputTokens: ASSISTANT_MAX_OUTPUT_TOKENS,
              })) {
                fullReply += delta;
                controller.enqueue(encoder.encode(sseLine(null, { delta })));
              }

              const safeReply = fullReply.trim();
              if (!safeReply) {
                await maybeRefund();
                controller.enqueue(encoder.encode(sseLine("error", { error: "empty_response" })));
                return;
              }

              try {
                await persistAssistantMessages(
                  supabase,
                  userId,
                  prepared.preset,
                  prepared.message,
                  safeReply,
                );
              } catch (persistErr) {
                await maybeRefund();
                const msg = persistErr instanceof Error ? persistErr.message : "persist_failed";
                controller.enqueue(encoder.encode(sseLine("error", { error: msg })));
                return;
              }

              controller.enqueue(
                encoder.encode(
                  sseLine("done", {
                    answer: safeReply,
                    preset: prepared.preset,
                    usage: {
                      included_used: quota.included_used ?? 0,
                      included_limit: quota.included_limit ?? 0,
                      included_remaining: quota.included_remaining ?? 0,
                      purchased_balance: quota.purchased_balance ?? 0,
                      total_remaining: quota.total_remaining ?? 0,
                      cost: quota.cost ?? prepared.config.cost,
                    },
                  }),
                ),
              );
            } catch (e) {
              await maybeRefund();
              const msg = e instanceof Error ? e.message : "ai_error";
              controller.enqueue(encoder.encode(sseLine("error", { error: msg })));
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
