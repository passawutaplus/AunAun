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
  personal_note: null,
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
  review: () => {
    // A fresh tab has no uploads in memory: show a complete sample draft built from public example images.
    const sample = (id: string, slot: InviteMedia["slot"], url: string): InviteMedia => ({ id, slot, mime: "image/jpeg", size_bytes: 1, scan_status: "clean", url });
    const sampleMedia = [
      sample("00000000-0000-4000-8000-000000000001", "avatar", "/invite/aun.webp"),
      sample("00000000-0000-4000-8000-000000000002", "cover", "/landing/works/painting.jpg"),
      sample("00000000-0000-4000-8000-000000000003", "p1", "/landing/works/riso.jpg"),
      sample("00000000-0000-4000-8000-000000000004", "p1", "/landing/works/poster.jpg"),
      sample("00000000-0000-4000-8000-000000000005", "p2", "/landing/works/market.jpg"),
      sample("00000000-0000-4000-8000-000000000006", "p3", "/landing/works/chrome.jpg"),
      sample("00000000-0000-4000-8000-000000000007", "p3", "/landing/works/ring.jpg"),
    ];
    const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
    return wait({
      invite: { display_name: invite.display_name, language: invite.language, status: "preparing" as const, review_expires_at: new Date(Date.now() + 14 * 86400_000).toISOString() },
      profile: submission ?? {
        about: { name: "Tanawat K.", discipline: "Graphic / Branding", bio: "Graphic designer focused on branding, posters and print.", city: "Bangkok, Thailand", email: "tanawat@example.com", links: "https://behance.net/example", avatar: id(1), cover: id(2) },
        projects: [
          { slot: "p1", title: "Riso Poster Series", description: "A set of three risograph posters exploring pink and teal.", role: "Owner / creator", url: "https://behance.net/example/riso", rights: true, media: [id(3), id(4)] },
          { slot: "p2", title: "Thai Market Illustrations", description: "Night-market scenes in warm lantern light.", role: "Owner / creator", url: "", rights: true, media: [id(5)] },
          { slot: "p3", title: "Silver Chrome Objects", description: "3D still-life studies in liquid chrome.", role: "Part of the team", url: "", rights: true, media: [id(6), id(7)] },
        ],
      },
      media: submission ? [...media.values()] : sampleMedia,
    });
  },
};
