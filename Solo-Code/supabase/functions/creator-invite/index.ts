/**
 * Creator Invitation — public API for invitees (no account needed). Token-gated, rate-limited,
 * service role inside. Actions:
 *   load, open, save, upload_url, upload_done, media_remove, submit, unsubscribe   (invite token)
 *   review_load, review_decide                                                     (review token)
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeadersForRequest } from "../_shared/cors.ts";
import { supabaseSecretKey } from "../_shared/supabase-keys.ts";
import { signatureMatchesExtension } from "../_shared/asset-content-checks.ts";
import { virusTotalConfigured, virusTotalScanFile } from "../_shared/virustotal.ts";
import { publishInvitation } from "../_shared/creator-invite-publish.ts";
import {
  CONSENT_TEXT_VERSION,
  DECLINE_PURGE_DAYS,
  INVITE_BUCKET,
  INVITE_COLS,
  type InviteRow,
  enqueueEmail,
  hashToken,
  ipHash,
  isActive,
  isTokenShape,
  logEvent,
  processOutbox,
  signedMediaUrls,
} from "../_shared/creator-invite-core.ts";
import {
  SubmissionSchema,
  type Submission,
  validateForSubmit,
} from "../_shared/creator-invite-schema.ts";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
const MAX_PER_PROJECT = 8;
const MAX_MEDIA_TOTAL = 30; // avatar + cover + 3 projects × 8 (+ slack for retries)
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const EDITABLE = new Set(["draft", "sent", "opened", "started", "submitted"]);
const REVIEWABLE = new Set(["preparing", "needs_changes"]);

/** Per-IP limits [requests, window seconds]. */
const LIMITS: Record<string, [number, number]> = {
  load: [60, 600],
  open: [20, 600],
  save: [240, 600],
  upload_url: [60, 3600],
  upload_done: [60, 3600],
  media_remove: [60, 3600],
  submit: [10, 3600],
  unsubscribe: [10, 3600],
  review_load: [60, 600],
  review_decide: [10, 3600],
  review_upload_url: [40, 3600],
  review_upload_done: [40, 3600],
  review_media_remove: [40, 3600],
};

const Body = z.object({
  action: z.enum([
    "load",
    "open",
    "save",
    "upload_url",
    "upload_done",
    "media_remove",
    "submit",
    "unsubscribe",
    "review_load",
    "review_decide",
    // images the artist attaches to a change request (slot "extra"), via the review link
    "review_upload_url",
    "review_upload_done",
    "review_media_remove",
  ]),
  token: z.string(),
  data: z.unknown().optional(),
  mode: z.enum(["full", "quick"]).optional(),
  slot: z.enum(["avatar", "cover", "p1", "p2", "p3", "extra"]).optional(),
  mime: z.string().optional(),
  size: z.number().int().positive().optional(),
  media_id: z.string().uuid().optional(),
  consent: z.boolean().optional(),
  decision: z.enum(["approve", "changes", "decline"]).optional(),
  note: z.string().max(2000).optional(),
});
type BodyT = z.infer<typeof Body>;

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersForRequest(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });

type Ctx = { req: Request; admin: SupabaseClient; inv: InviteRow; body: BodyT };

function publicInvite(inv: InviteRow & Record<string, unknown>) {
  return {
    display_name: inv.display_name,
    discipline: inv.discipline,
    country: inv.country,
    language: inv.language,
    personal_note: inv.personal_note,
    status: inv.status,
    expires_at: inv.expires_at,
    submit_mode: inv.submit_mode ?? null,
    submitted_at: inv.submitted_at ?? null,
    can_edit: EDITABLE.has(inv.status),
    unsubscribed: !!inv.unsubscribed_at,
  };
}

async function loadMedia(admin: SupabaseClient, invitationId: string) {
  const { data } = await admin
    .schema("anthem")
    .from("invite_media")
    .select("id, slot, storage_path, mime, size_bytes, scan_status, created_at")
    .eq("invitation_id", invitationId)
    .in("scan_status", ["scanning", "clean"])
    .order("created_at");
  const rows = (data ?? []) as {
    id: string;
    slot: string;
    storage_path: string;
    mime: string;
    size_bytes: number;
    scan_status: string;
  }[];
  const urls = await signedMediaUrls(
    admin,
    rows.filter((r) => r.scan_status === "clean"),
  );
  return rows.map((r) => ({
    id: r.id,
    slot: r.slot,
    mime: r.mime,
    size_bytes: r.size_bytes,
    scan_status: r.scan_status,
    url: urls[r.id] ?? null,
  }));
}

async function loadSubmission(admin: SupabaseClient, invitationId: string) {
  const { data } = await admin
    .schema("anthem")
    .from("invite_submissions")
    .select("data, staff_draft, submitted_at")
    .eq("invitation_id", invitationId)
    .maybeSingle();
  return data as {
    data: Record<string, unknown>;
    staff_draft: Record<string, unknown> | null;
    submitted_at: string | null;
  } | null;
}

/** Drop media ids that do not belong to this invitation / slot. */
async function sanitizeMediaRefs(
  admin: SupabaseClient,
  invitationId: string,
  s: Submission,
): Promise<Submission> {
  const { data } = await admin
    .schema("anthem")
    .from("invite_media")
    .select("id, slot")
    .eq("invitation_id", invitationId)
    .neq("scan_status", "blocked");
  const owned = new Map((data ?? []).map((m: { id: string; slot: string }) => [m.id, m.slot]));
  return {
    ...s,
    about: {
      ...s.about,
      avatar: s.about.avatar && owned.get(s.about.avatar) === "avatar" ? s.about.avatar : null,
      cover: s.about.cover && owned.get(s.about.cover) === "cover" ? s.about.cover : null,
    },
    projects: s.projects.map((p) => ({
      ...p,
      media: [...new Set(p.media)].filter((m) => owned.get(m) === p.slot),
    })),
  };
}

async function markStarted(ctx: Ctx) {
  const { admin, inv } = ctx;
  if (["draft", "sent", "opened"].includes(inv.status)) {
    await admin
      .schema("anthem")
      .from("creator_invitations")
      .update({ status: "started", started_at: new Date().toISOString() })
      .eq("id", inv.id);
    await logEvent(admin, inv.id, "started", "artist");
    inv.status = "started";
  }
}

// ---------------------------------------------------------------------------
// Invite-token actions
// ---------------------------------------------------------------------------
async function actLoad(ctx: Ctx) {
  const { admin, inv, req } = ctx;
  const sub = await loadSubmission(admin, inv.id);
  return json(req, {
    invite: publicInvite(inv as InviteRow & Record<string, unknown>),
    submission: sub?.data ?? null,
    media: await loadMedia(admin, inv.id),
  });
}

/** Explicit interaction (a path button), not a tracking pixel — this is what "Opened" means here. */
async function actOpen(ctx: Ctx) {
  const { admin, inv, req } = ctx;
  if (["draft", "sent"].includes(inv.status)) {
    await admin
      .schema("anthem")
      .from("creator_invitations")
      .update({ status: "opened", opened_at: new Date().toISOString() })
      .eq("id", inv.id);
    await logEvent(admin, inv.id, "opened", "artist");
  }
  return json(req, { ok: true });
}

async function actSave(ctx: Ctx) {
  const { admin, inv, req, body } = ctx;
  if (!EDITABLE.has(inv.status)) return json(req, { error: "locked" }, 409);
  const parsed = SubmissionSchema.safeParse(body.data ?? {});
  if (!parsed.success) return json(req, { error: "invalid_data" }, 400);
  const clean = await sanitizeMediaRefs(admin, inv.id, parsed.data);
  const { error } = await admin
    .schema("anthem")
    .from("invite_submissions")
    .upsert(
      { invitation_id: inv.id, data: clean, updated_at: new Date().toISOString() },
      { onConflict: "invitation_id" },
    );
  if (error) {
    console.error("[creator-invite] save", error.message);
    return json(req, { error: "save_failed" }, 500);
  }
  await markStarted(ctx);
  return json(req, { ok: true, saved_at: new Date().toISOString() });
}

/** Invite link: the artist's own form (while editable). Review link: change-request attachments only. */
function canUpload(ctx: Ctx): boolean {
  return ctx.body.action.startsWith("review_")
    ? REVIEWABLE.has(ctx.inv.status)
    : EDITABLE.has(ctx.inv.status);
}

async function actUploadUrl(ctx: Ctx) {
  const { admin, inv, req, body } = ctx;
  if (!canUpload(ctx)) return json(req, { error: "locked" }, 409);
  const reviewMode = body.action.startsWith("review_");
  if (reviewMode !== (body.slot === "extra")) return json(req, { error: "file_type" }, 400);
  const slot = body.slot;
  const mime = body.mime ?? "";
  const size = body.size ?? 0;
  if (!slot || !EXT[mime]) return json(req, { error: "file_type" }, 400);
  if (size > (slot === "avatar" ? MAX_AVATAR_BYTES : MAX_IMAGE_BYTES))
    return json(req, { error: "file_too_large" }, 400);
  const anthem = admin.schema("anthem");
  const { data: existing } = await anthem
    .from("invite_media")
    .select("id, slot, scan_status")
    .eq("invitation_id", inv.id)
    .neq("scan_status", "blocked");
  const rows = (existing ?? []) as { id: string; slot: string; scan_status: string }[];
  if (rows.length >= MAX_MEDIA_TOTAL) return json(req, { error: "too_many_files" }, 400);
  const single = slot === "avatar" || slot === "cover";
  // single-image slots ignore abandoned uploads, so a failed attempt never blocks a retry
  if (
    rows.filter((r) => r.slot === slot && (!single || r.scan_status !== "pending_upload")).length >=
    (single ? 1 : MAX_PER_PROJECT)
  )
    return json(req, { error: "too_many_files" }, 400);

  const id = crypto.randomUUID();
  const path = `${inv.id}/${slot}/${id}.${EXT[mime]}`;
  const { data: signed, error } = await admin.storage
    .from(INVITE_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !signed) {
    console.error("[creator-invite] signed upload", error?.message);
    return json(req, { error: "upload_unavailable" }, 500);
  }
  const { error: insErr } = await anthem
    .from("invite_media")
    .insert({ id, invitation_id: inv.id, slot, storage_path: path, mime, size_bytes: size });
  if (insErr) return json(req, { error: "upload_unavailable" }, 500);
  await markStarted(ctx);
  return json(req, { media_id: id, bucket: INVITE_BUCKET, path, token: signed.token });
}

async function actUploadDone(ctx: Ctx) {
  const { admin, inv, req, body } = ctx;
  const anthem = admin.schema("anthem");
  const { data: m } = await anthem
    .from("invite_media")
    .select("id, slot, storage_path, mime, scan_status")
    .eq("id", body.media_id ?? "")
    .eq("invitation_id", inv.id)
    .maybeSingle();
  if (!m) return json(req, { error: "not_found" }, 404);
  if (m.scan_status === "clean") return json(req, { ok: true, scan_status: "clean" });

  const { data: blob, error } = await admin.storage.from(INVITE_BUCKET).download(m.storage_path);
  if (error || !blob) return json(req, { error: "not_uploaded" }, 409);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const limit = m.slot === "avatar" ? MAX_AVATAR_BYTES : MAX_IMAGE_BYTES;
  const okSig = signatureMatchesExtension(EXT[m.mime], bytes);
  if (!okSig || bytes.byteLength > limit || bytes.byteLength === 0) {
    await admin.storage.from(INVITE_BUCKET).remove([m.storage_path]);
    await anthem
      .from("invite_media")
      .update({ scan_status: "blocked", scan_note: okSig ? "size" : "signature_mismatch" })
      .eq("id", m.id);
    await logEvent(admin, inv.id, "media_blocked", "system", null, {
      media_id: m.id,
      reason: okSig ? "size" : "signature_mismatch",
    });
    return json(req, { error: "file_rejected" }, 400);
  }
  await anthem
    .from("invite_media")
    .update({
      scan_status: "clean",
      size_bytes: bytes.byteLength,
      scan_note: virusTotalConfigured() ? "signature_ok; vt_pending" : "signature_ok",
    })
    .eq("id", m.id);

  // Images cannot run code and the bytes match their type; the malware check finishes in the background.
  if (virusTotalConfigured()) {
    const bg = (async () => {
      const vt = await virusTotalScanFile(bytes);
      if (!vt.clean && !vt.unavailable) {
        await admin.storage.from(INVITE_BUCKET).remove([m.storage_path]);
        await anthem
          .from("invite_media")
          .update({ scan_status: "blocked", scan_note: `virustotal: ${vt.reason ?? "flagged"}` })
          .eq("id", m.id);
        await logEvent(admin, inv.id, "media_blocked", "system", null, {
          media_id: m.id,
          reason: "virustotal",
        });
      } else {
        await anthem
          .from("invite_media")
          .update({
            scan_note: vt.unavailable ? "signature_ok; vt_unavailable" : "signature_ok; vt_clean",
          })
          .eq("id", m.id);
      }
    })();
    (
      globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }
    ).EdgeRuntime?.waitUntil?.(bg);
  }
  const urls = await signedMediaUrls(admin, [m]);
  return json(req, { ok: true, scan_status: "clean", url: urls[m.id] ?? null });
}

async function actMediaRemove(ctx: Ctx) {
  const { admin, inv, req, body } = ctx;
  if (!canUpload(ctx)) return json(req, { error: "locked" }, 409);
  const anthem = admin.schema("anthem");
  const { data: m } = await anthem
    .from("invite_media")
    .select("id, storage_path")
    .eq("id", body.media_id ?? "")
    .eq("invitation_id", inv.id)
    .maybeSingle();
  if (!m) return json(req, { ok: true });
  await admin.storage.from(INVITE_BUCKET).remove([m.storage_path]);
  await anthem.from("invite_media").delete().eq("id", m.id);
  return json(req, { ok: true });
}

async function actSubmit(ctx: Ctx) {
  const { admin, inv, req, body } = ctx;
  if (!EDITABLE.has(inv.status)) return json(req, { error: "locked" }, 409);
  const mode = body.mode ?? "full";
  if (body.consent !== true) return json(req, { error: "consent_required" }, 400);
  const parsed = SubmissionSchema.safeParse(body.data ?? {});
  if (!parsed.success) return json(req, { error: "invalid_data" }, 400);
  const data = await sanitizeMediaRefs(admin, inv.id, parsed.data);
  const anthem = admin.schema("anthem");
  const { data: clean } = await anthem
    .from("invite_media")
    .select("id")
    .eq("invitation_id", inv.id)
    .eq("scan_status", "clean");
  const errors = validateForSubmit(
    mode,
    data,
    new Set((clean ?? []).map((r: { id: string }) => r.id)),
  );
  if (errors.length) return json(req, { error: "validation", fields: errors }, 422);

  const now = new Date().toISOString();
  const resubmit = inv.status === "submitted";
  await anthem
    .from("invite_submissions")
    .upsert(
      { invitation_id: inv.id, data, updated_at: now, submitted_at: now },
      { onConflict: "invitation_id" },
    );

  const ua = (req.headers.get("user-agent") ?? "").slice(0, 200);
  const ip = await ipHash(req);
  const consents = [
    {
      invitation_id: inv.id,
      kind: "draft_permission",
      scope: mode,
      text_version: CONSENT_TEXT_VERSION,
      ip_hash: ip,
      user_agent: ua,
    },
  ];
  if (mode === "full") {
    for (const p of data.projects) {
      if (p.rights)
        consents.push({
          invitation_id: inv.id,
          kind: "image_rights",
          scope: p.slot,
          text_version: CONSENT_TEXT_VERSION,
          ip_hash: ip,
          user_agent: ua,
        });
    }
  }
  const { error: cErr } = await anthem.from("invite_consents").insert(consents);
  if (cErr) {
    console.error("[creator-invite] consent", cErr.message);
    return json(req, { error: "submit_failed" }, 500);
  }

  const patch: Record<string, unknown> = {
    status: "submitted",
    submitted_at: now,
    submit_mode: mode,
  };
  if (!inv.contact_email && data.about.email) patch.contact_email = data.about.email.toLowerCase();
  if (inv.status !== "submitted")
    patch.started_at = (inv as unknown as { started_at?: string }).started_at ?? now;
  await anthem.from("creator_invitations").update(patch).eq("id", inv.id);
  await logEvent(admin, inv.id, resubmit ? "submission_updated" : "submitted", "artist", null, {
    mode,
    projects: data.projects.length,
  });

  if (!resubmit) {
    try {
      await enqueueEmail(admin, inv.id, "received");
      await processOutbox(admin, 5);
    } catch (e) {
      console.error("[creator-invite] received email", (e as Error).message);
    }
  }
  return json(req, { ok: true, status: "submitted" });
}

async function actUnsubscribe(ctx: Ctx) {
  const { admin, inv, req } = ctx;
  const anthem = admin.schema("anthem");
  if (!inv.unsubscribed_at) {
    await anthem
      .from("creator_invitations")
      .update({ unsubscribed_at: new Date().toISOString(), auto_reminder: false })
      .eq("id", inv.id);
    await anthem
      .from("invite_email_outbox")
      .update({ status: "skipped", last_error: "unsubscribed" })
      .eq("invitation_id", inv.id)
      .eq("status", "pending")
      .in("kind", ["invite", "reminder"]);
    await logEvent(admin, inv.id, "unsubscribed", "artist");
  }
  return json(req, { ok: true });
}

// ---------------------------------------------------------------------------
// Review-token actions
// ---------------------------------------------------------------------------
async function actReviewLoad(ctx: Ctx) {
  const { admin, inv, req } = ctx;
  const sub = await loadSubmission(admin, inv.id);
  return json(req, {
    invite: {
      display_name: inv.display_name,
      language: inv.language,
      status: inv.status,
      review_expires_at: inv.review_expires_at,
      submitted_at: (inv as unknown as { submitted_at?: string }).submitted_at ?? null,
    },
    profile: sub?.staff_draft ?? sub?.data ?? null,
    media: await loadMedia(admin, inv.id),
  });
}

async function actReviewDecide(ctx: Ctx) {
  const { admin, inv, req, body } = ctx;
  if (!["preparing", "needs_changes"].includes(inv.status))
    return json(req, { error: "already_decided", status: inv.status }, 409);
  const anthem = admin.schema("anthem");
  const now = new Date();
  const note = (body.note ?? "").trim().slice(0, 2000) || null;
  let patch: Record<string, unknown>;
  if (body.decision === "approve") {
    patch = { status: "approved", approved_at: now.toISOString(), change_request_note: null };
    await anthem.from("invite_consents").insert({
      invitation_id: inv.id,
      kind: "publish_approval",
      text_version: CONSENT_TEXT_VERSION,
      ip_hash: await ipHash(req),
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 200),
    });
  } else if (body.decision === "changes") {
    if (!note) return json(req, { error: "note_required" }, 400);
    patch = { status: "needs_changes", change_request_note: note };
  } else if (body.decision === "decline") {
    patch = {
      status: "declined",
      declined_at: now.toISOString(),
      decline_note: note,
      auto_reminder: false,
      delete_after: new Date(now.getTime() + DECLINE_PURGE_DAYS * 86400_000).toISOString(),
    };
  } else return json(req, { error: "invalid_decision" }, 400);
  // Conditional update so a double click can't approve (and publish) twice.
  const { data: changed } = await anthem
    .from("creator_invitations")
    .update(patch)
    .eq("id", inv.id)
    .in("status", ["preparing", "needs_changes"])
    .select("id");
  if (!changed?.length) return json(req, { error: "already_decided" }, 409);
  await logEvent(admin, inv.id, `review_${body.decision}`, "artist", null, note ? { note } : {});
  if (body.decision === "approve") {
    // The artist's approval is the go-ahead: create the account, profile and works right away.
    // If it fails (e.g. the email already has an account) the invitation stays "approved" and the
    // team can retry with the admin "publish" action.
    const res = await publishInvitation(admin, { ...inv, status: "approved" }, "artist", null);
    return json(req, {
      ok: true,
      status: res.status === 200 ? "published" : "approved",
      published: res.status === 200,
      emailed: res.status === 200 ? !!res.body.emailed : false,
    });
  }
  return json(req, { ok: true, status: patch.status });
}

// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  let body: BodyT;
  try {
    body = Body.parse(await req.json());
  } catch {
    return json(req, { error: "bad_request" }, 400);
  }
  if (!isTokenShape(body.token)) return json(req, { error: "not_found" }, 404);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, supabaseSecretKey());
  const [limit, windowS] = LIMITS[body.action];
  const ip = await ipHash(req);
  const { data: allowed } = await admin.rpc("creator_invite_rate_hit", {
    _key: `${body.action}:${ip}`,
    _limit: limit,
    _window_seconds: windowS,
  });
  if (allowed === false) return json(req, { error: "rate_limited" }, 429);

  const review = body.action.startsWith("review_");
  const hash = await hashToken(body.token);
  const { data: inv } = await admin
    .schema("anthem")
    .from("creator_invitations")
    .select(`${INVITE_COLS}, submit_mode, submitted_at, started_at`)
    .eq(review ? "review_token_hash" : "token_hash", hash)
    .maybeSingle<InviteRow>();
  if (!inv) return json(req, { error: "not_found" }, 404);

  if (inv.revoked_at && body.action !== "unsubscribe") return json(req, { error: "expired" }, 410);
  if (review) {
    if (inv.review_expires_at && new Date(inv.review_expires_at).getTime() < Date.now())
      return json(req, { error: "expired" }, 410);
  } else if (body.action !== "unsubscribe") {
    // Before submitting, the invitation's own expiry applies; after that the artist keeps read access.
    const notYetSubmitted = ["draft", "sent", "opened", "started", "expired"].includes(inv.status);
    if (notYetSubmitted && !isActive(inv)) return json(req, { error: "expired" }, 410);
  }

  const ctx: Ctx = { req, admin, inv, body };
  try {
    switch (body.action) {
      case "load":
        return await actLoad(ctx);
      case "open":
        return await actOpen(ctx);
      case "save":
        return await actSave(ctx);
      case "upload_url":
      case "review_upload_url":
        return await actUploadUrl(ctx);
      case "upload_done":
      case "review_upload_done":
        return await actUploadDone(ctx);
      case "media_remove":
      case "review_media_remove":
        return await actMediaRemove(ctx);
      case "submit":
        return await actSubmit(ctx);
      case "unsubscribe":
        return await actUnsubscribe(ctx);
      case "review_load":
        return await actReviewLoad(ctx);
      case "review_decide":
        return await actReviewDecide(ctx);
    }
  } catch (e) {
    console.error("[creator-invite]", body.action, (e as Error).message);
    return json(req, { error: "server_error" }, 500);
  }
});
