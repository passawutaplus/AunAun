/** Encoded hire work-delivery card in chat thread. */

export const HIRE_DELIVERY_PREFIX = "__APLUS1_HIRE_DELIVERY__:";

export type HireDeliveryChatPayload = {
  v: 1;
  orderId: string;
  deliveryId: string;
  links: string[];
  note?: string | null;
  revision: number;
  submittedAt: string;
};

export function encodeHireDeliveryMessage(payload: HireDeliveryChatPayload): string {
  return `${HIRE_DELIVERY_PREFIX}${JSON.stringify(payload)}`;
}

export function parseHireDeliveryMessage(content: string | null | undefined): HireDeliveryChatPayload | null {
  if (!content?.includes(HIRE_DELIVERY_PREFIX)) return null;
  const idx = content.indexOf(HIRE_DELIVERY_PREFIX);
  const raw = content.slice(idx + HIRE_DELIVERY_PREFIX.length);
  try {
    const parsed = JSON.parse(raw) as HireDeliveryChatPayload;
    if (parsed?.v !== 1 || !parsed.orderId || !parsed.deliveryId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isHireDeliveryMessage(content: string | null | undefined): boolean {
  return !!content && content.includes(HIRE_DELIVERY_PREFIX);
}
