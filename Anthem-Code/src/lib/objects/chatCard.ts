export const OBJECT_CHAT_PREFIX = "[[object]]";

export type ObjectChatCard = {
  id: string;
  title: string;
  price_thb: number;
  cover_url: string | null;
  /** Reserve via chat: what the buyer picked. */
  option?: string;
  qty?: number;
};

export function formatObjectChatCard(card: ObjectChatCard): string {
  return `${OBJECT_CHAT_PREFIX}${JSON.stringify({
    id: card.id,
    title: card.title,
    price_thb: Math.max(0, Math.round(card.price_thb)),
    cover_url: card.cover_url,
    ...(card.option ? { option: card.option.slice(0, 60) } : {}),
    ...(card.qty && card.qty > 1 ? { qty: Math.min(20, Math.round(card.qty)) } : {}),
  })}`;
}

export function parseObjectChatCard(content: string | null | undefined): ObjectChatCard | null {
  const raw = content?.trim() ?? "";
  if (!raw.startsWith(OBJECT_CHAT_PREFIX)) return null;
  try {
    const parsed = JSON.parse(raw.slice(OBJECT_CHAT_PREFIX.length)) as Partial<ObjectChatCard>;
    const id = String(parsed.id ?? "").trim();
    const title = String(parsed.title ?? "").trim();
    if (!id || !title) return null;
    return {
      id,
      title,
      price_thb: Math.max(0, Math.round(Number(parsed.price_thb) || 0)),
      cover_url: parsed.cover_url ? String(parsed.cover_url) : null,
      option: parsed.option ? String(parsed.option).slice(0, 60) : undefined,
      qty: Number(parsed.qty) > 1 ? Math.min(20, Math.round(Number(parsed.qty))) : undefined,
    };
  } catch {
    return null;
  }
}
