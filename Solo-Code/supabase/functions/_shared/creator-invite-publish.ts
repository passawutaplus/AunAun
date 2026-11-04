/** Shared publish step for Creator Invitations (admin publish + artist approve). */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { anthemSiteUrl } from "./anthem-email-html.ts";
import { sendResendEmail } from "./resend-send.ts";
import {
  INVITE_BUCKET,
  TEMP_PASSWORD_DAYS,
  type InviteRow,
  inviteEmailFrom,
  logEvent,
  randomPassword,
  renderInviteEmail,
} from "./creator-invite-core.ts";
import { EMAIL_RE, SubmissionSchema, type Submission } from "./creator-invite-schema.ts";

export type PublishResult = { status: number; body: Record<string, unknown> };

const RIGHTS_ATTESTATION_VERSION = "2026-08-14";
const PROJECT_CATEGORIES = new Set([
  "Graphic / Branding",
  "Advertising / Campaign",
  "Illustration / Art",
  "UI/UX",
  "Web / App",
  "Motion / Animation",
  "Video / Film",
  "Photography",
  "3D / CG / Game",
  "Art Toy / Model",
  "Architecture / Interior",
  "Product / Industrial",
  "Fashion / Textile",
  "Craft / Handmade",
  "Content / Social",
  "Writing / Storytelling",
  "Music / Audio",
  "AI / Experimental",
]);

/** Copy a private invite image into the public portfolio bucket. */
async function copyToPortfolio(
  admin: SupabaseClient,
  uid: string,
  folder: string,
  m: { storage_path: string; mime: string },
) {
  const { data: blob, error } = await admin.storage.from(INVITE_BUCKET).download(m.storage_path);
  if (error || !blob) throw new Error("media_download_failed");
  const ext = m.mime === "image/png" ? "png" : m.mime === "image/webp" ? "webp" : "jpg";
  const path = `anthem/${uid}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await admin.storage
    .from("project-media")
    .upload(path, blob, { contentType: m.mime, upsert: false });
  if (upErr) throw new Error(`media_upload_failed: ${upErr.message}`);
  return admin.storage.from("project-media").getPublicUrl(path).data.publicUrl;
}

/**
 * Publish an approved invitation: create (or reuse) the account, fill the profile, copy images to the
 * public portfolio bucket, insert 1–3 projects and email the account-ready message. Called by the admin
 * "publish" action and automatically when the artist approves the review link.
 */
export async function publishInvitation(
  admin: SupabaseClient,
  inv: InviteRow,
  actorType: "admin" | "artist",
  userId: string | null,
): Promise<PublishResult> {
  if (inv.status !== "approved") return { status: 409, body: { error: "needs_artist_approval" } };
  const anthem = admin.schema("anthem");
  const { data: sub } = await anthem
    .from("invite_submissions")
    .select("data, staff_draft")
    .eq("invitation_id", inv.id)
    .maybeSingle();
  const parsed = SubmissionSchema.safeParse(sub?.staff_draft ?? sub?.data ?? {});
  if (!parsed.success) return { status: 422, body: { error: "draft_invalid" } };
  const draft: Submission = parsed.data;
  const email = (inv.contact_email ?? draft.about.email ?? "").toLowerCase();
  if (!EMAIL_RE.test(email)) return { status: 422, body: { error: "email_required" } };

  // 1) Account: reuse the account the artist created through the invitation, else create one.
  let uid = inv.user_id;
  let password: string | null = null;
  if (!uid) {
    password = randomPassword(20);
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: draft.about.name || inv.display_name,
        must_change_password: true,
        source: "creator_invite",
      },
    });
    if (error || !created?.user) {
      const exists = /already|registered|exists/i.test(error?.message ?? "");
      return {
        status: exists ? 409 : 500,
        body: { error: exists ? "email_has_account" : "account_create_failed" },
      };
    }
    uid = created.user.id;
    await logEvent(admin, inv.id, "account_created", actorType, userId, { user_id: uid });
  }

  try {
    // 2) Media
    const { data: mediaRows } = await anthem
      .from("invite_media")
      .select("id, slot, storage_path, mime")
      .eq("invitation_id", inv.id)
      .eq("scan_status", "clean");
    const media = new Map(
      (mediaRows ?? []).map(
        (m: { id: string; slot: string; storage_path: string; mime: string }) => [m.id, m],
      ),
    );

    // 3) Profile
    const profilePatch: Record<string, unknown> = {
      display_name: draft.about.name || inv.display_name,
      bio: draft.about.bio || null,
      location: draft.about.city || inv.country || null,
      locale: inv.language,
    };
    const site = draft.about.links.split(/\s+/).find((u) => /^https:\/\//i.test(u));
    if (site) profilePatch.website = site;
    const avatar = draft.about.avatar ? media.get(draft.about.avatar) : undefined;
    if (avatar) profilePatch.avatar_url = await copyToPortfolio(admin, uid, "avatar", avatar);
    const cover = draft.about.cover ? media.get(draft.about.cover) : undefined;
    if (cover) profilePatch.cover_url = await copyToPortfolio(admin, uid, "cover", cover);
    const { error: pErr } = await admin.from("profiles").update(profilePatch).eq("user_id", uid);
    if (pErr) throw new Error(`profile: ${pErr.message}`);

    // 4) Projects (1–3), published with the artist's rights confirmation
    const created: string[] = [];
    for (const p of draft.projects) {
      const imgs = p.media.map((id) => media.get(id)).filter(Boolean) as {
        storage_path: string;
        mime: string;
      }[];
      if (!p.title || imgs.length === 0) continue;
      const projectId = crypto.randomUUID();
      const urls: string[] = [];
      for (const m of imgs) urls.push(await copyToPortfolio(admin, uid, projectId, m));
      const category = PROJECT_CATEGORIES.has(draft.about.discipline)
        ? draft.about.discipline
        : PROJECT_CATEGORIES.has(inv.discipline ?? "")
          ? inv.discipline
          : null;
      const { error: prErr } = await anthem.from("projects").insert({
        id: projectId,
        owner_id: uid,
        title: p.title,
        description: p.description || null,
        category,
        cover_url: urls[0],
        gallery_urls: urls.slice(1),
        creator_role: p.role || null,
        status: "Published",
        license_type: "all_rights",
        copyright_holder: draft.about.name || inv.display_name,
        rights_attested_at: new Date().toISOString(),
        rights_attestation_version: RIGHTS_ATTESTATION_VERSION,
        external_links: p.url ? [{ url: p.url, label: "Project link" }] : [],
        gallery_display_mode: urls.length > 1 ? "gallery" : "single",
      });
      if (prErr) throw new Error(`project: ${prErr.message}`);
      created.push(projectId);
    }

    // 5) Invitation → published
    const now = new Date();
    await anthem
      .from("creator_invitations")
      .update({
        status: "published",
        published_at: now.toISOString(),
        user_id: uid,
        account_created_at: password ? now.toISOString() : null,
        account_temp_expires_at: password
          ? new Date(now.getTime() + TEMP_PASSWORD_DAYS * 86400_000).toISOString()
          : null,
      })
      .eq("id", inv.id);
    await logEvent(admin, inv.id, "published", actorType, userId, {
      projects: created.length,
      new_account: !!password,
    });

    // 6) Account-ready email — sent directly (never queued) because it carries the one-time password.
    const { data: prof } = await admin
      .from("profiles")
      .select("username")
      .eq("user_id", uid)
      .maybeSingle();
    const site_ = anthemSiteUrl();
    const mail = renderInviteEmail("account", {
      lang: inv.language,
      name: draft.about.name || inv.display_name,
      link: `${site_}/auth`,
      profileUrl: password
        ? `${site_}/auth`
        : prof?.username
          ? `${site_}/@${prof.username}`
          : site_,
      email,
      password: password ?? undefined,
    });
    const { from, replyTo } = inviteEmailFrom();
    const r = await sendResendEmail({
      to: email,
      from,
      replyTo,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      idempotencyKey: `creator-invite-account-${inv.id}`,
    });
    password = null;
    await logEvent(
      admin,
      inv.id,
      r.ok ? "email_account_sent" : "email_account_failed",
      "system",
      null,
      r.ok ? { provider_id: r.id ?? null } : { error: r.message.slice(0, 200) },
    );
    return {
      status: 200,
      body: {
        ok: true,
        user_id: uid,
        username: prof?.username ?? null,
        projects: created.length,
        emailed: r.ok,
      },
    };
  } catch (e) {
    console.error("[creator-invite] publish", (e as Error).message);
    await logEvent(admin, inv.id, "publish_failed", actorType, userId, {
      error: (e as Error).message.slice(0, 200),
    });
    return {
      status: 500,
      body: { error: "publish_failed", detail: (e as Error).message.slice(0, 200) },
    };
  }
}
