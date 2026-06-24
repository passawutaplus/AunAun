import { supabase } from "@/integrations/supabase/client";

export type AdminAuditInput = {
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
};

/** Fire-and-forget admin audit log (PDPA accountability). */
export async function logAdminAudit(input: AdminAuditInput): Promise<void> {
  const { error } = await supabase.rpc("log_admin_audit", {
    _action: input.action,
    _target_type: input.targetType,
    _target_id: input.targetId,
    _metadata: input.metadata ?? {},
  });
  if (error) console.warn("[admin-audit]", error.message);
}

export async function logKycAdminAccess(
  requestId: string,
  event: "review_open" | "documents_load" | "document_open",
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.rpc("admin_log_kyc_access", {
    _request_id: requestId,
    _event: event,
    _metadata: metadata ?? {},
  });
  if (error) console.warn("[kyc-audit]", error.message);
}
