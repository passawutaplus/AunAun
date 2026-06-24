import { LEGAL } from "@/lib/legalMeta";

const MEMBER_CODE_RE = /^s?[0-9A-F]{7}$/i;

/** Stable short member code from auth user id (e.g. S4F2A1B8). */
export function formatMemberCode(userId: string): string {
  const hex = userId.replace(/-/g, "").toUpperCase();
  return `S${hex.slice(-7)}`;
}

/** @deprecated Use formatMemberCode */
export const formatCustomerId = formatMemberCode;

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

export function memberCodeTicketFooter(userId: string): string {
  return `\n\n---\nรหัสสมาชิก: ${formatMemberCode(userId)}`;
}

export function appendMemberCodeToDescription(
  description: string | undefined | null,
  userId: string,
): string {
  const code = formatMemberCode(userId);
  const base = description?.trim() ?? "";
  if (base.includes(`รหัสสมาชิก: ${code}`)) return base;
  const footer = base ? memberCodeTicketFooter(userId) : `รหัสสมาชิก: ${code}`;
  return `${base}${footer}`;
}

export function siteBrandLabel(): string {
  return `${LEGAL.siteName} © ${new Date().getFullYear()}`;
}

export function userLabelWithMemberCode(label: string, userId: string): string {
  return `${label} · ${formatMemberCode(userId)}`;
}
