import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./venueMap.css";
import type { EventVenue } from "@/lib/eventVenues";

type PinnedVenue = Pick<EventVenue, "id" | "title" | "lat" | "lng"> & { pin: number };

type Props = {
  venues: PinnedVenue[];
  interested: Set<string>;
  activeId: string | null;
  onSelect: (id: string) => void;
  className?: string;
};

const pinIcon = (n: number, on: boolean, active: boolean) =>
  L.divIcon({
    className: "",
    html: `<span class="venue-pin${on ? " venue-pin--on" : ""}${active ? " venue-pin--active" : ""}">${n}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

/** Numbered pins on OpenStreetMap: brand red = สนใจ, grey = not. Loaded lazily (Leaflet is only on event pages). */
export default function VenueMap({ venues, interested, activeId, onSelect, className }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const placed = venues.filter((v) => v.lat != null && v.lng != null);
  const placedKey = placed.map((v) => `${v.id}:${v.lat},${v.lng}`).join("|");

  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      className: "venue-map-tiles",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    }).addTo(m);
    m.attributionControl.setPrefix(false);
    m.setView([13.7563, 100.5018], 12);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(box.current);
    const current = markers.current;
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      current.clear();
    };
  }, []);

  // Markers + fit to them when the venue set changes.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current.clear();
    placed.forEach((v) => {
      const mk = L.marker([v.lat!, v.lng!], {
        icon: pinIcon(v.pin, interested.has(v.id), v.id === activeId),
        title: `${v.pin}. ${v.title}`,
        alt: `${v.pin}. ${v.title}`,
        keyboard: true,
        riseOnHover: true,
      })
        .on("click", () => onSelectRef.current(v.id))
        .addTo(m);
      markers.current.set(v.id, mk);
    });
    if (placed.length > 1) {
      m.fitBounds(L.latLngBounds(placed.map((v) => [v.lat!, v.lng!] as [number, number])), { padding: [28, 28] });
    } else if (placed.length === 1) {
      m.setView([placed[0].lat!, placed[0].lng!], 15);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedKey]);

  // Colours and the active pin, without refitting.
  useEffect(() => {
    placed.forEach((v) => {
      const mk = markers.current.get(v.id);
      if (!mk) return;
      mk.setIcon(pinIcon(v.pin, interested.has(v.id), v.id === activeId));
      mk.setZIndexOffset(v.id === activeId ? 1000 : 0);
    });
    const active = placed.find((v) => v.id === activeId);
    if (active && map.current && !map.current.getBounds().contains([active.lat!, active.lng!])) {
      map.current.panTo([active.lat!, active.lng!]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, interested, placedKey]);

  return (
    <div className={`venue-map isolate overflow-hidden rounded-lg border border-border ${className ?? ""}`}>
      <div ref={box} className="h-full w-full" role="region" aria-label="แผนที่สถานที่จัดงาน" />
    </div>
  );
}
