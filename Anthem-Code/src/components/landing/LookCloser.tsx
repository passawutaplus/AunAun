import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { toast } from "sonner";
import type { LandingText } from "./useLandingCopy";

const TOOLS = ["none", "zoom", "gray", "thirds", "deutan", "pick"] as const;
type Tool = (typeof TOOLS)[number];
type Swatch = { hex: string; share: number };

const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase()}`;

/** Same image tools as the work viewer (LightboxViewTools / LightboxColorTools), on one work. */
export function LookCloser({ src, t, behind }: { src?: string; t: LandingText; behind: [string, string][] }) {
  const [tool, setTool] = useState<Tool>("none");
  const [palette, setPalette] = useState<Swatch[]>([]);
  const [open, setOpen] = useState(0);
  const [picked, setPicked] = useState<{ x: number; y: number; hex: string } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const hovering = useRef(false);

  const readPixels = useCallback((w: number, h: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || !imgRef.current) return null;
    ctx.drawImage(imgRef.current, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h).data;
  }, []);

  const buildPalette = useCallback(() => {
    try {
      const d = readPixels(60, 45);
      if (!d) return;
      const buckets = new Map<string, number[]>();
      for (let i = 0; i < d.length; i += 4) {
        const key = `${d[i] >> 5},${d[i + 1] >> 5},${d[i + 2] >> 5}`;
        const b = buckets.get(key) ?? [0, 0, 0, 0];
        b[0] += d[i];
        b[1] += d[i + 1];
        b[2] += d[i + 2];
        b[3] += 1;
        buckets.set(key, b);
      }
      const top = [...buckets.values()].sort((a, b) => b[3] - a[3]).slice(0, 5);
      const total = top.reduce((n, b) => n + b[3], 0);
      setPalette(top.map((b) => ({ hex: toHex(b[0] / b[3], b[1] / b[3], b[2] / b[3]), share: b[3] / total })));
    } catch {
      setPalette([]);
    }
  }, [readPixels]);

  const copyHex = (hex: string) => {
    void navigator.clipboard?.writeText(hex).catch(() => {});
    toast(t("picked", { hex }));
  };

  const moveLens = (e: ReactPointerEvent) => {
    const stage = stageRef.current;
    const lens = lensRef.current;
    if (tool !== "zoom" || !stage || !lens) return;
    const r = stage.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const zoom = 2.6;
    stage.classList.add("hov");
    lens.style.left = `${x}px`;
    lens.style.top = `${y}px`;
    lens.style.backgroundSize = `${r.width * zoom}px ${r.height * zoom}px`;
    lens.style.backgroundPosition = `${75 - x * zoom}px ${75 - y * zoom}px`;
  };

  const pick = (e: ReactPointerEvent) => {
    moveLens(e);
    const stage = stageRef.current;
    if (tool !== "pick" || !stage) return;
    const r = stage.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    try {
      const d = readPixels(160, 120);
      if (!d) return;
      const i = (Math.min(119, Math.floor(fy * 120)) * 160 + Math.min(159, Math.floor(fx * 160))) * 4;
      const hex = toHex(d[i], d[i + 1], d[i + 2]);
      setPicked({ x: fx * 100, y: fy * 100, hex });
      copyHex(hex);
    } catch {
      /* image without CORS: the tool stays silent */
    }
  };

  return (
    <div className="lk">
      <div className="card lk-view reveal">
        <div
          className="lk-stage"
          ref={stageRef}
          data-m={tool}
          onPointerMove={moveLens}
          onPointerDown={pick}
          onPointerLeave={() => {
            hovering.current = false;
            stageRef.current?.classList.remove("hov");
          }}
        >
          {src ? <img ref={imgRef} src={src} alt="" crossOrigin="anonymous" onLoad={buildPalette} /> : null}
          <div className="lk-thirds" aria-hidden="true" />
          <div className="lk-lens" ref={lensRef} aria-hidden="true" style={src ? { backgroundImage: `url("${src}")` } : undefined} />
          {picked ? (
            <div className="lk-pick on" aria-hidden="true" style={{ left: `${picked.x}%`, top: `${picked.y}%`, background: picked.hex }} />
          ) : null}
        </div>
        <div className="tools" role="toolbar">
          {TOOLS.map((m) => (
            <button key={m} type="button" className="chip" aria-pressed={m === tool} onClick={() => setTool(m)}>
              {t(`tool.${m}`)}
            </button>
          ))}
        </div>
        <div className="pal">
          {palette.map((c) => (
            <button key={c.hex} type="button" style={{ background: c.hex, flex: c.share * 5 }} aria-label={c.hex} onClick={() => copyHex(c.hex)}>
              <span>{Math.round(c.share * 100)}%</span>
            </button>
          ))}
        </div>
      </div>
      <div className="card reveal">
        <p className="k">{t("bts.k")}</p>
        <div className="acc">
          {behind.map(([head, body], i) => (
            <button key={head} type="button" aria-expanded={i === open} onClick={() => setOpen(open === i ? -1 : i)}>
              <b>{head}</b>
              <span>{body}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
