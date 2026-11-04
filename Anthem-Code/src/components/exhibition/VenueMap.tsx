import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./venueMap.css";
import type { EventVenue } from "@/lib/eventVenues";
import type { VenueRoute } from "@/hooks/useEventVenues";

type PinnedVenue = Pick<EventVenue, "id" | "title" | "lat" | "lng"> & { pin: number };

type Props = {
  venues: PinnedVenue[];
  interested: Set<string>;
  activeId: string | null;
  onSelect: (id: string) => void;
  /** Ticked venues ("my route"); the others fade back while any are ticked. */
  picked?: Set<string>;
  route?: VenueRoute | null;
  className?: string;
};

const ROUTE_SOURCE = "my-route";
const BRAND = "#EE3D29";

function drawRoute(m: maplibregl.Map, route: VenueRoute | null | undefined) {
  if (!m.isStyleLoaded()) {
    m.once("idle", () => drawRoute(m, route));
    return;
  }
  const data = {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates: route?.line ?? [] },
  };
  const src = m.getSource(ROUTE_SOURCE) as maplibregl.GeoJSONSource | undefined;
  if (src) src.setData(data);
  else {
    m.addSource(ROUTE_SOURCE, { type: "geojson", data });
    m.addLayer({
      id: `${ROUTE_SOURCE}-casing`,
      type: "line",
      source: ROUTE_SOURCE,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#000", "line-opacity": 0.35, "line-width": 7 },
    });
    m.addLayer({
      id: ROUTE_SOURCE,
      type: "line",
      source: ROUTE_SOURCE,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": BRAND, "line-width": 4 },
    });
  }
  // Straight-line fallback is dashed so it doesn't look like a real path.
  m.setPaintProperty(ROUTE_SOURCE, "line-dasharray", route && !route.streets ? [1.5, 1.5] : [1, 0]);
}

/** OpenFreeMap vector styles: free, no key, OpenStreetMap data. Muted dark / light to match the theme. */
const STYLE = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/positron",
};

const PIN_SVG =
  '<svg viewBox="0 0 28 36" aria-hidden="true"><path d="M14 1C7 1 1.5 6.4 1.5 13.3 1.5 22.6 14 35 14 35s12.5-12.4 12.5-21.7C26.5 6.4 21 1 14 1z"/></svg>';

/** MapLibre positions the outer element with `transform`, so the pin (which scales when active) sits inside it. */
function pinElement(v: PinnedVenue): { el: HTMLDivElement; pin: HTMLButtonElement } {
  const el = document.createElement("div");
  const pin = document.createElement("button");
  pin.type = "button";
  pin.className = "venue-pin";
  pin.setAttribute("aria-label", `${v.pin}. ${v.title}`);
  pin.innerHTML = `${PIN_SVG}<span>${v.pin}</span>`;
  el.appendChild(pin);
  return { el, pin };
}

/** Keep the base map quiet: no shop / place-of-interest labels or transit icons, only streets, water and areas. */
function quietStyle(map: maplibregl.Map) {
  for (const layer of map.getStyle().layers ?? []) {
    if (/poi|transit|aerialway|housenumber|building/i.test(layer.id)) map.setLayoutProperty(layer.id, "visibility", "none");
  }
}

/** Pin-shaped numbered markers: brand red = สนใจ, grey = not. Loaded lazily (only on event pages with venues). */
export default function VenueMap({ venues, interested, activeId, onSelect, picked, route, className }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<string, { marker: maplibregl.Marker; el: HTMLDivElement; pin: HTMLButtonElement }>());
  const fitRef = useRef<() => void>(() => {});
  // Refit on load / resize until the viewer pans or zooms themselves.
  const userMoved = useRef(false);
  const routeRef = useRef(route);
  routeRef.current = route;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const placed = venues.filter((v) => v.lat != null && v.lng != null);
  const placedKey = placed.map((v) => `${v.id}:${v.lat},${v.lng}:${v.pin}`).join("|");

  useEffect(() => {
    if (!box.current) return;
    const dark = document.documentElement.classList.contains("dark");
    const m = new maplibregl.Map({
      container: box.current,
      style: dark ? STYLE.dark : STYLE.light,
      center: [100.515, 13.745],
      zoom: 12,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    m.scrollZoom.disable();
    m.touchZoomRotate.disableRotation();
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
    m.on("style.load", () => quietStyle(m));
    m.on("load", () => {
      fitRef.current();
      drawRoute(m, routeRef.current);
    });
    const markMoved = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) userMoved.current = true;
    };
    m.on("dragstart", markMoved);
    m.on("zoomstart", markMoved);
    map.current = m;
    const ro = new ResizeObserver(() => {
      m.resize();
      if (!userMoved.current) fitRef.current();
    });
    ro.observe(box.current);
    const current = markers.current;
    return () => {
      ro.disconnect();
      current.forEach(({ marker }) => marker.remove());
      current.clear();
      m.remove();
      map.current = null;
    };
  }, []);

  // Markers + fit to them when the venue set changes.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach(({ marker }) => marker.remove());
    markers.current.clear();
    placed.forEach((v) => {
      const { el, pin } = pinElement(v);
      pin.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current(v.id);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([v.lng!, v.lat!]).addTo(m);
      markers.current.set(v.id, { marker, el, pin });
    });
    fitRef.current = () => {
      const box2 = m.getContainer();
      if (!box2.clientWidth || !box2.clientHeight) return;
      if (placed.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        placed.forEach((v) => bounds.extend([v.lng!, v.lat!]));
        const pad = Math.min(40, Math.round(box2.clientWidth / 10));
        m.fitBounds(bounds, { padding: { top: pad + 24, bottom: pad, left: pad, right: pad }, maxZoom: 15, duration: 0 });
      } else if (placed.length === 1) {
        m.jumpTo({ center: [placed[0].lng!, placed[0].lat!], zoom: 15 });
      }
    };
    fitRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedKey]);

  // Colours and the active pin, without refitting.
  useEffect(() => {
    markers.current.forEach(({ el, pin }, id) => {
      pin.classList.toggle("venue-pin--on", interested.has(id));
      pin.classList.toggle("venue-pin--active", id === activeId);
      pin.classList.toggle("venue-pin--picked", !!picked?.has(id));
      pin.classList.toggle("venue-pin--faded", !!picked?.size && !picked.has(id) && id !== activeId);
      el.style.zIndex = id === activeId ? "2" : "";
    });
    const active = placed.find((v) => v.id === activeId);
    const m = map.current;
    if (active && m && !m.getBounds().contains([active.lng!, active.lat!])) {
      m.easeTo({ center: [active.lng!, active.lat!], duration: 400 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, interested, picked, placedKey]);

  useEffect(() => {
    if (map.current) drawRoute(map.current, route);
  }, [route]);

  return (
    <div className={`venue-map isolate overflow-hidden rounded-lg border border-border ${className ?? ""}`}>
      <div ref={box} className="h-full w-full" role="region" aria-label="แผนที่สถานที่จัดงาน" />
    </div>
  );
}
