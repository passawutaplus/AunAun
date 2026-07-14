export const HIRE_FORWARD_PREFIX = "__APLUS1_HIRE_FORWARD__:";

export type HireForwardChatPayload = {
  v: 1;
  /** New hire request created for the forwarded creator */
  requestId: string;
  /** Original hire request id (this conversation) */
  fromRequestId: string;
  toUserId: string;
  toName: string;
  toUsername?: string | null;
  toAvatarUrl?: string | null;
  /** @deprecated Friend note is private — do not show to client. Kept optional for old messages. */
  note?: string | null;
};

export function isHireForwardContent(content: string | null | undefined): boolean {
  return !!content?.startsWith(HIRE_FORWARD_PREFIX);
}

export function encodeHireForwardMessage(payload: HireForwardChatPayload): string {
  return `${HIRE_FORWARD_PREFIX}${JSON.stringify(payload)}`;
}

export function parseHireForwardMessage(
  content: string | null | undefined,
): HireForwardChatPayload | null {
  if (!content?.startsWith(HIRE_FORWARD_PREFIX)) return null;
  try {
    const raw = JSON.parse(content.slice(HIRE_FORWARD_PREFIX.length)) as HireForwardChatPayload;
    if (!raw?.requestId || !raw?.toUserId || !raw?.fromRequestId) return null;
    return { ...raw, v: 1 };
  } catch {
    return null;
  }
}
