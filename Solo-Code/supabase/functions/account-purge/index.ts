import { supabaseSecretKey } from "../_shared/supabase-keys.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { anthemDb, sharedDb } from "../_shared/ecosystem-db.ts";

/**
 * Purges accounts whose deletion an admin approved at least 30 days ago (woken daily by
 * public.account_purge_wake). It only acts on requests already due in the database, so an early or
 * repeated call does nothing harmful and needs no secret — the same pattern as line-admin-notify.
 */
const BATCH = 10;
const REMOVE_CHUNK = 100;

type DueRequest = { id: string; user_id: string; purged_at: string | null };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, supabaseSecretKey());
  // A fresh builder per call: supabase-js builders keep their URL and must not be reused.
  const requests = () => anthemDb(admin).from("privacy_requests");

  const { data: due, error } = await requests()
    .select("id, user_id, purged_at")
    .eq("request_type", "delete")
    .eq("status", "approved")
    .lte("scheduled_purge_at", new Date().toISOString())
    .order("scheduled_purge_at", { ascending: true })
    .limit(BATCH);
  if (error) {
    console.error("[account-purge] load", error.message);
    return json({ error: "load_failed" }, 500);
  }

  const results: { request_id: string; outcome: string }[] = [];
  for (const r of (due ?? []) as DueRequest[]) {
    try {
      if (!r.purged_at) {
        const { data: files, error: filesErr } = await admin.rpc("account_storage_objects", { _user_id: r.user_id });
        if (filesErr) throw filesErr;
        const byBucket = new Map<string, string[]>();
        for (const f of (files ?? []) as { bucket_id: string; name: string }[]) {
          byBucket.set(f.bucket_id, [...(byBucket.get(f.bucket_id) ?? []), f.name]);
        }
        for (const [bucket, names] of byBucket) {
          for (let i = 0; i < names.length; i += REMOVE_CHUNK) {
            const { error: rmErr } = await admin.storage.from(bucket).remove(names.slice(i, i + REMOVE_CHUNK));
            if (rmErr) throw rmErr;
          }
        }

        const { error: purgeErr } = await admin.rpc("account_purge_user_data", { _request_id: r.id });
        if (purgeErr) throw purgeErr;
      }

      // The auth account is shared with So1o and Vault: never delete it while those apps hold data.
      const { data: blockers, error: blockErr } = await admin.rpc("account_purge_blockers", { _user_id: r.user_id });
      if (blockErr) throw blockErr;
      if (Array.isArray(blockers) && blockers.length > 0) {
        await requests()
          .update({ admin_note: `ลบข้อมูล SAMECOR แล้ว แต่บัญชีใช้ร่วมกับ ${blockers.join(", ")} — แอดมินต้องตัดสินใจเรื่องบัญชีเอง` })
          .eq("id", r.id);
        results.push({ request_id: r.id, outcome: "needs_admin" });
        continue;
      }

      const { error: authErr } = await admin.auth.admin.deleteUser(r.user_id);
      if (authErr && !/not.?found/i.test(authErr.message)) throw authErr;

      await requests().update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", r.id);
      await sharedDb(admin).from("admin_audit_log").insert({
        actor_id: r.user_id,
        action: "account_deletion_completed",
        target_type: "user",
        target_id: r.user_id,
        metadata: { request_id: r.id },
      });
      results.push({ request_id: r.id, outcome: "deleted" });
    } catch (e) {
      // Left as approved, so the next daily run retries it.
      console.error("[account-purge]", r.id, e instanceof Error ? e.message : e);
      results.push({ request_id: r.id, outcome: "error" });
    }
  }

  return json({ processed: results.length, results });
});
