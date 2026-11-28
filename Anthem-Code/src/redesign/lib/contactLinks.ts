/** Contact links of a profile (Work page, Profile page): Instagram handle or URL, website, public e-mail. */
export const instagramUrl = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  const h = s.replace(/^@/, "").replace(/^(www\.)?instagram\.com\//i, "").replace(/\/+$/, "");
  return h ? `https://www.instagram.com/${h}/` : "";
};

/** "@handle" shown next to the Instagram link. */
export const instagramHandle = (v: string | null | undefined) => {
  const url = instagramUrl(v);
  const m = url.match(/instagram\.com\/([^/?#]+)/i);
  return m ? m[1] : "";
};

export const websiteUrl = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

/** Website without the scheme and the trailing slash (mock: "nok.studio"). */
export const websiteLabel = (v: string | null | undefined) => websiteUrl(v).replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "");

export const mailUrl = (v: string | null | undefined) => (v?.trim() ? `mailto:${v.trim()}` : "");
