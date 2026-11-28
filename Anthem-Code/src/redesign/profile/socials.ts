import { parseSocialLinks } from "@/lib/parseSocialLinks";
import { safeHttpUrl } from "@/lib/safeUrl";

/** Facebook, LINE and the other links of a profile (old site: facebook, line_id, social_links). */
export type Socials = {
  facebook: string;
  facebookLabel: string;
  line: string;
  lineHref: string;
  links: { key: string; title: string; href: string }[];
};

export const NO_SOCIALS: Socials = { facebook: "", facebookLabel: "", line: "", lineHref: "", links: [] };

/** Same rule as the old profile form: a full https URL or just the page name. */
export const FACEBOOK_OK = (v: string) => !v || /^https?:\/\//i.test(v) || /^[a-zA-Z0-9.\-_]+$/.test(v);

export const facebookUrl = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return safeHttpUrl(s) ?? "";
  return /^[a-zA-Z0-9.\-_]+$/.test(s) ? `https://facebook.com/${encodeURIComponent(s)}` : "";
};

const facebookLabelOf = (url: string) =>
  url
    .replace(/^https?:\/\/(www\.|m\.)?facebook\.com\//i, "")
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");

/** LINE's add-friend link for a LINE ID. */
export const lineUrl = (id: string) => (id ? `https://line.me/ti/p/~${encodeURIComponent(id)}` : "");

/** "instagram.com/x" — enough to tell two links apart. */
const linkKey = (href: string) =>
  href
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^(www\.|m\.)/, "")
    .replace(/\/+$/, "");

type SocialSource = {
  facebook?: string | null;
  line_id?: string | null;
  social_links?: unknown;
  instagram?: string | null;
  website?: string | null;
};

export function socialsOf(p: SocialSource | null | undefined): Socials {
  if (!p) return NO_SOCIALS;
  const raw = parseSocialLinks(p.social_links);
  // The old links editor also kept Facebook as a link: use it when the column is empty.
  const facebook = facebookUrl(p.facebook) || (safeHttpUrl(raw.find((l) => l.id === "facebook")?.url) ?? "");
  const line = (p.line_id ?? "").trim();
  // Instagram, Facebook and the website already have their own icons.
  const ig = (p.instagram ?? "").trim().replace(/^@/, "").replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "").replace(/\/+$/, "");
  const taken = new Set([facebook, ig ? `https://instagram.com/${ig}` : "", p.website?.trim() ? (/^https?:\/\//i.test(p.website.trim()) ? p.website.trim() : `https://${p.website.trim()}`) : ""].filter(Boolean).map(linkKey));
  const links = raw
    .map((l) => ({ key: l.id || l.url, title: l.title.trim(), href: safeHttpUrl(l.url) ?? "" }))
    .filter((l) => l.title && l.href && !taken.has(linkKey(l.href)));
  return { facebook, facebookLabel: facebookLabelOf(facebook), line, lineHref: lineUrl(line), links };
}

export const hasSocials = (s: Socials) => !!(s.facebook || s.line || s.links.length);
