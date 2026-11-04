/**
 * DEV-only fixtures so the invitee pages can be checked in `npm run dev` before the edge functions
 * are deployed. Open /invite/creator/<DEV_INVITE_TOKEN> or /invite/review/<DEV_INVITE_TOKEN>.
 * Never active in production builds (guarded by import.meta.env.DEV at every call site).
 */
import type { InviteMedia, InviteSubmission, PublicInvite } from "@/lib/creatorInvite";

export const DEV_INVITE_TOKEN = "devdemo".padEnd(43, "0");

const invite: PublicInvite = {
  display_name: "Tanawat K.",
  discipline: "Graphic / Branding",
  country: "Thailand",
  language: "th",
  personal_note: "ผมสนใจผลงานของคุณ เลยอยากชวนมาเป็นครีเอเตอร์กลุ่มแรกของเรา",
  status: "sent",
  expires_at: new Date(Date.now() + 20 * 86400_000).toISOString(),
  submit_mode: null,
  submitted_at: null,
  can_edit: true,
  unsubscribed: false,
};
let submission: InviteSubmission | null = null;
const media = new Map<string, InviteMedia>();

const wait = <T,>(v: T) => new Promise<T>((r) => window.setTimeout(() => r(v), 250));

export const devInviteApi = {
  load: () => wait({ invite: { ...invite }, submission, media: [...media.values()] }),
  open: () => wait({ ok: true }),
  save: (data: InviteSubmission) => {
    submission = data;
    return wait({ saved_at: new Date().toISOString() });
  },
  submit: (mode: "full" | "quick", data: InviteSubmission) => {
    submission = data;
    Object.assign(invite, { status: "submitted", submit_mode: mode, submitted_at: new Date().toISOString() });
    return wait({ ok: true });
  },
  upload: (slot: InviteMedia["slot"], file: File): Promise<InviteMedia> => {
    const m: InviteMedia = { id: crypto.randomUUID(), slot, mime: file.type, size_bytes: file.size, scan_status: "clean", url: URL.createObjectURL(file) };
    media.set(m.id, m);
    return wait(m);
  },
  review: () =>
    wait({
      invite: { display_name: invite.display_name, language: invite.language, status: "preparing" as const, review_expires_at: new Date(Date.now() + 14 * 86400_000).toISOString() },
      profile: submission ?? {
        about: { name: "Tanawat K.", discipline: "Graphic / Branding", bio: "นักออกแบบที่เน้นงานแบรนด์และงานพิมพ์", city: "Bangkok, Thailand", email: "", links: "https://behance.net/example", avatar: null },
        projects: [{ slot: "p1", title: "Identity system", description: "", role: "Lead designer", url: "", rights: true, media: [] }],
      },
      media: [...media.values()],
    }),
};
