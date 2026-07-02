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

/** Owner preview — public profile as visitors see it (not gift-simulation). */
export function profileVisitorPreviewPath(profile: ProfileLinkInput): string {
  return `${profilePublicPath(profile)}?preview=1`;
}
