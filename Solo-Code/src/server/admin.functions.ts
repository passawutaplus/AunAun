import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SOFT_DELETE_PURGE_DAYS = 7;

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");
  if (error) return `ตรวจสอบสิทธิ์ไม่สำเร็จ: ${error.message}`;
  if (!data || data.length === 0) return "ต้องเป็นแอดมินเท่านั้น";
  return null;
}

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        target_user_id: z.string().uuid(),
        force: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    try {
      const { userId, supabase } = context;
      if (data.target_user_id === userId) {
        return { ok: false, error: "ไม่สามารถลบบัญชีตัวเองได้" };
      }
      const denied = await assertAdmin(supabase, userId);
      if (denied) return { ok: false, error: denied };

      const purgeAfter = new Date(Date.now() + SOFT_DELETE_PURGE_DAYS * 86400000).toISOString();
      const warnings: string[] = [];

      const { data: targetProfile, error: profileErr } = await (supabaseAdmin as any)
        .from("profiles")
        .select("user_id,is_active")
        .eq("user_id", data.target_user_id)
        .maybeSingle();
      if (profileErr) {
        console.error("[deleteUser] profile lookup failed:", profileErr);
        return { ok: false, error: `ค้นหาผู้ใช้ไม่สำเร็จ: ${profileErr.message}` };
      }
      if (!targetProfile) return { ok: false, error: "ไม่พบผู้ใช้ในระบบ" };

      // Step 1: clear roles + soft-delete profile (always)
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.target_user_id);
      if (roleErr) warnings.push(`user_roles:${roleErr.message}`);

      const { error: updateErr } = await (supabaseAdmin as any)
        .from("profiles")
        .update({
          is_active: false,
          tester_approved: false,
          deactivated_at: new Date().toISOString(),
          deactivated_by: userId,
          purge_after: data.force ? new Date(Date.now() - 1000).toISOString() : purgeAfter,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", data.target_user_id);
      if (updateErr) {
        console.error("[deleteUser] soft-delete failed:", updateErr);
        return { ok: false, error: `ปิดใช้งานผู้ใช้ไม่สำเร็จ: ${updateErr.message}` };
      }

      // Step 2: ban auth session immediately so they get logged out
      try {
        const { error: banErr } = await (supabaseAdmin.auth.admin as any).updateUserById(
          data.target_user_id,
          { ban_duration: "876000h" },
        );
        if (banErr) warnings.push(`auth_ban:${banErr.message}`);
      } catch (e) {
        warnings.push(`auth_ban:${e instanceof Error ? e.message : String(e)}`);
      }

      // Step 3: if force, run full purge now via SECURITY DEFINER function
      if (data.force) {
        const { data: purgeRows, error: purgeErr } = await (supabaseAdmin as any).rpc(
          "force_purge_user",
          { _target_user_id: data.target_user_id, _admin_user_id: userId },
        );
        if (purgeErr) {
          console.error("[deleteUser] force purge failed:", purgeErr);
          warnings.push(`force_purge:${purgeErr.message}`);
          return {
            ok: false,
            error: `Purge ทันทีล้มเหลว: ${purgeErr.message}`,
            warnings,
          };
        }
        const row = (purgeRows ?? [])[0] as
          | { user_id: string; warnings: string[]; auth_deleted: boolean }
          | undefined;
        if (row?.warnings?.length) row.warnings.forEach((w) => warnings.push(w));
        return {
          ok: true,
          mode: "force_purged",
          auth_deleted: row?.auth_deleted ?? false,
          warnings,
        };
      }

      return {
        ok: true,
        mode: "soft_deleted",
        purge_after: purgeAfter,
        warnings,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[deleteUser] unexpected:", {
        message: msg,
        stack: e instanceof Error ? e.stack : undefined,
      });
      return { ok: false, error: msg || "เกิดข้อผิดพลาดที่ไม่คาดคิด" };
    }
  });

export const purgeInactiveUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;
    const denied = await assertAdmin(supabase, userId);
    if (denied) return { ok: false, error: denied };

    const { data: rows, error } = await (supabaseAdmin as any).rpc("purge_inactive_profile_data", {
      _limit: 25,
    });
    if (error) {
      console.error("[purgeInactiveUsers] rpc failed:", error);
      return { ok: false, error: `Purge ล้มเหลว: ${error.message}` };
    }
    const purged: string[] = [];
    const warnings: string[] = [];
    ((rows ?? []) as { user_id: string; warnings?: string[]; auth_deleted?: boolean }[]).forEach(
      (r) => {
        if (r.auth_deleted) purged.push(r.user_id);
        (r.warnings ?? []).forEach((w) => warnings.push(`${r.user_id}:${w}`));
      },
    );
    if (warnings.length) console.warn("[purgeInactiveUsers] warnings:", warnings);
    return { ok: true, purged, warnings };
  });
