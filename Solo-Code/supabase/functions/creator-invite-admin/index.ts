/**
 * Creator Invitation — admin actions (has_role admin). Reads go through the admin_creator_invite_* RPCs;
 * everything that needs tokens, storage, email or auth.admin lives here.
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeadersForRequest } from "../_shared/cors.ts";
import { requireAdminUser } from "../_shared/admin-auth.ts";
import { supabaseSecretKey } from "../_shared/supabase-keys.ts";
import {
  INVITE_BUCKET,
  INVITE_COLS,
  REVIEW_LINK_DAYS,
  type InviteRow,
  decryptToken,
  enqueueEmail,
  inviteLink,
  isActive,
  logEvent,
  mintToken,
  processOutbox,
  purgeInvitation,
  reviewLink,
  signedMediaUrls,
} from "../_shared/creator-invite-core.ts";
import { EMAIL_RE, SubmissionSchema } from "../_shared/creator-invite-schema.ts";
import { signatureMatchesExtension } from "../_shared/asset-content-checks.ts";
import { publishInvitation } from "../_shared/creator-invite-publish.ts";

const CreateSchema = z.object({
  display_name: z.string().trim().min(1).max(120),
  discipline: z.string().trim().max(80).optional().default(""),
  country: z.string().trim().max(80).optional().default(""),
  contact: z.string().trim().min(1).max(254),
  language: z.enum(["th", "en"]).default("th"),
  expires_days: z.number().int().min(1).max(90).default(30),
  personal_note: z.string().trim().max(600).optional().default(""),
  interest_url: z.string().trim().max(500).optional().default(""),
  send_mode: z.enum(["email_now", "scheduled", "manual_dm"]),
  scheduled_at: z.string().datetime({ offset: true }).optional().nullable(),
  auto_reminder: z.boolean().default(true),
});

const Body = z.object({
  action: z.enum([
    "create",
    "links",
    "send",
    "remind",
    "mark_sent",
    "revoke",
    "extend",
    "regenerate_link",
    "start_draft",
    "save_draft",
    "send_review",
    "publish",
    "media_urls",
    // team uploads images into the draft (e.g. ones the artist emailed)
    "media_upload_url",
    "media_upload_done",
    "delete_data",
  ]),
  id: z.string().uuid().optional(),
  ids: z.array(z.string().uuid()).max(200).optional(),
  invite: z.unknown().optional(),
  draft: z.unknown().optional(),
  channel: z.string().trim().max(40).optional(),
  days: z.number().int().min(1).max(90).optional(),
  slot: z.enum(["avatar", "cover", "p1", "p2", "p3", "extra"]).optional(),
  mime: z.string().optional(),
  size: z.number().int().positive().optional(),
  media_id: z.string().uuid().optional(),
});
type BodyT = z.infer<typeof Body>;

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersForRequest(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

async function getInvite(admin: SupabaseClient, id: string) {
  const { data } = await admin
    .schema("anthem")
    .from("creator_invitations")
    .select(`${INVITE_COLS}, approved_at, contact_email`)
    .eq("id", id)
    .maybeSingle<InviteRow>();
  return data;
}

async function links(inv: InviteRow) {
  const t = await decryptToken(inv.token_cipher);
  const r = await decryptToken(inv.review_token_cipher);
  return { invite_link: t ? inviteLink(t) : null, review_link: r ? reviewLink(r) : null };
}

// ---------------------------------------------------------------------------
async function create(req: Request, admin: SupabaseClient, userId: string, raw: unknown) {
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success)
    return json(
      req,
      { error: "invalid", issues: parsed.error.issues.map((i) => i.path.join(".")) },
      400,
    );
  const v = parsed.data;
  const isEmail = EMAIL_RE.test(v.contact);
  if ((v.send_mode === "email_now" || v.send_mode === "scheduled") && !isEmail)
    return json(req, { error: "email_required_for_send_mode" }, 400);
  if (
    v.send_mode === "scheduled" &&
    (!v.scheduled_at || new Date(v.scheduled_at).getTime() < Date.now() - 60_000)
  )
    return json(req, { error: "scheduled_at_required" }, 400);
  if (v.interest_url && !/^https?:\/\//i.test(v.interest_url))
    return json(req, { error: "invalid", issues: ["interest_url"] }, 400);

  const tok = await mintToken();
  const { data: row, error } = await admin
    .schema("anthem")
    .from("creator_invitations")
    .insert({
      token_hash: tok.hash,
      token_cipher: tok.cipher,
      display_name: v.display_name,
      discipline: v.discipline || null,
      country: v.country || null,
      contact_email: isEmail ? v.contact.toLowerCase() : null,
      social_handle: isEmail ? null : v.contact,
      language: v.language,
      personal_note: v.personal_note || null,
      interest_url: v.interest_url || null,
      send_mode: v.send_mode,
      scheduled_at: v.send_mode === "scheduled" ? v.scheduled_at : null,
      auto_reminder: isEmail && v.auto_reminder,
      expires_at: new Date(Date.now() + v.expires_days * 86400_000).toISOString(),
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !row) {
    console.error("[creator-invite-admin] create", error?.message);
    return json(req, { error: "create_failed" }, 500);
  }
  await logEvent(admin, row.id, "created", "admin", userId, {
    send_mode: v.send_mode,
    language: v.language,
  });
  let mail = null;
  if (v.send_mode !== "manual_dm") {
    await enqueueEmail(
      admin,
      row.id,
      "invite",
      v.send_mode === "scheduled" ? v.scheduled_at : null,
    );
    if (v.send_mode === "email_now") mail = await processOutbox(admin, 5);
  }
  return json(req, { id: row.id, invite_link: inviteLink(tok.token), mail });
}

async function bulk(
  req: Request,
  admin: SupabaseClient,
  userId: string,
  ids: string[],
  kind: "invite" | "reminder",
) {
  const queued: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  const anthem = admin.schema("anthem");
  for (const id of ids) {
    const inv = await getInvite(admin, id);
    if (!inv) {
      skipped.push({ id, reason: "not_found" });
      continue;
    }
    if (!inv.contact_email) {
      skipped.push({ id, reason: "no_email" });
      continue;
    }
    if (inv.unsubscribed_at) {
      skipped.push({ id, reason: "unsubscribed" });
      continue;
    }
    if (!isActive(inv)) {
      skipped.push({ id, reason: "inactive" });
      continue;
    }
    if (kind === "reminder" && !["sent", "opened", "started"].includes(inv.status)) {
      skipped.push({ id, reason: "not_waiting" });
      continue;
    }
    const { count } = await anthem
      .from("invite_email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("invitation_id", id)
      .eq("kind", kind)
      .in("status", ["pending", "sending"]);
    if ((count ?? 0) > 0) {
      skipped.push({ id, reason: "already_queued" });
      continue;
    }
    await enqueueEmail(admin, id, kind);
    await logEvent(admin, id, `${kind}_queued`, "admin", userId, { bulk: ids.length > 1 });
    queued.push(id);
  }
  const mail = queued.length ? await processOutbox(admin, 50) : null;
  return json(req, { queued: queued.length, skipped, mail });
}

async function sendReview(req: Request, admin: SupabaseClient, userId: string, inv: InviteRow) {
  if (!["preparing", "needs_changes"].includes(inv.status))
    return json(req, { error: "start_draft_first" }, 409);
  const tok = await mintToken();
  const now = new Date();
  await admin
    .schema("anthem")
    .from("creator_invitations")
    .update({
      review_token_hash: tok.hash,
      review_token_cipher: tok.cipher,
      review_expires_at: new Date(now.getTime() + REVIEW_LINK_DAYS * 86400_000).toISOString(),
      review_sent_at: now.toISOString(),
      status: "preparing",
    })
    .eq("id", inv.id);
  // Snapshot the draft that was sent, so the team can look back at (or restore) each review round.
  const anthem = admin.schema("anthem");
  const [{ data: sub }, { count: rounds }] = await Promise.all([
    anthem.from("invite_submissions").select("staff_draft").eq("invitation_id", inv.id).maybeSingle(),
    anthem
      .from("invite_events")
      .select("id", { count: "exact", head: true })
      .eq("invitation_id", inv.id)
      .eq("kind", "review_link_created"),
  ]);
  await logEvent(admin, inv.id, "review_link_created", "admin", userId, {
    round: (rounds ?? 0) + 1,
    draft: sub?.staff_draft ?? null,
  });
  let mail = null;
  if (inv.contact_email) {
    await enqueueEmail(admin, inv.id, "review");
    mail = await processOutbox(admin, 5);
  }
  return json(req, { review_link: reviewLink(tok.token), emailed: !!inv.contact_email, mail });
}

// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);
  const auth = await requireAdminUser(req, "creator-invite-admin");
  if (!auth.ok) return json(req, { error: auth.error }, auth.status);

  let body: BodyT;
  try {
    body = Body.parse(await req.json());
  } catch {
    return json(req, { error: "bad_request" }, 400);
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, supabaseSecretKey());
  const anthem = admin.schema("anthem");
  const uid = auth.userId;

  try {
    if (body.action === "create") return await create(req, admin, uid, body.invite);
    if (body.action === "send" || body.action === "remind") {
      const ids = body.ids ?? (body.id ? [body.id] : []);
      if (!ids.length) return json(req, { error: "ids_required" }, 400);
      return await bulk(req, admin, uid, ids, body.action === "send" ? "invite" : "reminder");
    }

    if (!body.id) return json(req, { error: "id_required" }, 400);
    const inv = await getInvite(admin, body.id);
    if (!inv) return json(req, { error: "not_found" }, 404);

    switch (body.action) {
      case "links":
        return json(req, await links(inv));
      case "mark_sent": {
        const patch: Record<string, unknown> = {
          sent_at: new Date().toISOString(),
          sent_channel: body.channel || "dm",
        };
        if (inv.status === "draft") patch.status = "sent";
        await anthem.from("creator_invitations").update(patch).eq("id", inv.id);
        await logEvent(admin, inv.id, "marked_sent", "admin", uid, {
          channel: body.channel || "dm",
        });
        return json(req, { ok: true });
      }
      case "revoke":
        await anthem
          .from("creator_invitations")
          .update({ revoked_at: new Date().toISOString() })
          .eq("id", inv.id);
        await anthem
          .from("invite_email_outbox")
          .update({ status: "skipped", last_error: "revoked" })
          .eq("invitation_id", inv.id)
          .eq("status", "pending");
        await logEvent(admin, inv.id, "revoked", "admin", uid);
        return json(req, { ok: true });
      case "extend": {
        const days = body.days ?? 14;
        const base = Math.max(Date.now(), new Date(inv.expires_at).getTime());
        const patch: Record<string, unknown> = {
          expires_at: new Date(base + days * 86400_000).toISOString(),
          revoked_at: null,
        };
        if (inv.status === "expired") patch.status = inv.sent_at ? "sent" : "draft";
        if (inv.review_expires_at)
          patch.review_expires_at = new Date(
            Math.max(Date.now(), new Date(inv.review_expires_at).getTime()) + days * 86400_000,
          ).toISOString();
        await anthem.from("creator_invitations").update(patch).eq("id", inv.id);
        await logEvent(admin, inv.id, "extended", "admin", uid, { days });
        return json(req, { ok: true, expires_at: patch.expires_at });
      }
      case "regenerate_link": {
        const tok = await mintToken();
        await anthem
          .from("creator_invitations")
          .update({ token_hash: tok.hash, token_cipher: tok.cipher })
          .eq("id", inv.id);
        await logEvent(admin, inv.id, "link_regenerated", "admin", uid);
        return json(req, { invite_link: inviteLink(tok.token) });
      }
      case "start_draft": {
        if (!["submitted", "needs_changes", "started", "opened", "sent"].includes(inv.status))
          return json(req, { error: "wrong_status" }, 409);
        const { data: sub } = await anthem
          .from("invite_submissions")
          .select("data, staff_draft")
          .eq("invitation_id", inv.id)
          .maybeSingle();
        if (!sub) return json(req, { error: "nothing_submitted" }, 409);
        if (!sub.staff_draft)
          await anthem
            .from("invite_submissions")
            .update({ staff_draft: sub.data })
            .eq("invitation_id", inv.id);
        await anthem.from("creator_invitations").update({ status: "preparing" }).eq("id", inv.id);
        await logEvent(admin, inv.id, "draft_started", "admin", uid);
        return json(req, { ok: true });
      }
      case "save_draft": {
        if (!["preparing", "needs_changes", "submitted"].includes(inv.status))
          return json(req, { error: "wrong_status" }, 409);
        const parsed = SubmissionSchema.safeParse(body.draft ?? {});
        if (!parsed.success) return json(req, { error: "invalid_draft" }, 400);
        await anthem
          .from("invite_submissions")
          .update({ staff_draft: parsed.data })
          .eq("invitation_id", inv.id);
        await logEvent(admin, inv.id, "draft_saved", "admin", uid);
        return json(req, { ok: true });
      }
      case "send_review":
        return await sendReview(req, admin, uid, inv);
      case "publish":
        if (inv.status !== "approved") return json(req, { error: "needs_artist_approval" }, 409);
        {
          const res = await publishInvitation(admin, inv, "admin", uid);
          return json(req, res.body, res.status);
        }
      case "media_upload_url": {
        const EXT: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        };
        if (!body.slot || !EXT[body.mime ?? ""]) return json(req, { error: "file_type" }, 400);
        if ((body.size ?? 0) > 20 * 1024 * 1024) return json(req, { error: "file_too_large" }, 400);
        const mid = crypto.randomUUID();
        const path = `${inv.id}/${body.slot}/${mid}.${EXT[body.mime!]}`;
        const { data: signed, error } = await admin.storage
          .from(INVITE_BUCKET)
          .createSignedUploadUrl(path);
        if (error || !signed) return json(req, { error: "upload_unavailable" }, 500);
        const { error: insErr } = await anthem.from("invite_media").insert({
          id: mid,
          invitation_id: inv.id,
          slot: body.slot,
          storage_path: path,
          mime: body.mime,
          size_bytes: body.size,
        });
        if (insErr) return json(req, { error: "upload_unavailable" }, 500);
        return json(req, { media_id: mid, bucket: INVITE_BUCKET, path, token: signed.token });
      }
      case "media_upload_done": {
        const { data: m } = await anthem
          .from("invite_media")
          .select("id, storage_path, mime")
          .eq("id", body.media_id ?? "")
          .eq("invitation_id", inv.id)
          .maybeSingle();
        if (!m) return json(req, { error: "not_found" }, 404);
        const { data: blob } = await admin.storage.from(INVITE_BUCKET).download(m.storage_path);
        if (!blob) return json(req, { error: "not_uploaded" }, 409);
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const ext = m.mime === "image/png" ? "png" : m.mime === "image/webp" ? "webp" : "jpg";
        if (!signatureMatchesExtension(ext, bytes) || bytes.byteLength > 20 * 1024 * 1024) {
          await admin.storage.from(INVITE_BUCKET).remove([m.storage_path]);
          await anthem
            .from("invite_media")
            .update({ scan_status: "blocked", scan_note: "signature_mismatch" })
            .eq("id", m.id);
          return json(req, { error: "file_rejected" }, 400);
        }
        await anthem
          .from("invite_media")
          .update({
            scan_status: "clean",
            size_bytes: bytes.byteLength,
            scan_note: "uploaded_by_team",
          })
          .eq("id", m.id);
        await logEvent(admin, inv.id, "media_added_by_team", "admin", uid, { media_id: m.id });
        const urls = await signedMediaUrls(admin, [m]);
        return json(req, { ok: true, scan_status: "clean", url: urls[m.id] ?? null });
      }
      case "media_urls": {
        const { data } = await anthem
          .from("invite_media")
          .select("id, storage_path")
          .eq("invitation_id", inv.id)
          .eq("scan_status", "clean");
        return json(req, {
          urls: await signedMediaUrls(
            admin,
            (data ?? []) as { id: string; storage_path: string }[],
          ),
        });
      }
      case "delete_data":
        await purgeInvitation(admin, inv.id);
        console.log("[creator-invite-admin] purged", inv.id, "by", uid);
        return json(req, { ok: true });
    }
    return json(req, { error: "unknown_action" }, 400);
  } catch (e) {
    console.error("[creator-invite-admin]", body.action, (e as Error).message);
    return json(req, { error: "server_error" }, 500);
  }
});
