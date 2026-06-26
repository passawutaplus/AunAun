import { supabase } from "@/integrations/supabase/client";

export type NotifyAplus1Payload =
  | { event: "gift"; transaction_id: string }
  | { event: "follow"; following_id: string }
  | { event: "job_application"; application_id: string }
  | { event: "topup"; topup_id?: string }
  | {
      event: "cashout";
      request_id: string;
      status: "submitted" | "paid" | "rejected";
    };

/** @deprecated use NotifyAplus1Payload */
export type NotifyAnthemPayload = NotifyAplus1Payload;

/** Fire-and-forget email + LINE for Aplus1 notification events. */
export function notifyAplus1(payload: NotifyAplus1Payload): void {
  void supabase.functions.invoke("notify-anthem", { body: payload }).catch(() => {});
}

/** @deprecated use notifyAplus1 */
export const notifyAnthem = notifyAplus1;
