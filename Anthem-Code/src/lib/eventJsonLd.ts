/**
 * schema.org Event for an event page (Google "Event" rich results). Mirrors api/seo-preview.js, which
 * serves the same data to crawlers that don't run JavaScript.
 */
import { eventPath, type ExhibitionEvent } from "@/lib/exhibitionEvents";

type Place = { name?: string | null; address?: string | null; area?: string | null; lat?: number | null; lng?: number | null };
type Sub = { id: string; slug?: string | null; title: string; starts_on?: string | null; ends_on?: string | null } & Place;

const abs = (origin: string, u: string) => (/^https?:\/\//i.test(u) ? u : `${origin}${u.startsWith("/") ? "" : "/"}${u}`);
const isOnline = (s: string | null | undefined) => !!s && /ออนไลน์|online/i.test(s);

function place(p: Place & { location_note?: string | null }) {
  const street = p.address || p.location_note || p.name || undefined;
  return {
    "@type": "Place",
    name: p.name || street,
    address: {
      "@type": "PostalAddress",
      streetAddress: street,
      ...(p.area ? { addressLocality: p.area } : {}),
      addressCountry: "TH",
    },
    ...(p.lat != null && p.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lng } } : {}),
  };
}

export function eventJsonLd(
  e: ExhibitionEvent & Place,
  opts: { origin: string; description: string; venues?: Sub[]; parent?: { id: string; slug?: string | null; title: string } | null },
): Record<string, unknown> {
  const { origin } = opts;
  const url = `${origin}${eventPath(e)}`;
  const images = [e.cover_url, ...(e.gallery_urls ?? [])].filter((x): x is string => !!x).map((u) => abs(origin, u));
  const priceMatch = e.fee_note?.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  const offerUrl = e.ticket_url || e.registration_url || e.website_url || url;
  const offers =
    e.fee_type === "free"
      ? { "@type": "Offer", price: 0, priceCurrency: "THB", availability: "https://schema.org/InStock", url: offerUrl }
      : e.fee_type === "paid"
        ? {
            "@type": "Offer",
            priceCurrency: "THB",
            availability: "https://schema.org/InStock",
            url: offerUrl,
            ...(priceMatch ? { price: Number(priceMatch[0]) } : {}),
          }
        : undefined;
  const online = isOnline(e.location_name);
  return {
    "@type": "Event",
    name: e.title,
    description: opts.description.slice(0, 300),
    url,
    ...(e.starts_on ? { startDate: e.starts_on } : {}),
    ...(e.ends_on || e.starts_on ? { endDate: e.ends_on || e.starts_on } : {}),
    // Past events stay "scheduled" (Google: don't mark them cancelled); the dates say they're over.
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: online
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    location: online
      ? { "@type": "VirtualLocation", url: e.website_url || url }
      : place({ name: e.location_name, address: e.address, area: e.area, lat: e.lat, lng: e.lng, location_note: e.location_note }),
    ...(images.length ? { image: images } : {}),
    ...(e.organizer_name
      ? { organizer: { "@type": "Organization", name: e.organizer_name, ...(e.website_url ? { url: e.website_url } : {}) } }
      : {}),
    ...(offers ? { offers } : {}),
    ...(opts.venues?.length
      ? {
          subEvent: opts.venues.map((v) => ({
            "@type": "Event",
            name: v.title,
            url: `${origin}${eventPath(v)}`,
            ...(v.starts_on || e.starts_on ? { startDate: v.starts_on || e.starts_on } : {}),
            ...(v.ends_on || e.ends_on ? { endDate: v.ends_on || e.ends_on } : {}),
            location: place({ name: v.title, address: v.address, area: v.area, lat: v.lat, lng: v.lng }),
          })),
        }
      : {}),
    ...(opts.parent ? { superEvent: { "@type": "Event", name: opts.parent.title, url: `${origin}${eventPath(opts.parent)}` } } : {}),
  };
}
