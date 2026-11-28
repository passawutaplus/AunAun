/**
 * EventPost (mock EventPost.dc.html) ↔ anthem.events. The form keeps the mock's fields; this file says where each
 * one lives (event_save `_data`, migration 20261129100000):
 *   TYPE → category (Talk = talk_forum) · TITLE → title · COVER → cover_url + cover_size · DETAILS (pictures) →
 *   gallery_urls + media_sizes · ABOUT → description · OPEN CALL: DEADLINE / WHO CAN APPLY / HOW TO APPLY (one step
 *   a line) / PRIZES → insights deadline / eligibility / steps / benefits (the "Summary" of the Event page) ·
 *   DATES → starts_on, ends_on (no end = one day) · PLACE → location_name: venues joined with " · ", or "ออนไลน์" ·
 *   LINK → registration_url (open call) or website_url · TIME → time_note · ADMISSION / PRICE → fee_type / fee_note
 *   ("200 บาท") · ORGANIZER → organizer_name · PDF → insights.pdf (a "download" link of the Event page).
 * Fields the form does not show (sponsors, works, ticket link, place note) are sent back as they were.
 */
import { EVENT_INSIGHT_LISTS, isSafeEventLink } from "@/lib/exhibitionEvents";
import type { MyEventRow } from "@/server/queries/eventPost";
import type { Media } from "../upload/model";

export const EP_TYPES = [
  ["Exhibition", "exhibition"],
  ["Open Call", "open_call"],
  ["Workshop", "workshop"],
  ["Talk", "talk_forum"],
  ["Art Fair", "art_fair"],
  ["Meetup", "meetup"],
] as const;
export type EpType = (typeof EP_TYPES)[number][0];

export const ONLINE = "ออนไลน์";
const VENUE_SEP = " · ";
/** Column limits of anthem.events (and event_insights_clean's 140 per line). */
export const EP_LIMITS = { title: 100, about: 2000, place: 120, time: 60, price: 40, org: 100, line: 140, steps: EVENT_INSIGHT_LISTS.steps } as const;

export type Venue = { id: string; val: string };
export type EpPdf = { name: string; url: string; size?: string };

export type EpForm = {
  type: EpType | null;
  title: string;
  /** Media id of the cover (media map of useWorkUploads). */
  coverId: string | null;
  /** Media ids of the detail pictures, in order. */
  details: string[];
  about: string;
  deadline: string;
  who: string;
  how: string;
  prize: string;
  start: string;
  end: string;
  place: "Venue" | "Online";
  venues: Venue[];
  link: string;
  time: string;
  fee: "Free" | "Paid";
  price: string;
  org: string;
  pdf: EpPdf | null;
};

export function emptyForm(): EpForm {
  return {
    type: null,
    title: "",
    coverId: null,
    details: [],
    about: "",
    deadline: "",
    who: "",
    how: "",
    prize: "",
    start: "",
    end: "",
    place: "Venue",
    venues: [{ id: "v1", val: "" }],
    link: "",
    time: "",
    fee: "Free",
    price: "",
    org: "",
    pdf: null,
  };
}

export const typeOf = (category: string | null | undefined): EpType | null => EP_TYPES.find((t) => t[1] === category)?.[0] ?? null;
export const categoryOf = (type: EpType | null): string => EP_TYPES.find((t) => t[0] === type)?.[1] ?? "exhibition";

const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim()) : []);
const sizeOk = (s: unknown): s is [number, number] => Array.isArray(s) && s.length === 2 && s.every((n) => typeof n === "number" && n > 0);

/** The member's own PDF: a "download" link from their events folder. */
export function ownPdf(insights: unknown, ownerId: string): EpPdf | null {
  const links = insights && typeof insights === "object" ? (insights as { links?: unknown }).links : null;
  if (!Array.isArray(links)) return null;
  const mine = links.find(
    (l): l is { label: string; url: string } =>
      !!l && typeof l === "object" && (l as { kind?: string }).kind === "download" && typeof (l as { url?: string }).url === "string" && (l as { url: string }).url.includes(`/anthem/${ownerId}/events/`) && /\.pdf$/i.test((l as { url: string }).url),
  );
  return mine ? { name: typeof mine.label === "string" && mine.label.trim() ? mine.label.trim() : "ประกาศ (PDF)", url: mine.url } : null;
}

/** An event of the member → the form, with the media map for its pictures. */
export function fromRow(row: MyEventRow): { form: EpForm; media: Record<string, Media>; moreOpen: boolean } {
  const media: Record<string, Media> = {};
  const sizeOf = (url: string, isCover: boolean): [number, number] | null => {
    if (isCover && row.cover_width && row.cover_height) return [row.cover_width, row.cover_height];
    const s = row.media_sizes?.[url];
    return sizeOk(s) ? s : null;
  };
  const coverId = row.cover_url ? "c0" : null;
  if (row.cover_url) media.c0 = { kind: "image", url: row.cover_url, size: sizeOf(row.cover_url, true), progress: null, name: "" };
  const details = (row.gallery_urls ?? []).map((url, i) => {
    const id = `g${i}`;
    media[id] = { kind: "image", url, size: sizeOf(url, false), progress: null, name: "" };
    return id;
  });
  const ins = row.insights && typeof row.insights === "object" ? (row.insights as Record<string, unknown>) : {};
  const type = typeOf(row.category);
  const isOC = type === "Open Call";
  const loc = row.location_name?.trim() ?? "";
  const online = /^(ออนไลน์|online)$/i.test(loc);
  const names = online || !loc ? [""] : loc.split(VENUE_SEP).map((s) => s.trim()).filter(Boolean);
  const form: EpForm = {
    ...emptyForm(),
    type,
    title: row.title ?? "",
    coverId,
    details,
    about: row.description ?? "",
    deadline: isOC && typeof ins.deadline === "string" ? ins.deadline : "",
    who: isOC ? strList(ins.eligibility).join(", ") : "",
    how: isOC ? strList(ins.steps).join("\n") : "",
    prize: isOC ? strList(ins.benefits).join(", ") : "",
    start: row.starts_on ?? "",
    end: row.ends_on && row.ends_on !== row.starts_on ? row.ends_on : "",
    place: online ? "Online" : "Venue",
    venues: (names.length ? names : [""]).map((val, i) => ({ id: `v${i + 1}`, val })),
    link: (isOC ? row.registration_url || row.website_url : row.website_url || row.registration_url) ?? "",
    time: row.time_note ?? "",
    fee: row.fee_type === "paid" ? "Paid" : "Free",
    price: row.fee_type === "paid" ? (row.fee_note ?? "").replace(/\s*บาท\s*$/, "").trim() : "",
    org: row.organizer_name ?? "",
    pdf: ownPdf(row.insights, row.owner_id),
  };
  return { form, media, moreOpen: !!(form.time || form.org || form.fee === "Paid" || form.pdf) };
}

/** "example.com" → "https://example.com"; "http://" → "https://" (event_link_ok wants https). */
export function normalizeLink(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (/^http:\/\//i.test(s)) return `https://${s.slice(7)}`;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) return `https://${s}`;
  return s;
}

export const placeText = (f: EpForm): string =>
  f.place === "Online" ? ONLINE : f.venues.map((v) => v.val.trim()).filter(Boolean).join(VENUE_SEP);

/** What the mock asks before Publish (+ a link that the server would refuse, and an end before the start). */
export function checksOf(f: EpForm) {
  const isOC = f.type === "Open Call";
  const isPaid = f.fee === "Paid";
  const link = normalizeLink(f.link);
  const place = placeText(f);
  const ok = {
    type: !!f.type,
    title: !!f.title.trim(),
    dates: !!f.start && (!f.end || f.end >= f.start),
    place: !!place && place.length <= EP_LIMITS.place,
    link: link ? isSafeEventLink(link) : !isOC,
    dl: !isOC || !!f.deadline,
    price: !isPaid || !!f.price.trim(),
  };
  const ready = Object.values(ok).every(Boolean);
  const list: { key: keyof typeof ok; label: string }[] = [
    { key: "type", label: "Type" },
    { key: "title", label: "Title" },
    { key: "dates", label: "Dates" },
    { key: "place", label: "Place" },
    ...(isOC ? ([{ key: "link", label: "Link" }, { key: "dl", label: "Deadline" }] as const) : []),
    ...(isPaid ? ([{ key: "price", label: "Price" }] as const) : []),
  ];
  return { ok, ready, list };
}

/** Pictures that finished uploading, in form order (cover first). Failed or running ones are left out. */
export function readyPictures(f: EpForm, media: Record<string, Media>) {
  const done = (id: string | null) => (id && media[id]?.url && media[id].progress == null && !media[id].error ? media[id] : null);
  const cover = done(f.coverId);
  const details = f.details.map(done).filter((m): m is Media => !!m);
  return { cover, details };
}

/** The `_data` of event_save. `row`: the event as opened (its other fields go back unchanged). */
export function toSaveData(f: EpForm, media: Record<string, Media>, row: MyEventRow | null): Record<string, unknown> {
  const isOC = f.type === "Open Call";
  const isPaid = f.fee === "Paid";
  const link = normalizeLink(f.link);
  const { cover, details } = readyPictures(f, media);
  const gallery = details.map((m) => m.url).filter((u, i, all) => u !== cover?.url && all.indexOf(u) === i);
  const sizes: Record<string, [number, number]> = {};
  for (const m of [cover, ...details]) if (m?.url && m.size) sizes[m.url] = m.size;
  const steps = f.how
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, EP_LIMITS.steps);
  const end = f.end && f.start && f.end >= f.start ? f.end : f.start;
  return {
    title: f.title.trim(),
    category: categoryOf(f.type),
    starts_on: f.start || null,
    ends_on: end || null,
    time_note: f.time.trim() || null,
    location_name: placeText(f) || null,
    location_note: row?.location_note ?? null,
    description: f.about.trim(),
    organizer_name: f.org.trim() || null,
    cover_url: cover?.url ?? null,
    cover_size: cover?.size ?? null,
    gallery_urls: gallery,
    media_sizes: sizes,
    website_url: isOC ? null : link || null,
    registration_url: isOC ? link || null : null,
    registration_open: isOC && !!link,
    ticket_url: row?.ticket_url ?? null,
    fee_type: isPaid ? "paid" : "free",
    fee_note: isPaid && f.price.trim() ? `${f.price.trim().replace(/\s*บาท\s*$/, "")} บาท` : null,
    sponsors: row?.sponsors ?? [],
    open_for_sponsors: row?.open_for_sponsors ?? false,
    project_ids: row?.project_ids ?? [],
    insights: {
      deadline: isOC && f.deadline ? f.deadline : null,
      eligibility: isOC && f.who.trim() ? [f.who.trim()] : [],
      steps: isOC ? steps : [],
      benefits: isOC && f.prize.trim() ? [f.prize.trim()] : [],
      pdf: f.pdf?.url ? { label: f.pdf.name, url: f.pdf.url } : null,
    },
  };
}

/** For "unsaved changes": the form without upload progress. */
export function snapshot(f: EpForm, media: Record<string, Media>): string {
  const pic = (id: string | null) => (id ? media[id]?.url || media[id]?.preview || id : null);
  return JSON.stringify({ ...f, coverId: pic(f.coverId), details: f.details.map(pic), venues: f.venues.map((v) => v.val) });
}

/** "12 Dec" (mock fmt). */
export function shortDay(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+iso.slice(5, 7) - 1];
  return `${+iso.slice(8, 10)} ${m}`;
}

/** Bytes → "320 KB" / "1.4 MB" (mock PDF row). */
export function fileSize(bytes: number): string {
  const kb = bytes / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(kb))} KB`;
}
