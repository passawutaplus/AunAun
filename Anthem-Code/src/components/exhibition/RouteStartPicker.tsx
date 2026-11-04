import { useEffect, useState } from "react";
import { Briefcase, Check, ChevronDown, Lock, Crosshair, Home, Loader2, LocateFixed, MapPin, Search, X } from "lucide-react";
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
    toast.success(`บันทึกเป็น${START_LABEL[kind]}แล้ว · จำไว้แค่ในเครื่องนี้`);
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

  const locateHere = async () => {
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

  /** Forget a saved home / work; if it's the current start, the route stops starting there too. */
  const clearPreset = (kind: "home" | "work") => {
    const next = { ...presets, [kind]: undefined };
    setPresets(next);
    saveRoutePresets(next);
    if (start?.kind === kind) onChange(null);
    setSaveAs(null);
    toast.success(`ลบ${START_LABEL[kind]}ที่บันทึกไว้แล้ว`);
  };

  const Icon = start?.kind === "home" ? Home : start?.kind === "work" ? Briefcase : start?.kind === "here" ? LocateFixed : MapPin;

  const shortcuts: Array<{ key: string; icon: typeof Home; label: string; active: boolean; hint?: string; onClick: () => void; onEdit?: () => void }> = [
    { key: "here", icon: LocateFixed, label: START_LABEL.here, active: start?.kind === "here", onClick: () => void locateHere() },
    ...(["home", "work"] as const).map((kind) => ({
      key: kind,
      icon: kind === "home" ? Home : Briefcase,
      label: START_LABEL[kind],
      active: start?.kind === kind,
      hint: presets[kind] ? undefined : "ตั้งค่า",
      onClick: () => preset(kind),
      // Saved: "แก้ไข" opens set-again / delete. Not saved: the whole row starts setting it.
      onEdit: presets[kind] ? () => setSaveAs(kind) : undefined,
    })),
    {
      key: "map",
      icon: Crosshair,
      label: "เลือกบนแผนที่",
      active: start?.kind === "map",
      onClick: () => {
        setOpen(false);
        onPickOnMap();
      },
    },
  ];
  const canSave = !!start && !saveAs && (start.kind === "place" || start.kind === "map" || start.kind === "here");

  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <span className="shrink-0 text-muted-foreground">เริ่มจาก</span>
      <Popover open={open} onOpenChange={(o) => (setOpen(o), o ? null : setSaveAs(null))}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex min-h-8 min-w-0 max-w-full items-center gap-1.5 rounded-full border border-foreground/25 px-3 text-sm text-foreground hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
            <span className="truncate">{start ? start.label : "เลือกจุดเริ่มต้น"}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] p-0">
          {/* 1. Search */}
          <div className="border-b border-border p-2">
            {saveAs ? (
              <div className="flex items-center gap-2 px-1 pb-2 text-xs">
                <span className="font-medium text-foreground">
                  {presets[saveAs] ? `เปลี่ยนตำแหน่ง${START_LABEL[saveAs]}` : `ตั้ง${START_LABEL[saveAs]}`}
                </span>
                <span className="text-muted-foreground">ค้นหา หรือใช้ตำแหน่งปัจจุบัน</span>
                <button
                  type="button"
                  className="ml-auto text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  onClick={() => setSaveAs(null)}
                >
                  ยกเลิก
                </button>
              </div>
            ) : null}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหาที่อยู่ สถานที่ หรือสถานี"
                className="h-9 border-0 bg-muted/60 pl-8 focus-visible:ring-1"
                aria-label="ค้นหาจุดเริ่มต้น"
              />
            </div>
            {searching ? <Loader2 className="mx-auto mt-2 h-4 w-4 animate-spin text-muted-foreground" /> : null}
            {results.length ? (
              <ul className="mt-1 max-h-52 overflow-y-auto">
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
          </div>

          {/* 2. Shortcuts */}
          <ul className="p-1.5">
            {(saveAs ? shortcuts.filter((x) => x.key === "here") : shortcuts).map((x) => (
              <li key={x.key} className="group flex items-center">
                <button type="button" className={row} onClick={x.onClick} disabled={x.key === "here" && locating}>
                  {x.key === "here" && locating ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <x.icon className={cn("h-4 w-4", x.active ? "text-brand" : "text-muted-foreground")} />
                  )}
                  <span className={cn(x.active && "font-medium")}>{x.label}</span>
                  {x.active ? <Check className="ml-auto h-4 w-4 text-brand" /> : null}
                  {!x.active && x.hint ? <span className="ml-auto text-xs text-muted-foreground">{x.hint}</span> : null}
                </button>
                {x.onEdit ? (
                  <button
                    type="button"
                    aria-label={`แก้ไข${x.label}`}
                    className="mr-1 shrink-0 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={x.onEdit}
                  >
                    แก้ไข
                  </button>
                ) : null}
              </li>
            ))}
          </ul>

          {saveAs && presets[saveAs] ? (
            <div className="border-t border-border px-3 py-2">
              <button
                type="button"
                className="text-xs text-destructive underline-offset-4 hover:underline"
                onClick={() => clearPreset(saveAs)}
              >
                ลบ{START_LABEL[saveAs]}ที่บันทึกไว้
              </button>
            </div>
          ) : null}

          {/* 3. Save / clear */}
          {canSave || (start && !saveAs) ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-3 py-2 text-xs text-muted-foreground">
              {canSave ? (
                <span className="flex items-center gap-1.5">
                  บันทึกเป็น
                  <button type="button" className="rounded-full border border-border px-2 py-0.5 text-foreground hover:border-foreground" onClick={() => savePreset("home", start!)}>
                    บ้าน
                  </button>
                  <button type="button" className="rounded-full border border-border px-2 py-0.5 text-foreground hover:border-foreground" onClick={() => savePreset("work", start!)}>
                    ที่ทำงาน
                  </button>
                </span>
              ) : null}
              {start ? (
                <button
                  type="button"
                  className="ml-auto underline-offset-4 hover:text-foreground hover:underline"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                >
                  ไม่ใช้จุดเริ่มต้น
                </button>
              ) : null}
            </div>
          ) : null}
          <p className="flex items-start gap-1.5 border-t border-border px-3 py-2 text-xs text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            SAMECOR ไม่เก็บที่อยู่ของคุณ จำไว้แค่ในมือถือหรือคอมเครื่องนี้ ลบเมื่อไหร่ก็ได้
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
