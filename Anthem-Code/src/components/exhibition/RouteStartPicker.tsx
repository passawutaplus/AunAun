import { useEffect, useRef, useState } from "react";
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

/** Debounced Photon search for one input. */
function usePlaceSearch(q: string) {
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
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
  return { results, searching };
}

function PlaceResults({ results, onPick }: { results: PlaceResult[]; onPick: (r: PlaceResult) => void }) {
  if (!results.length) return null;
  return (
    <ul className="mt-1 max-h-52 overflow-y-auto">
      {results.map((r, i) => (
        <li key={`${r.lat},${r.lng},${i}`}>
          <button type="button" className={row} onClick={() => onPick(r)}>
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block truncate">{r.label}</span>
              {r.detail ? <span className="block truncate text-xs text-muted-foreground">{r.detail}</span> : null}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** "เริ่มจาก": current location, home, work, an address search, or a tap on the map. Saved on this device only. */
export function RouteStartPicker({ start, onChange, onPickOnMap }: Props) {
  const [open, setOpen] = useState(false);
  const [presets, setPresets] = useState<RoutePresets>(() => loadRoutePresets());
  const [q, setQ] = useState("");
  const { results, searching } = usePlaceSearch(q);
  const [locating, setLocating] = useState(false);
  /** Home / work row whose "set place" panel is slid open under it. */
  const [saveAs, setSaveAs] = useState<"home" | "work" | null>(null);
  const [subQ, setSubQ] = useState("");
  const sub = usePlaceSearch(subQ);
  const subInput = useRef<HTMLInputElement>(null);

  const toggleSaveAs = (kind: "home" | "work") => {
    setSubQ("");
    setSaveAs((cur) => (cur === kind ? null : kind));
  };
  useEffect(() => {
    if (saveAs) window.setTimeout(() => subInput.current?.focus({ preventScroll: true }), 60);
  }, [saveAs]);

  const savePreset = (kind: "home" | "work", p: RouteStart) => {
    const next = { ...presets, [kind]: { ...p, kind, label: START_LABEL[kind] } };
    setPresets(next);
    saveRoutePresets(next);
    toast.success(`บันทึกเป็น${START_LABEL[kind]}แล้ว · จำไว้แค่ในเครื่องนี้`);
  };

  /** `as` set: the place is saved as home / work and used as the start. */
  const choose = (p: RouteStart, as?: "home" | "work") => {
    if (as) {
      savePreset(as, p);
      onChange({ ...p, kind: as, label: START_LABEL[as] });
    } else onChange(p);
    setSaveAs(null);
    setQ("");
    setSubQ("");
    setOpen(false);
  };

  const locateHere = async (as?: "home" | "work") => {
    setLocating(true);
    try {
      const pos = await currentPosition();
      choose({ ...pos, kind: "here", label: START_LABEL.here }, as);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "หาตำแหน่งไม่สำเร็จ");
    } finally {
      setLocating(false);
    }
  };

  const preset = (kind: "home" | "work") => {
    const p = presets[kind];
    if (p) choose(p);
    else toggleSaveAs(kind); // not set yet: slide open the set-place panel
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
      onEdit: presets[kind] ? () => toggleSaveAs(kind) : undefined,
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
            <PlaceResults results={results} onPick={(r) => choose({ lat: r.lat, lng: r.lng, label: r.label, kind: "place" })} />
          </div>

          {/* 2. Shortcuts — home / work slide a "set place" panel open under their row */}
          <ul className="p-1.5">
            {shortcuts.map((x) => {
              const kind = x.key === "home" || x.key === "work" ? x.key : null;
              const expanded = !!kind && saveAs === kind;
              return (
                <li key={x.key}>
                  <div className="group flex items-center">
                    <button
                      type="button"
                      className={row}
                      onClick={x.onClick}
                      disabled={x.key === "here" && locating}
                      aria-expanded={kind && !presets[kind] ? expanded : undefined}
                    >
                      {x.key === "here" && locating ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <x.icon className={cn("h-4 w-4", x.active ? "text-brand" : "text-muted-foreground")} />
                      )}
                      <span className={cn(x.active && "font-medium")}>{x.label}</span>
                      {x.active ? <Check className="ml-auto h-4 w-4 text-brand" /> : null}
                      {!x.active && x.hint ? (
                        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                          {x.hint}
                          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded && "rotate-180")} aria-hidden />
                        </span>
                      ) : null}
                    </button>
                    {x.onEdit ? (
                      <button
                        type="button"
                        aria-label={`แก้ไข${x.label}`}
                        aria-expanded={expanded}
                        className="mr-1 shrink-0 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={x.onEdit}
                      >
                        {expanded ? "ปิด" : "แก้ไข"}
                      </button>
                    ) : null}
                  </div>
                  {kind ? (
                    <div
                      className={cn(
                        "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
                        expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                      )}
                      {...(expanded ? {} : { inert: "" })}
                    >
                      <div className="overflow-hidden">
                        <div className="mx-2 mb-1.5 mt-0.5 rounded-md bg-muted/40 p-2">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                            <Input
                              ref={expanded ? subInput : undefined}
                              value={expanded ? subQ : ""}
                              onChange={(e) => setSubQ(e.target.value)}
                              placeholder={`ค้นหาที่อยู่${START_LABEL[kind]}`}
                              className="h-9 border-0 bg-background pl-8 focus-visible:ring-1"
                              aria-label={`ค้นหาที่อยู่${START_LABEL[kind]}`}
                            />
                          </div>
                          {expanded && sub.searching ? <Loader2 className="mx-auto mt-2 h-4 w-4 animate-spin text-muted-foreground" /> : null}
                          {expanded ? (
                            <PlaceResults results={sub.results} onPick={(r) => choose({ lat: r.lat, lng: r.lng, label: r.label, kind: "place" }, kind)} />
                          ) : null}
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <button
                              type="button"
                              className="flex items-center gap-1.5 rounded-md py-1 text-foreground hover:underline underline-offset-4 disabled:opacity-50"
                              onClick={() => void locateHere(kind)}
                              disabled={locating}
                            >
                              {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                              ใช้ตำแหน่งปัจจุบัน
                            </button>
                            {presets[kind] ? (
                              <button
                                type="button"
                                className="text-destructive underline-offset-4 hover:underline"
                                onClick={() => clearPreset(kind)}
                              >
                                ลบ{START_LABEL[kind]}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="ml-auto text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                              onClick={() => setSaveAs(null)}
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

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
