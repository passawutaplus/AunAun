const EVENT_LINK_RE = /(?:https?:\/\/[^\s/]+)?\/exhibition\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i;
/** First line of a sponsorship offer sent from an event page (SponsorOfferDialog). */
export const SPONSOR_OFFER_HEADER = "🤝 สนใจสนับสนุนงาน";

/** Event id when a chat text links to an event page. */
export function parseEventLink(text: string | null | undefined): string | null {
  return text?.match(EVENT_LINK_RE)?.[1] ?? null;
}

/** Text without the trailing event link line, since the card below shows it. */
export function stripEventLinkLine(text: string): string {
  return text.replace(/\n*[^\n]*\/exhibition\/[0-9a-f-]{36}[^\n]*\s*$/i, "").trimEnd();
}
