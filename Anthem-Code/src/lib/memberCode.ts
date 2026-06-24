const MEMBER_CODE_RE = /^S?[0-9A-Fa-f]{7}$/;

export function formatMemberCode(userId: string): string {
  const hex = userId.replace(/-/g, "").toUpperCase();
  return `S${hex.slice(-7)}`;
}

export function parseMemberCodeSuffix(query: string): string | null {
  const trimmed = query.trim();
  if (!MEMBER_CODE_RE.test(trimmed)) return null;
  return trimmed.replace(/^S/i, "").toUpperCase();
}

export function memberCodeMatchesUserId(query: string, userId: string): boolean {
  const suffix = parseMemberCodeSuffix(query);
  if (!suffix) return false;
  const hex = userId.replace(/-/g, "").toUpperCase();
  return hex.endsWith(suffix);
}
