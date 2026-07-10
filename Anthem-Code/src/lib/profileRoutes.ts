const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export type ProfileLinkInput = {
  user_id: string;
  username?: string | null;
};

/**
 * Canonical public profile path — prefers @username when set.
 * Note: react-router v6 cannot declare `/@:username`; App.tsx matches via `/:vanityHandle`.
 */
export function profilePublicPath(profile: ProfileLinkInput): string {
  const un = profile.username?.trim();
  if (un) return `/@${un}`;
  return `/u/${profile.user_id}`;
}

export function profilePublicUrl(
  profile: ProfileLinkInput,
  origin = typeof window !== "undefined" ? window.location.origin : "",
): string {
  return `${origin}${profilePublicPath(profile)}`;
}

export type ProfileShareInput = ProfileLinkInput & {
  display_name?: string | null;
  bio?: string | null;
  role?: string | null;
};

/** Social share title — public portfolio, not owner preview. */
export function profileShareTitle(profile: ProfileShareInput): string {
  const name = profile.display_name?.trim() || profile.username?.trim() || "ครีเอเตอร์";
  return `${name} — พอร์ตโฟล์บน Aplus1`;
}

/** Companion text for LINE / device share (no preview URL). */
export function profileShareMessage(profile: ProfileShareInput): string {
  const name = profile.display_name?.trim() || profile.username?.trim() || "ครีเอเตอร์";
  const role = profile.role?.trim();
  const lead = role
    ? `ดูผลงานของ ${name} (${role}) บน Aplus1`
    : `ดูผลงานของ ${name} บน Aplus1`;
  const bio = profile.bio?.trim();
  if (bio && bio.length >= 12) {
    const snippet = bio.length > 96 ? `${bio.slice(0, 96)}…` : bio;
    return `${lead}\n${snippet}`;
  }
  return `${lead}\nสนใจจ้างงานหรือคอลแลปได้ในแพลตฟอร์ม`;
}

/** Short path shown in share UI, e.g. /@username */
export function profilePublicPathLabel(profile: ProfileLinkInput): string {
  return profilePublicPath(profile);
}

/** Owner preview — public profile as visitors see it (not gift-simulation). */
export function profileVisitorPreviewPath(profile: ProfileLinkInput): string {
  return `${profilePublicPath(profile)}?preview=1`;
}
