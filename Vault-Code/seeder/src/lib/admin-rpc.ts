import { createUserClient } from "./supabase/server";
import { assertAdmin } from "./admin";

/** Calls a super-admin RPC as the signed-in user (the database re-checks is_vault_super_admin()). */
export async function adminRpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data as T;
}

/** Reads that should not take the whole page down when a migration has not been applied yet. */
export async function safeRpc<T>(name: string, args: Record<string, unknown>, fallback: T): Promise<{ data: T; error: string | null }> {
  try {
    return { data: await adminRpc<T>(name, args), error: null };
  } catch (e) {
    return { data: fallback, error: e instanceof Error ? e.message : "unknown error" };
  }
}

export async function adminAction<T>(name: string, args: Record<string, unknown>): Promise<T> {
  await assertAdmin();
  return adminRpc<T>(name, args);
}

export function fmtBytes(n: number): string {
  if (!n) return "0";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
}

/** Best-effort audit entry for actions that don't go through an audited RPC (never blocks the action). */
export async function audit(action: string, targetType: string, targetId: string, detail: Record<string, unknown> = {}): Promise<void> {
  try {
    await adminRpc("vault_admin_log_event", { p_action: action, p_target_type: targetType, p_target_id: targetId, p_detail: detail });
  } catch {
    /* migration not applied yet */
  }
}
