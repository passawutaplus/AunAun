import type { RoutePoint } from "@/lib/eventVenues";

/** Google Maps takes a name when the pin is approximate, exact coordinates otherwise. */
const place = (v: RoutePoint) => (!v.coords_approx && v.lat != null && v.lng != null ? `${v.lat},${v.lng}` : `${v.name_en || v.title}, Bangkok`);

/**
 * "เปิดใน Google Maps" / "นำทางใน Google Maps" (mock Locations). Without a route: a search for the event.
 * With a route: from the chosen start venue (or the viewer's own location when the start is "ตำแหน่งปัจจุบัน",
 * which Google fills in itself) through the ticked venues; Google allows up to 9 waypoints.
 */
export function locationsMapsUrl(eventTitle: string, path: RoutePoint[], fromVenue: boolean): string {
  if (path.length < 2) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventTitle)}`;
  const stops = [...path];
  const dest = stops.pop()!;
  const origin = fromVenue ? stops.shift()! : null;
  const params = new URLSearchParams({ api: "1" });
  if (origin) params.set("origin", place(origin));
  params.set("destination", place(dest));
  if (stops.length) params.set("waypoints", stops.slice(0, 9).map(place).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Status line under the start picker (mock wording). */
export function routeNote(picked: number, pathPins: number[]): string {
  if (picked >= 2) return `เส้นทาง ${pathPins.length} จุด · ${pathPins.join(" → ")}`;
  if (picked === 1) return "เลือกอีกอย่างน้อย 1 สถานที่";
  return "เลือก 2 สถานที่ขึ้นไป เพื่อแสดงเส้นทางบนแผนที่";
}
