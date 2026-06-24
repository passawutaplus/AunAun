import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { detectProfanity, maskProfanity, PROFANITY_WARNING, COMMUNITY_GUIDELINES_PATH } from "@/lib/profanity";
import { toast } from "sonner";

export interface ModerationCheck {
  allowed: boolean;
  reason: string | null;
  banned_until: string | null;
  strikes: number;
}

export function useModerationState() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["moderation-state", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ModerationCheck> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("check_user_can_post");
      if (error) throw error;
      const row = data as Record<string, unknown>;
      return {
        allowed: Boolean(row.allowed),
        reason: (row.reason as string) ?? null,
        banned_until: (row.banned_until as string) ?? null,
        strikes: Number(row.strikes ?? 0),
      };
    },
    staleTime: 30_000,
  });
}

export function useRecordProfanityStrike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (context: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("record_profanity_strike", {
        p_context: context,
      });
      if (error) throw error;
      return data as { strikes: number; action: string; banned_until?: string; days?: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["moderation-state"] });
      if (data.action === "ban" && data.banned_until) {
        toast.error(`ถูกจำกัดการโพสต์ ${data.days ?? ""} วัน เนื่องจากใช้คำหยาบซ้ำ`, {
          description: "อ่านกฎชุมชนเพิ่มเติม",
          action: {
            label: "กฎชุมชน",
            onClick: () => { window.location.href = COMMUNITY_GUIDELINES_PATH; },
          },
        });
      }
    },
  });
}

export function useAdminApplyModeration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      userId: string;
      action: "strike" | "mute" | "ban" | "unban" | "report_upheld";
      days?: number;
      note?: string;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("admin_apply_moderation", {
        p_user_id: input.userId,
        p_action: input.action,
        p_days: input.days ?? 0,
        p_note: input.note ?? "",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation-state"] });
      qc.invalidateQueries({ queryKey: ["admin", "moderation"] });
    },
  });
}

export interface ModeratedSubmitOptions {
  context: string;
  blockOnProfanity?: boolean;
  maskOnProfanity?: boolean;
}

/** Returns processed content or null if blocked. */
export async function prepareModeratedContent(
  raw: string,
  opts: ModeratedSubmitOptions,
  checkCanPost: () => Promise<ModerationCheck>,
  recordStrike: (ctx: string) => Promise<unknown>,
): Promise<string | null> {
  const gate = await checkCanPost();
  if (!gate.allowed) {
    const until = gate.banned_until
      ? new Date(gate.banned_until).toLocaleString("th-TH")
      : "";
    toast.error(`คุณถูกจำกัดการโพสต์${until ? ` จนถึง ${until}` : ""}`);
    return null;
  }

  const { hasProfanity } = detectProfanity(raw);
  if (!hasProfanity) return raw;

  toast.warning(PROFANITY_WARNING, {
    action: {
      label: "กฎชุมชน",
      onClick: () => { window.location.href = COMMUNITY_GUIDELINES_PATH; },
    },
  });

  if (opts.blockOnProfanity) {
    return null;
  }

  const masked = maskProfanity(raw);
  await recordStrike(opts.context);
  return opts.maskOnProfanity !== false ? masked : raw;
}
