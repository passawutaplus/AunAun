export const OBJECT_CHAT_PREFIX = "[[object]]";

export type ObjectChatCard = {
  id: string;
  title: string;
  price_thb: number;
  cover_url: string | null;
};

export function formatObjectChatCard(card: ObjectChatCard): string {
  return `${OBJECT_CHAT_PREFIX}${JSON.stringify({
    id: card.id,
    title: card.title,
    price_thb: Math.max(0, Math.round(card.price_thb)),
    cover_url: card.cover_url,
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
    };
  } catch {
    return null;
  }
}
