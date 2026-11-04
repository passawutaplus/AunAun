import { useEffect, useState } from "react";
import { Briefcase, ChevronDown, Crosshair, Home, Loader2, LocateFixed, MapPin, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  START_LABEL,
  currentPosition,
  loadRoutePresets,
  saveRoutePresets,
  searchPlaces,
  type PlaceResult,
  type RoutePresets,
  type RouteStart,
} from "@/lib/routeStart";
import { cn } from "@/lib/utils";

const row =
  "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:opacity-50";

type Props = {
  start: RouteStart | null;
  onChange: (start: RouteStart | null) => void;
  /** Ask the map to take the next tap as the start point. */
  onPickOnMap: () => void;
};

/** "เริ่มจาก": current location, home, work, an address search, or a tap on the map. Saved on this device only. */
export function RouteStartPicker({ start, onChange, onPickOnMap }: Props) {
  const [open, setOpen] = useState(false);
  const [presets, setPresets] = useState<RoutePresets>(() => loadRoutePresets());
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  /** When set, the next chosen place is saved as home / work. */
  const [saveAs, setSaveAs] = useState<"home" | "work" | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      setSearching(true);
      searchPlaces(query, ctrl.signal)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 400);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const savePreset = (kind: "home" | "work", p: RouteStart) => {
    const next = { ...presets, [kind]: { ...p, kind, label: START_LABEL[kind] } };
    setPresets(next);
    saveRoutePresets(next);
    toast.success(`บันทึกเป็น${START_LABEL[kind]}แล้ว (เก็บในเครื่องนี้เท่านั้น)`);
  };

  const choose = (p: RouteStart) => {
    if (saveAs) {
      savePreset(saveAs, p);
      onChange({ ...p, kind: saveAs, label: START_LABEL[saveAs] });
    } else onChange(p);
    setSaveAs(null);
    setQ("");
    setOpen(false);
  };

  const useHere = async () => {
    setLocating(true);
    try {
      const pos = await currentPosition();
      choose({ ...pos, kind: "here", label: START_LABEL.here });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "หาตำแหน่งไม่สำเร็จ");
    } finally {
      setLocating(false);
    }
  };

  const preset = (kind: "home" | "work") => {
    const p = presets[kind];
    if (p) choose(p);
    else setSaveAs(kind); // not set yet: search (or use location) to set it
  };

  const clearPreset = (kind: "home" | "work") => {
    const next = { ...presets, [kind]: undefined };
    setPresets(next);
    saveRoutePresets(next);
  };

  const Icon = start?.kind === "home" ? Home : start?.kind === "work" ? Briefcase : start?.kind === "here" ? LocateFixed : MapPin;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className="text-muted-foreground">เริ่มจาก</span>
      <Popover open={open} onOpenChange={(o) => (setOpen(o), o ? null : setSaveAs(null))}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-foreground/25 px-3 text-sm text-foreground hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
            <span className="truncate">{start ? start.label : "เลือกจุดเริ่มต้น"}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-2">
          {saveAs ? (
            <p className="px-2 pb-2 text-xs text-muted-foreground">
              ตั้ง{START_LABEL[saveAs]}: ค้นหาที่อยู่ด้านล่าง หรือใช้ตำแหน่งปัจจุบัน
            </p>
          ) : null}
          <button type="button" className={row} onClick={useHere} disabled={locating}>
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4 text-brand" />}
            ตำแหน่งปัจจุบัน
          </button>
          {!saveAs
            ? (["home", "work"] as const).map((kind) => {
                const KIcon = kind === "home" ? Home : Briefcase;
                return (
                  <div key={kind} className="flex items-center">
                    <button type="button" className={row} onClick={() => preset(kind)}>
                      <KIcon className="h-4 w-4 text-brand" />
                      {START_LABEL[kind]}
                      <span className="ml-auto text-xs text-muted-foreground">{presets[kind] ? "" : "ตั้งค่า"}</span>
                    </button>
                    {presets[kind] ? (
                      <button
                        type="button"
                        aria-label={`ลบ${START_LABEL[kind]}ที่บันทึกไว้`}
                        className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => clearPreset(kind)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                );
              })
            : null}
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาที่อยู่ / สถานที่ / สถานี"
              className="h-9 pl-8"
              aria-label="ค้นหาจุดเริ่มต้น"
            />
          </div>
          {searching ? <Loader2 className="mx-auto my-2 h-4 w-4 animate-spin text-muted-foreground" /> : null}
          {results.length ? (
            <ul className="mt-1 max-h-56 overflow-y-auto">
              {results.map((r, i) => (
                <li key={`${r.lat},${r.lng},${i}`}>
                  <button type="button" className={row} onClick={() => choose({ lat: r.lat, lng: r.lng, label: r.label, kind: "place" })}>
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block truncate">{r.label}</span>
                      {r.detail ? <span className="block truncate text-xs text-muted-foreground">{r.detail}</span> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {!saveAs ? (
            <button
              type="button"
              className={cn(row, "mt-1")}
              onClick={() => {
                setOpen(false);
                onPickOnMap();
              }}
            >
              <Crosshair className="h-4 w-4 text-brand" />
              แตะเลือกบนแผนที่
            </button>
          ) : null}
          {start && !saveAs ? (
            <button
              type="button"
              className={cn(row, "text-muted-foreground")}
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <X className="h-4 w-4" />
              ไม่ใช้จุดเริ่มต้น
            </button>
          ) : null}
          <p className="px-2 pt-2 text-[11px] text-muted-foreground">เก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งขึ้นบัญชี SAMECOR</p>
        </PopoverContent>
      </Popover>
      {start && (start.kind === "place" || start.kind === "map" || start.kind === "here") ? (
        <span className="text-xs text-muted-foreground">
          บันทึกเป็น{" "}
          <button type="button" className="underline underline-offset-4 hover:text-foreground" onClick={() => savePreset("home", start)}>
            บ้าน
          </button>{" "}
          ·{" "}
          <button type="button" className="underline underline-offset-4 hover:text-foreground" onClick={() => savePreset("work", start)}>
            ที่ทำงาน
          </button>
        </span>
      ) : null}
    </div>
  );
}
