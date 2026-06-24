import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssistantPreset } from "@/context/AssistantContext";
import { buildBusinessSnapshot, isBusinessQuestion } from "@/lib/aiBusinessSnapshot";
import { getPresetConfig, isAssistantPreset } from "@/lib/aiAssistantPresets";
import type { ChatMessage } from "@/lib/geminiServer";

export const ASSISTANT_MAX_OUTPUT_TOKENS = 1024;

export type AssistantRequest = {
  message: string;
  preset?: AssistantPreset;
};

export type PreparedAssistant = {
  message: string;
  preset: AssistantPreset;
  config: ReturnType<typeof getPresetConfig>;
  chatMessages: ChatMessage[];
};

export function resolveAssistantPreset(message: string, preset?: AssistantPreset): AssistantPreset {
  if (preset) return preset;
  return isBusinessQuestion(message) ? "business" : "mentor";
}

export async function prepareAssistantRequest(
  supabase: SupabaseClient,
  userId: string,
  input: AssistantRequest,
): Promise<PreparedAssistant> {
  const message = input.message.trim();
  const preset = resolveAssistantPreset(message, input.preset);
  const config = getPresetConfig(preset);

  let userContent: string;
  if (config.usesBusinessSnapshot) {
    const snapshot = await buildBusinessSnapshot(supabase, userId);
    userContent = `ข้อมูลธุรกิจ (JSON):\n${JSON.stringify(snapshot, null, 2)}\n\nคำถามจากผู้ใช้:\n${message}`;
  } else {
    userContent = message;
  }

  return {
    message,
    preset: isAssistantPreset(preset) ? preset : "mentor",
    config,
    chatMessages: [
      { role: "system", content: config.systemPrompt },
      { role: "user", content: userContent },
    ],
  };
}

export async function persistAssistantMessages(
  supabase: SupabaseClient,
  userId: string,
  preset: AssistantPreset,
  message: string,
  reply: string,
): Promise<void> {
  const { error } = await supabase.from("ai_chat_messages").insert([
    { user_id: userId, role: "user", content: message, preset },
    { user_id: userId, role: "assistant", content: reply, preset },
  ]);
  if (error) throw new Error(error.message);
}
