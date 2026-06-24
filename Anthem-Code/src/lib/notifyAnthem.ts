import { supabase } from "@/integrations/supabase/client";

export type NotifyAnthemPayload =
  | { event: "gift"; transaction_id: string }
  | { event: "follow"; following_id: string }
  | { event: "job_application"; application_id: string }
  | { event: "topup"; topup_id?: string }
  | {
      event: "cashout";
      request_id: string;
      status: "submitted" | "paid" | "rejected";
    };

/** Fire-and-forget email + LINE for Anthem notification events. */
export function notifyAnthem(payload: NotifyAnthemPayload): void {
  void supabase.functions.invoke("notify-anthem", { body: payload }).catch(() => {});
}
