"use server";

import { revalidatePath } from "next/cache";
import { adminAction } from "@/lib/admin-rpc";
import { serviceClient } from "@/seeder/repo";

const UUID = /^[0-9a-f-]{36}$/i;

function uuid(formData: FormData, key: string): string {
  const v = String(formData.get(key) ?? "");
  if (!UUID.test(v)) throw new Error(`invalid ${key}`);
  return v;
}

function text(formData: FormData, key: string, max = 2000): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function int(formData: FormData, key: string): number {
  const n = Number.parseInt(String(formData.get(key) ?? ""), 10);
  if (!Number.isFinite(n) || n < 0 || n > 10_000_000) throw new Error(`invalid ${key}`);
  return n;
}

export async function saveUser(formData: FormData) {
  const user = uuid(formData, "user_id");
  const suspended = formData.get("suspended") === "on";
  const was = formData.get("was_suspended") === "true";
  await adminAction("vault_admin_set_user", {
    p_user: user,
    p_plan: text(formData, "plan_id", 40) || "free",
    p_suspended: suspended,
    p_note: text(formData, "note"),
  });
  // Suspension is enforced by banning the auth user (service role stays on the server).
  if (suspended !== was) {
    const { error } = await serviceClient().auth.admin.updateUserById(user, { ban_duration: suspended ? "876000h" : "none" });
    if (error) throw new Error(`ban: ${error.message}`);
  }
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function resolveReport(formData: FormData) {
  await adminAction("vault_admin_resolve_report", {
    p_id: uuid(formData, "id"),
    p_status: text(formData, "status", 20),
    p_hide_item: formData.get("hide_item") === "true",
  });
  revalidatePath("/admin/reports");
  revalidatePath("/admin/seeder");
}

export async function revokeShare(formData: FormData) {
  await adminAction("vault_admin_revoke_share", { p_board: uuid(formData, "id") });
  revalidatePath("/admin/shares");
}

export async function setFeedback(formData: FormData) {
  await adminAction("vault_admin_set_feedback", {
    p_id: uuid(formData, "id"),
    p_status: text(formData, "status", 20),
    p_note: text(formData, "note"),
  });
  revalidatePath("/admin/feedback");
}

export async function updatePlan(formData: FormData) {
  await adminAction("vault_admin_update_plan", {
    p_id: text(formData, "id", 40),
    p_items: int(formData, "max_items"),
    p_storage_mb: int(formData, "max_storage_mb"),
    p_boards: int(formData, "max_boards"),
    p_shares: int(formData, "max_shares"),
  });
  revalidatePath("/admin/plans");
}

export async function purgeCaptures(formData: FormData) {
  const days = Math.max(1, Math.min(3650, Number.parseInt(String(formData.get("days") ?? "30"), 10) || 30));
  const res = await adminAction<{ deleted: number }>("vault_admin_purge_captures", { p_older_than_days: days });
  await adminAction("vault_admin_log_event", {
    p_action: "captures.purge",
    p_target_type: "captures",
    p_target_id: "",
    p_detail: { older_than_days: days, deleted: res?.deleted ?? 0 },
  });
  revalidatePath("/admin/ops");
}
