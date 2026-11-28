import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { VenueRoute } from "@/hooks/useEventVenues";

export type MapPin = { id: string; n: number; title: string; lat: number | null; lng: number | null; on: boolean };

type Props = {
  pins: MapPin[];
  /** Walking route through the path (streets from OSRM, or straight legs as a fallback). */
  route: VenueRoute | null;
  onToggle: (id: string) => void;
};

/** OpenFreeMap light style: free, no key, OpenStreetMap data (same source as the old venue map). */
const STYLE = "https://tiles.openfreemap.org/styles/positron";
const ROUTE = "sc-route";
const MIN_ZOOM = 10;
const MAX_ZOOM = 17;

/** Keep the base map quiet: streets, water and district names only (no big city name or road shields over the pins). */
function quietStyle(m: maplibregl.Map) {
  for (const layer of m.getStyle().layers ?? []) {
    if (/poi|transit|aerialway|housenumber|building|shield|label_(city|town|state|country)/i.test(layer.id)) {
      m.setLayoutProperty(layer.id, "visibility", "none");
    }
  }
}

function drawRoute(m: maplibregl.Map, route: VenueRoute | null) {
  if (!m.isStyleLoaded()) {
    m.once("idle", () => drawRoute(m, route));
    return;
  }
  const data = { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: route?.line ?? [] } };
  const src = m.getSource(ROUTE) as maplibregl.GeoJSONSource | undefined;
  if (src) src.setData(data);
  else {
    m.addSource(ROUTE, { type: "geojson", data });
    // mock: red dashed line (#EE3D29, 3px, dash 6 5)
    m.addLayer({
      id: ROUTE,
      type: "line",
      source: ROUTE,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#EE3D29", "line-width": 3, "line-dasharray": [2, 1.7] },
    });
  }
}

/**
 * Map of the Locations box (mock: numbered round pins with a tail, red when in the route; zoom buttons top left).
 * A pin adds the venue to the route or takes it out, like ticking it in the list.
 */
export default function LocationsMap({ pins, route, onToggle }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<string, { marker: maplibregl.Marker; btn: HTMLButtonElement }>());
  const toggleRef = useRef(onToggle);
  toggleRef.current = onToggle;
  const routeRef = useRef(route);
  routeRef.current = route;
  const fitRef = useRef<() => void>(() => {});
  const userMoved = useRef(false);
  const [zoom, setZoom] = useState(12);

  const placed = pins.filter((p) => p.lat != null && p.lng != null);
  const placedKey = placed.map((p) => `${p.id}:${p.lat},${p.lng}:${p.n}`).join("|");

  useEffect(() => {
    if (!box.current) return;
    const m = new maplibregl.Map({
      container: box.current,
      style: STYLE,
      center: [100.515, 13.745],
      zoom: 12,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    m.scrollZoom.disable();
    m.touchZoomRotate.disableRotation();
    m.on("style.load", () => quietStyle(m));
    m.on("load", () => {
      // the credit starts folded to its (i) button so it does not cover the bottom of the map
      box.current?.querySelector(".maplibregl-compact-show")?.classList.remove("maplibregl-compact-show");
      fitRef.current();
      drawRoute(m, routeRef.current);
    });
    m.on("zoomend", () => setZoom(m.getZoom()));
    const moved = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) userMoved.current = true;
    };
    m.on("dragstart", moved);
    m.on("zoomstart", moved);
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

  // Pins, and fit the map to them when the set changes.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach(({ marker }) => marker.remove());
    markers.current.clear();
    for (const p of placed) {
      const el = document.createElement("div");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lc-pin";
      btn.textContent = String(p.n);
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleRef.current(p.id);
      });
      el.appendChild(btn);
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([p.lng!, p.lat!]).addTo(m);
      markers.current.set(p.id, { marker, btn });
    }
    fitRef.current = () => {
      const c = m.getContainer();
      if (!c.clientWidth || !c.clientHeight || !placed.length) return;
      if (placed.length === 1) {
        m.jumpTo({ center: [placed[0].lng!, placed[0].lat!], zoom: 15 });
        return;
      }
      const bounds = new maplibregl.LngLatBounds();
      placed.forEach((p) => bounds.extend([p.lng!, p.lat!]));
      const pad = Math.min(48, Math.round(c.clientWidth / 10));
      m.fitBounds(bounds, { padding: { top: pad + 28, bottom: pad, left: pad + 40, right: pad }, maxZoom: 15, duration: 0 });
      setZoom(m.getZoom());
    };
    fitRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedKey]);

  // Colour and label of each pin, without refitting.
  useEffect(() => {
    for (const p of placed) {
      const it = markers.current.get(p.id);
      if (!it) continue;
      it.btn.setAttribute("aria-pressed", p.on ? "true" : "false");
      it.btn.setAttribute("aria-label", `${p.on ? "เอาออกจากเส้นทาง" : "เพิ่มเข้าเส้นทาง"} ${p.title}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, placedKey]);

  useEffect(() => {
    if (map.current) drawRoute(map.current, route);
  }, [route]);

  const zoomBy = (d: 1 | -1) => {
    const m = map.current;
    if (!m) return;
    if (d > 0) m.zoomIn();
    else m.zoomOut();
  };

  return (
    <>
      <div ref={box} className="lc-map-canvas" role="region" aria-label="แผนที่สถานที่จัด" />
      <div className="lc-zoombox">
        <button type="button" className="lc-zoom" aria-label="ซูมเข้า" aria-disabled={zoom >= MAX_ZOOM - 0.01} onClick={() => zoomBy(1)}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button type="button" className="lc-zoom" aria-label="ซูมออก" aria-disabled={zoom <= MIN_ZOOM + 0.01} onClick={() => zoomBy(-1)}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>
    </>
  );
}
