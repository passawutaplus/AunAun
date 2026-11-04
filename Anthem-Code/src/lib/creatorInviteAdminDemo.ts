/**
 * DEV-only sample data for the Creator Invitation admin screens, served under /dev/creator-invitations
 * so the layout can be reviewed without an admin login or the edge functions. Never active in production
 * (every caller checks import.meta.env.DEV).
 */
import type { AdminInviteDetail, AdminInviteRow } from "@/hooks/useCreatorInvites";
import type { InviteStatus } from "@/lib/creatorInvite";

export const DEV_ADMIN_BASE = "/dev/creator-invitations";

export function isAdminDemo(): boolean {
  return import.meta.env.DEV && typeof window !== "undefined" && window.location.pathname.startsWith(DEV_ADMIN_BASE);
}

export function adminInviteBase(): string {
  return isAdminDemo() ? DEV_ADMIN_BASE : "/admin/creator-invitations";
}

const day = 86400_000;
const ago = (d: number) => new Date(Date.now() - d * day).toISOString();

const people: [string, string, string, string | null, string | null, InviteStatus, number][] = [
  ["Tanawat K.", "Graphic / Branding", "Thailand", "tanawat@example.com", null, "submitted", 1],
  ["Aphisit S.", "Illustration / Art", "Thailand", null, "@aphisit.draws", "sent", 2],
  ["Lalana C.", "Photography", "Thailand", "lalana@example.com", null, "approved", 2],
  ["Kenji H.", "3D / CG / Game", "Japan", "kenji@example.com", null, "started", 3],
  ["Mali P.", "Craft / Handmade", "Thailand", "mali@example.com", null, "needs_changes", 4],
  ["Noah R.", "UI/UX", "Singapore", "noah@example.com", null, "published", 5],
  ["Ploy W.", "Illustration / Art", "Thailand", null, "@ploywart", "draft", 5],
  ["Somchai T.", "Photography", "Thailand", "somchai@example.com", null, "declined", 7],
];

export const DEMO_ROWS: AdminInviteRow[] = people.map(([name, disc, country, email, handle, status, d], i) => ({
  id: `00000000-0000-4000-9000-00000000000${i}`,
  display_name: name,
  discipline: disc,
  country,
  contact_email: email,
  social_handle: handle,
  language: country === "Thailand" ? "th" : "en",
  send_mode: handle ? "manual_dm" : "email_now",
  status,
  revoked: false,
  unsubscribed: false,
  review_sent_at: status === "approved" || status === "published" ? ago(d - 1) : null,
  sent_at: status === "draft" ? null : ago(d + 1),
  submitted_at: ["submitted", "needs_changes", "approved", "published"].includes(status) ? ago(d) : null,
  expires_at: new Date(Date.now() + 25 * day).toISOString(),
  created_at: ago(d + 2),
  updated_at: ago(d),
}));

const M = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
export const DEMO_MEDIA_URLS: Record<string, string> = {
  [M(1)]: "/invite/aun.webp",
  [M(2)]: "/landing/works/painting.jpg",
  [M(3)]: "/landing/works/riso.jpg",
  [M(4)]: "/landing/works/poster.jpg",
  [M(5)]: "/landing/works/market.jpg",
};

export function demoDetail(id: string | undefined): AdminInviteDetail | null {
  const row = DEMO_ROWS.find((r) => r.id === id);
  if (!row) return null;
  const submitted = !!row.submitted_at;
  const data = {
    about: {
      name: row.display_name,
      discipline: row.discipline ?? "",
      bio: "Graphic designer focused on branding, posters and print.",
      city: `Bangkok, ${row.country}`,
      email: row.contact_email ?? "",
      links: "https://behance.net/example",
      avatar: M(1),
      cover: M(2),
    },
    projects: [
      { slot: "p1", title: "Riso Poster Series", description: "A set of risograph posters exploring pink and teal.", role: "Owner / creator", url: "https://behance.net/example/riso", rights: true, media: [M(3), M(4)] },
      { slot: "p2", title: "Thai Market Illustrations", description: "Night-market scenes in warm lantern light.", role: "Owner / creator", url: "", rights: true, media: [M(5)] },
    ],
    contact_pref: "email",
    contact_handle: "",
    quick: { portfolio_url: "" },
  };
  return {
    invitation: {
      ...row,
      personal_note: null,
      interest_url: "https://behance.net/example",
      auto_reminder: true,
      scheduled_at: null,
      reminder_sent_at: null,
      sent_channel: row.social_handle ? "instagram" : "email",
      opened_at: row.sent_at ? ago(2) : null,
      started_at: submitted || row.status === "started" ? ago(2) : null,
      submit_mode: submitted ? "full" : null,
      approved_at: row.status === "approved" || row.status === "published" ? ago(1) : null,
      change_request_note: row.status === "needs_changes" ? "Please use the second image as the cover." : null,
      declined_at: row.status === "declined" ? ago(1) : null,
      decline_note: null,
      delete_after: row.status === "declined" ? new Date(Date.now() + 29 * day).toISOString() : null,
      published_at: row.status === "published" ? ago(0) : null,
      user_id: null,
      self_signup_at: null,
      account_created_at: row.status === "published" ? ago(0) : null,
      review_expires_at: row.review_sent_at ? new Date(Date.now() + 13 * day).toISOString() : null,
      unsubscribed_at: null,
      revoked_at: null,
    },
    submission: submitted || row.status === "started" ? { data, staff_draft: row.status === "submitted" || row.status === "started" ? null : data, updated_at: ago(1), submitted_at: row.submitted_at } : null,
    media: submitted ? Object.keys(DEMO_MEDIA_URLS).map((mid, i) => ({ id: mid, slot: ["avatar", "cover", "p1", "p1", "p2"][i], mime: "image/jpeg", size_bytes: 1, scan_status: "clean", scan_note: "signature_ok", created_at: ago(1) })) : [],
    consents: submitted
      ? [
          { kind: "draft_permission", scope: "full", text_version: "creator-invite-2026-11-04", granted_at: row.submitted_at! },
          { kind: "image_rights", scope: "p1", text_version: "creator-invite-2026-11-04", granted_at: row.submitted_at! },
          { kind: "image_rights", scope: "p2", text_version: "creator-invite-2026-11-04", granted_at: row.submitted_at! },
        ]
      : [],
    events: [
      ...(submitted ? [{ kind: "submitted", actor_type: "artist", actor: null, detail: {}, created_at: row.submitted_at! }] : []),
      ...(row.sent_at ? [{ kind: row.social_handle ? "marked_sent" : "email_invite_sent", actor_type: row.social_handle ? "admin" : "system", actor: row.social_handle ? "Aun" : null, detail: {}, created_at: row.sent_at }] : []),
      { kind: "created", actor_type: "admin", actor: "Aun", detail: {}, created_at: row.created_at },
    ],
    emails: row.contact_email && row.sent_at ? [{ kind: "invite", status: "sent", not_before: row.sent_at, sent_at: row.sent_at, attempts: 1, last_error: null }] : [],
  } as AdminInviteDetail;
}

/** Fake responses for admin actions so buttons can be clicked in the preview. */
export function demoAction(body: Record<string, unknown>): Record<string, unknown> {
  const link = "http://localhost:8081/invite/creator/devdemo000000000000000000000000000000000000";
  switch (body.action) {
    case "links":
      return { invite_link: link, review_link: "http://localhost:8081/invite/review/devdemo000000000000000000000000000000000000" };
    case "create":
      return { id: DEMO_ROWS[0].id, invite_link: link, mail: { sent: 1, failed: 0 } };
    case "send":
    case "remind":
      return { queued: Array.isArray(body.ids) ? body.ids.length : 1, skipped: [], mail: { sent: 1, deferred: 0 } };
    case "send_review":
      return { review_link: "http://localhost:8081/invite/review/devdemo000000000000000000000000000000000000", emailed: true };
    case "publish":
      return { ok: true, projects: 2, emailed: true, username: "tanawat" };
    case "media_urls":
      return { urls: DEMO_MEDIA_URLS };
    default:
      return { ok: true };
  }
}
