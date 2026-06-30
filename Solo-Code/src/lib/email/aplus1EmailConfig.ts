/** Aplus1 transactional email sender — separate from So1o / Lovable. */

export const APLUS1_FROM_DOMAIN =
  (process.env.APLUS1_EMAIL_FROM_DOMAIN as string | undefined) ?? "aplus1.app";

export const APLUS1_SENDER_DOMAIN =
  (process.env.APLUS1_EMAIL_SENDER_DOMAIN as string | undefined) ?? "notify.aplus1.app";

export const APLUS1_EMAIL_FROM =
  (process.env.APLUS1_EMAIL_FROM as string | undefined) ??
  `Aplus1 <noreply@${APLUS1_FROM_DOMAIN}>`;

export function isAplus1SenderDomain(senderDomain: string | undefined | null): boolean {
  if (!senderDomain) return false;
  const normalized = senderDomain.toLowerCase();
  return (
    normalized === APLUS1_SENDER_DOMAIN.toLowerCase() ||
    normalized === APLUS1_FROM_DOMAIN.toLowerCase() ||
    normalized.endsWith(".aplus1.app")
  );
}
