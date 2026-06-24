import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { throwClientError } from "@/lib/security";

// -------- helpers --------
async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throwClientError("hq.assertAdmin", error, "Forbidden: admin only");
  if (!data) throw new Error("Forbidden: admin only");
}

async function assertConversationOwner(
  supabase: { from: (table: string) => any },
  userId: string,
  conversationId: string,
) {
  const { data, error } = await supabase
    .from("hq_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throwClientError("hq.assertConversationOwner", error, "ไม่พบบทสนทนานี้");
  if (!data) throw new Error("ไม่พบบทสนทนานี้");
}

// -------- list agents --------
export const listAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    await assertAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("hq_agents")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throwClientError("hq.listAgents", error);
    return data ?? [];
  });

// -------- update agent prompt/model --------
export const updateAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        slug: z.string().min(1),
        system_prompt: z.string().min(10).max(20000).optional(),
        model: z.string().min(2).max(200).optional(),
        temperature: z.number().min(0).max(2).optional(),
        max_tokens: z.number().int().min(100).max(8000).optional(),
        is_active: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    await assertAdmin(supabase, userId);
    const { slug, ...patch } = data;
    const { data: updated, error } = await supabase
      .from("hq_agents")
      .update(patch)
      .eq("slug", slug)
      .select()
      .single();
    if (error) throwClientError("hq.updateAgent", error);
    return updated;
  });

// -------- list conversations for an agent --------
export const listConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ agentSlug: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    await assertAdmin(supabase, userId);
    const { data: rows, error } = await supabase
      .from("hq_conversations")
      .select("id,title,updated_at,pinned_context")
      .eq("agent_slug", data.agentSlug)
      .eq("user_id", userId)
      .eq("archived", false)
      .order("updated_at", { ascending: false })
      .limit(30);
    if (error) throwClientError("hq.listConversations", error);
    return rows ?? [];
  });

// -------- list messages in a conversation --------
export const listMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    await assertAdmin(supabase, userId);
    await assertConversationOwner(supabase, userId, data.conversationId);
    const { data: rows, error } = await supabase
      .from("hq_messages")
      .select("id,role,content,agent_slug,tokens_used,created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throwClientError("hq.listMessages", error);
    return rows ?? [];
  });

// -------- chat with an agent (non-streaming) --------
const ChatInput = z.object({
  agentSlug: z.string().min(1),
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(8000),
  pinnedContext: z.record(z.string(), z.unknown()).optional(),
});

export const chatWithAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    await assertAdmin(supabase, userId);

    const { data: agent, error: agentErr } = await supabase
      .from("hq_agents")
      .select("*")
      .eq("slug", data.agentSlug)
      .eq("is_active", true)
      .single();
    if (agentErr || !agent) throw new Error("ไม่พบพนักงาน AI หรือถูกปิดใช้งาน");

    let conversationId = data.conversationId;
    if (!conversationId) {
      const { data: conv, error: convErr } = await supabase
        .from("hq_conversations")
        .insert({
          agent_slug: data.agentSlug,
          user_id: userId,
          title: data.message.slice(0, 60),
          pinned_context: data.pinnedContext ?? {},
        })
        .select("id")
        .single();
      if (convErr) throwClientError("hq.chatWithAgent.createConversation", convErr);
      conversationId = conv.id;
    } else {
      await assertConversationOwner(supabase, userId, conversationId);
      await supabase
        .from("hq_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId)
        .eq("user_id", userId);
    }

    const { data: history } = await supabase
      .from("hq_messages")
      .select("role,content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(30);

    await supabase.from("hq_messages").insert({
      conversation_id: conversationId,
      agent_slug: data.agentSlug,
      role: "user",
      content: data.message,
    });

    const messages = [
      { role: "system", content: agent.system_prompt as string },
      ...(history ?? []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.message },
    ];

    const { geminiChat, normalizeGeminiModel } = await import("@/lib/geminiServer");
    const { text: reply } = await geminiChat({
      model: normalizeGeminiModel(agent.model as string),
      messages: messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content as string,
      })),
      temperature: Number(agent.temperature) || 0.7,
      maxOutputTokens: Number(agent.max_tokens) || 1200,
    });
    const tokensUsed = 0;

    const { data: assistantMsg, error: msgErr } = await supabase
      .from("hq_messages")
      .insert({
        conversation_id: conversationId,
        agent_slug: data.agentSlug,
        role: "assistant",
        content: reply,
        tokens_used: tokensUsed,
        metadata: { model: agent.model },
      })
      .select("id,role,content,tokens_used,created_at")
      .single();
    if (msgErr) throwClientError("hq.chatWithAgent.insertMessage", msgErr);

    return {
      conversationId,
      message: assistantMsg,
    };
  });

// -------- delete conversation --------
export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("hq_conversations")
      .delete()
      .eq("id", data.conversationId)
      .eq("user_id", userId);
    if (error) throwClientError("hq.deleteConversation", error);
    return { ok: true };
  });
