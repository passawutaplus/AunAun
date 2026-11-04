/**
 * Creator Invitation V1 — client types, validation and API calls.
 * Server: Solo-Code/supabase/functions/creator-invite (public) + creator-invite-admin (admin).
 */
import { supabase } from "@/integrations/supabase/client";
import type { ProjectCategory } from "@/data/projectTypes";
import { DEV_INVITE_TOKEN, devInviteApi } from "@/lib/creatorInviteDemo";

export type InviteLang = "th" | "en";
/** Languages the invitee pages can show (emails stay TH/EN). */
export type PageLang = InviteLang | "zh";
export type ProjectSlot = "p1" | "p2" | "p3";
export const PROJECT_SLOTS: ProjectSlot[] = ["p1", "p2", "p3"];
export const MAX_PROJECTS = 3;
/** "extra" = images attached to a change request from the review page. */
export type MediaSlot = "avatar" | "cover" | ProjectSlot | "extra";

export type InviteStatus =
  | "draft"
  | "sent"
  | "opened"
  | "started"
  | "submitted"
  | "preparing"
  | "needs_changes"
  | "approved"
  | "published"
  | "declined"
  | "expired";

export interface InviteProject {
  slot: ProjectSlot;
  title: string;
  description: string;
  role: string;
  url: string;
  rights: boolean;
  media: string[];
}

export interface InviteSubmission {
  about: {
    name: string;
    discipline: string;
    bio: string;
    city: string;
    email: string;
    links: string;
    avatar: string | null;
    cover: string | null;
  };
  projects: InviteProject[];
  contact_pref: "" | "email" | "instagram" | "line" | "other";
  /** IG / LINE / other account when contact_pref is not email */
  contact_handle: string;
  quick: { portfolio_url: string };
}

export interface InviteMedia {
  id: string;
  slot: MediaSlot;
  mime: string;
  size_bytes: number;
  scan_status: "scanning" | "clean";
  url: string | null;
}

export interface PublicInvite {
  display_name: string;
  discipline: string | null;
  country: string | null;
  language: InviteLang;
  personal_note: string | null;
  status: InviteStatus;
  expires_at: string | null;
  submit_mode: "full" | "quick" | null;
  submitted_at: string | null;
  can_edit: boolean;
  unsubscribed: boolean;
}

export const BIO_MAX = 300;
export const MAX_IMAGES_PER_PROJECT = 8;
export const MAX_IMAGE_MB = 20;
export const MAX_AVATAR_MB = 10;
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Disciplines = the platform's project categories, so a published project lands in the right feed. */
export const INVITE_DISCIPLINES: ProjectCategory[] = [
  "Graphic / Branding",
  "Illustration / Art",
  "Photography",
  "Video / Film",
  "Motion / Animation",
  "UI/UX",
  "3D / CG / Game",
  "Product / Industrial",
  "Craft / Handmade",
  "Architecture / Interior",
  "Fashion / Textile",
  "Art Toy / Model",
  "Content / Social",
  "Writing / Storytelling",
  "Music / Audio",
  "AI / Experimental",
  "Advertising / Campaign",
  "Web / App",
];

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const HTTPS_RE = /^https:\/\/[^\s]+\.[^\s]+$/i;

export function emptyProject(slot: ProjectSlot): InviteProject {
  return {
    slot,
    title: "",
    description: "",
    role: "",
    url: "",
    rights: false,
    media: [],
  };
}

export function emptySubmission(
  invite?: Pick<PublicInvite, "display_name" | "discipline"> | null,
): InviteSubmission {
  return {
    about: {
      name: invite?.display_name ?? "",
      discipline:
        invite?.discipline &&
        INVITE_DISCIPLINES.includes(invite.discipline as ProjectCategory)
          ? invite.discipline
          : "",
      bio: "",
      city: "",
      email: "",
      links: "",
      avatar: null,
      cover: null,
    },
    projects: [emptyProject("p1")],
    contact_pref: "",
    contact_handle: "",
    quick: { portfolio_url: "" },
  };
}

/** Accepts whatever the server stored (older drafts, staff edits) and fills the gaps. */
export function normalizeSubmission(
  raw: unknown,
  invite?: PublicInvite | null,
): InviteSubmission {
  const base = emptySubmission(invite);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<InviteSubmission>;
  const projects =
    Array.isArray(r.projects) && r.projects.length
      ? r.projects.slice(0, MAX_PROJECTS).map((p, i) => ({
          ...emptyProject(PROJECT_SLOTS[i]),
          ...p,
          media: Array.isArray(p?.media) ? p.media : [],
        }))
      : base.projects;
  return {
    about: { ...base.about, ...(r.about ?? {}) },
    projects,
    contact_pref: r.contact_pref ?? "",
    contact_handle: r.contact_handle ?? "",
    quick: { ...base.quick, ...(r.quick ?? {}) },
  };
}

export type FieldErrors = Record<string, true>;

/** Client-side checks for one step of the full form (the server repeats them on submit). */
export function validateStep(
  step: 1 | 2 | 3,
  s: InviteSubmission,
  clean: Set<string>,
  consent: boolean,
): FieldErrors {
  const e: FieldErrors = {};
  if (step === 1) {
    if (!s.about.name.trim()) e["about.name"] = true;
    if (!s.about.discipline) e["about.discipline"] = true;
    if (!EMAIL_RE.test(s.about.email.trim())) e["about.email"] = true;
    if (s.about.bio.length > BIO_MAX) e["about.bio"] = true;
    if (!s.about.avatar || !clean.has(s.about.avatar)) e["about.avatar"] = true;
  }
  if (step === 2) {
    if (s.projects.length === 0) e.projects = true;
    s.projects.forEach((p, i) => {
      if (!p.title.trim()) e[`projects.${i}.title`] = true;
      if (!p.media.some((m) => clean.has(m))) e[`projects.${i}.media`] = true;
      if (!p.rights) e[`projects.${i}.rights`] = true;
      if (p.url && !HTTPS_RE.test(p.url)) e[`projects.${i}.url`] = true;
    });
  }
  if (step === 3) {
    if (!consent) e.consent = true;
    if (!s.contact_pref) e.contact_pref = true;
    else if (s.contact_pref !== "email" && !s.contact_handle.trim())
      e.contact_handle = true;
  }
  return e;
}

export function validateQuick(
  s: InviteSubmission,
  consent: boolean,
): FieldErrors {
  const e: FieldErrors = {};
  if (!s.about.name.trim()) e["about.name"] = true;
  if (!EMAIL_RE.test(s.about.email.trim())) e["about.email"] = true;
  const links = s.quick.portfolio_url
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (
    links.length === 0 ||
    links.length > 3 ||
    !links.every((l) => HTTPS_RE.test(l))
  )
    e["quick.portfolio_url"] = true;
  if (!consent) e.consent = true;
  return e;
}

export function isTokenShape(t: string | undefined): t is string {
  return !!t && /^[A-Za-z0-9_-]{43}$/.test(t);
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
export class InviteApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    public fields?: string[],
  ) {
    super(code);
  }
}

async function readError(error: unknown): Promise<InviteApiError> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = (await ctx.clone().json()) as {
        error?: string;
        fields?: string[];
      };
      return new InviteApiError(
        body.error ?? "server_error",
        ctx.status,
        body.fields,
      );
    } catch {
      return new InviteApiError("server_error", ctx.status ?? 500);
    }
  }
  return new InviteApiError("network", 0);
}

export async function inviteCall<T = Record<string, unknown>>(
  fn: "creator-invite" | "creator-invite-admin",
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw await readError(error);
  return data as T;
}

const demo = (token: string) =>
  import.meta.env.DEV && token === DEV_INVITE_TOKEN;

export const publicInviteApi = {
  load: (token: string) =>
    demo(token)
      ? devInviteApi.load()
      : inviteCall<{
          invite: PublicInvite;
          submission: unknown;
          media: InviteMedia[];
        }>("creator-invite", { action: "load", token }),
  open: (token: string) =>
    demo(token)
      ? devInviteApi.open()
      : inviteCall("creator-invite", { action: "open", token }),
  save: (token: string, data: InviteSubmission) =>
    demo(token)
      ? devInviteApi.save(data)
      : inviteCall<{ saved_at: string }>("creator-invite", {
          action: "save",
          token,
          data,
        }),
  submit: (token: string, mode: "full" | "quick", data: InviteSubmission) =>
    demo(token)
      ? devInviteApi.submit(mode, data)
      : inviteCall("creator-invite", {
          action: "submit",
          token,
          mode,
          data,
          consent: true,
        }),
  reviewRemoveMedia: (token: string, mediaId: string) =>
    demo(token)
      ? Promise.resolve({})
      : inviteCall("creator-invite", {
          action: "review_media_remove",
          token,
          media_id: mediaId,
        }),
  removeMedia: (token: string, mediaId: string) =>
    demo(token)
      ? Promise.resolve({})
      : inviteCall("creator-invite", {
          action: "media_remove",
          token,
          media_id: mediaId,
        }),
  unsubscribe: (token: string) =>
    demo(token)
      ? Promise.resolve({})
      : inviteCall("creator-invite", { action: "unsubscribe", token }),
  reviewLoad: (token: string) =>
    demo(token)
      ? devInviteApi.review()
      : inviteCall<{
          invite: {
            display_name: string;
            language: InviteLang;
            status: InviteStatus;
            review_expires_at: string | null;
          };
          profile: unknown;
          media: InviteMedia[];
        }>("creator-invite", { action: "review_load", token }),
  reviewDecide: (
    token: string,
    decision: "approve" | "changes" | "decline",
    note?: string,
  ) =>
    demo(token)
      ? Promise.resolve({
          published: decision === "approve",
          status: (decision === "approve"
            ? "published"
            : decision === "changes"
              ? "needs_changes"
              : "declined") as InviteStatus,
        })
      : inviteCall<{ status: InviteStatus; published?: boolean }>(
          "creator-invite",
          {
            action: "review_decide",
            token,
            decision,
            note,
          },
        ),
};

/** Signed upload into the private invite bucket, then a server-side type/size/malware check. */
export async function uploadInviteImage(
  token: string,
  slot: MediaSlot,
  file: File,
  via: "invite" | "review" = "invite",
): Promise<InviteMedia> {
  const prefix = via === "review" ? "review_" : "";
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type))
    throw new InviteApiError("file_type", 400);
  const maxMb = slot === "avatar" ? MAX_AVATAR_MB : MAX_IMAGE_MB;
  if (file.size > maxMb * 1024 * 1024)
    throw new InviteApiError("file_too_large", 400);
  if (demo(token)) return devInviteApi.upload(slot, file);
  const signed = await inviteCall<{
    media_id: string;
    bucket: string;
    path: string;
    token: string;
  }>("creator-invite", {
    action: `${prefix}upload_url`,
    token,
    slot,
    mime: file.type,
    size: file.size,
  });
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file, {
      contentType: file.type,
    });
  if (error) throw new InviteApiError("upload_failed", 500);
  const done = await inviteCall<{ scan_status: "clean"; url: string | null }>(
    "creator-invite",
    {
      action: `${prefix}upload_done`,
      token,
      media_id: signed.media_id,
    },
  );
  return {
    id: signed.media_id,
    slot,
    mime: file.type,
    size_bytes: file.size,
    scan_status: done.scan_status,
    url: done.url,
  };
}

// "I'll create my profile": remember the invitation through sign-up, link it once signed in.
const SELF_SIGNUP_KEY = "samecor.creatorInvite.pending";
export function rememberSelfSignup(token: string) {
  try {
    localStorage.setItem(
      SELF_SIGNUP_KEY,
      JSON.stringify({ token, at: Date.now() }),
    );
  } catch {
    /* storage blocked — the team can still link it by hand */
  }
}
export function pendingSelfSignup(): string | null {
  try {
    const raw = localStorage.getItem(SELF_SIGNUP_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { token?: string; at?: number };
    if (!v.token || !v.at || Date.now() - v.at > 30 * 86400_000) return null;
    return v.token;
  } catch {
    return null;
  }
}
export function clearSelfSignup() {
  try {
    localStorage.removeItem(SELF_SIGNUP_KEY);
  } catch {
    /* ignore */
  }
}
