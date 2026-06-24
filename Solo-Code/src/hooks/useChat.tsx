import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  user_id: string;
  sender_id: string;
  sender_role: "user" | "admin";
  body: string;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
}

/**
 * Chat hook — listens to messages for a given conversation (user_id).
 * If asAdmin is false, the conversation is the current user's.
 */
export function useChatMessages(conversationUserId: string | null) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!conversationUserId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", conversationUserId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled) return;
      setMessages((data as ChatMessage[]) ?? []);
      setLoading(false);
    })();

    const ch = supabase
      .channel(`chat_${conversationUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `user_id=eq.${conversationUserId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const next = payload.new as ChatMessage;
            if (prev.find((m) => m.id === next.id)) return prev;
            return [...prev, next];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `user_id=eq.${conversationUserId}`,
        },
        (payload) => {
          const next = payload.new as ChatMessage;
          setMessages((prev) => prev.map((m) => (m.id === next.id ? next : m)));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [conversationUserId]);

  return { messages, loading, setMessages };
}

/** Play a small beep using Web Audio API (no asset needed) */
export function playBeep(volume = 0.15) {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      (
        window as unknown as {
          AudioContext?: typeof AudioContext;
          webkitAudioContext?: typeof AudioContext;
        }
      ).AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.stop(ctx.currentTime + 0.26);
    setTimeout(() => ctx.close(), 400);
  } catch {
    // ignore
  }
}
