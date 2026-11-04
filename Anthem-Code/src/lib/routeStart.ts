/**
 * Where a viewer's venue route starts: current location, home, work, a searched place or a point on the map.
 * Kept only in this browser (localStorage) — never sent to SAMECOR. Coordinates sent to the routing service
 * are rounded to ~100 m.
 */

export type RouteStartKind = "here" | "home" | "work" | "place" | "map";
export type RouteStart = { lat: number; lng: number; label: string; kind: RouteStartKind };
export type RoutePresets = { home?: RouteStart; work?: RouteStart };

const START_KEY = "samecor:route-start";
const PRESETS_KEY = "samecor:route-presets";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: keep it for this visit only */
  }
}

const isPoint = (p: unknown): p is RouteStart =>
  !!p && typeof p === "object" && Number.isFinite((p as RouteStart).lat) && Number.isFinite((p as RouteStart).lng);

export const loadRouteStart = (): RouteStart | null => {
  const p = read<RouteStart>(START_KEY);
  return isPoint(p) ? p : null;
};
export const saveRouteStart = (p: RouteStart | null) => write(START_KEY, p);

export const loadRoutePresets = (): RoutePresets => {
  const p = read<RoutePresets>(PRESETS_KEY) ?? {};
  return { home: isPoint(p.home) ? p.home : undefined, work: isPoint(p.work) ? p.work : undefined };
};
export const saveRoutePresets = (p: RoutePresets) => write(PRESETS_KEY, p);

/** ~100 m precision for anything sent to a third-party routing service. */
export const roundCoord = (n: number) => Math.round(n * 1000) / 1000;

export const START_LABEL: Record<RouteStartKind, string> = {
  here: "ตำแหน่งปัจจุบัน",
  home: "บ้าน",
  work: "ที่ทำงาน",
  place: "สถานที่",
  map: "จุดบนแผนที่",
};

export type PlaceResult = { label: string; detail: string; lat: number; lng: number };

/** Address / place search (Photon, OpenStreetMap data; free, no key), biased to Bangkok. */
export async function searchPlaces(q: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lat=13.75&lon=100.52`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    features?: Array<{
      geometry: { coordinates: [number, number] };
      properties: Record<string, string | undefined>;
    }>;
  };
  return (json.features ?? []).map((f) => {
    const p = f.properties;
    const label = p.name || [p.housenumber, p.street].filter(Boolean).join(" ") || p.city || "ไม่มีชื่อ";
    const detail = [p.street && p.name ? p.street : null, p.district || p.locality, p.city].filter(Boolean).join(" · ");
    return { label, detail, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
  });
}

/** Current position from the device (asks permission). */
export function currentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("อุปกรณ์นี้หาตำแหน่งไม่ได้ ลองค้นหาที่อยู่หรือแตะบนแผนที่แทน"));
      return;
    }
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      reject(new Error("หาตำแหน่งได้เฉพาะหน้าเว็บ https ลองค้นหาที่อยู่หรือแตะบนแผนที่แทน"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง เปิดสิทธิ์ตำแหน่งให้ samecor.com ในการตั้งค่าเบราว์เซอร์/แอป หรือค้นหาที่อยู่แทน"
              : "หาตำแหน่งไม่สำเร็จ ลองอีกครั้ง",
          ),
        ),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}
