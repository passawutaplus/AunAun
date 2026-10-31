import { useEffect, useMemo, useRef, useState } from "react";
import type { LandingText } from "./useLandingCopy";

// Illustration only: sample numbers, labelled as an example on the card.
const series = (n: number, from: number, to: number, seed: number) =>
  Array.from({ length: n }, (_, i) => {
    const x = i / (n - 1);
    const wobble = Math.sin(i * 1.7 + seed) * 0.055 + Math.sin(i * 0.63 + seed * 2) * 0.05;
    return Math.round(from + (to - from) * (x ** 1.5 + wobble * (1 - x * 0.75)));
  });

const RANGES = {
  7: { views: series(14, 980, 1280, 1), interest: series(14, 96, 172, 3), up: "+31%" },
  30: { views: series(30, 420, 1280, 2), interest: series(30, 38, 172, 5), up: "+205%" },
  90: { views: series(44, 90, 1280, 4), interest: series(44, 8, 172, 7), up: "+1,322%" },
} as const;
type Range = keyof typeof RANGES;

const points = (values: readonly number[], max: number) =>
  values.map((n, i) => [(i / (values.length - 1)) * 600, 212 - (n / max) * 196] as const);
const toPath = (pts: readonly (readonly [number, number])[]) => `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}`;

export function TrendCard({ t, image }: { t: LandingText; image: string }) {
  const [range, setRange] = useState<Range>(30);
  const [hover, setHover] = useState<number | null>(null);
  const [seen, setSeen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<SVGPathElement>(null);
  const interestRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);
  const endRef = useRef<SVGCircleElement>(null);

  const data = RANGES[range];
  const { viewPath, interestPath, end } = useMemo(() => {
    const max = Math.max(...data.views);
    const v = points(data.views, max);
    return { viewPath: toPath(v), interestPath: toPath(points(data.interest.map((n) => n * 4), max)), end: v[v.length - 1] };
  }, [data]);

  useEffect(() => {
    const seenOnce = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        seenOnce.disconnect();
        setSeen(true);
      },
      { threshold: 0.4 },
    );
    if (cardRef.current) seenOnce.observe(cardRef.current);
    return () => seenOnce.disconnect();
  }, []);

  useEffect(() => {
    if (!seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const draw = { duration: 1300, easing: "cubic-bezier(.3,.7,.2,1)", fill: "both" as const };
    [viewRef, interestRef].forEach((r) => r.current?.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], draw));
    areaRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 300, fill: "both" });
    endRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, delay: 1100, fill: "both" });
  }, [seen, range]);

  const cross = hover === null ? null : (hover / (data.views.length - 1)) * 100;

  return (
    <div className="trend" ref={cardRef}>
      <div className="tr-head">
        <img src={image} alt="" />
        <div className="tr-name">
          <b>{t("da.work")}</b>
          <small>{t("sample")}</small>
        </div>
        <div className="tr-ranges">
          {([7, 30, 90] as const).map((r) => (
            <button key={r} type="button" aria-pressed={r === range} onClick={() => setRange(r)}>
              {r}D
            </button>
          ))}
        </div>
      </div>
      <div className="tr-num">
        <b>{data.views[data.views.length - 1].toLocaleString("en-US")}</b>
        <span>↗ {data.up}</span>
      </div>
      <div
        className="tr-chart"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
          setHover(Math.round(x * (data.views.length - 1)));
        }}
        onPointerLeave={() => setHover(null)}
      >
        <svg viewBox="0 0 600 220" aria-hidden="true">
          <path className="gl" d="M0 55H600M0 110H600M0 165H600" />
          <path className="ar" ref={areaRef} d={`${viewPath}L600 220L0 220Z`} />
          <path className="ln li" ref={interestRef} d={interestPath} pathLength={1} />
          <path className="ln lv" ref={viewRef} d={viewPath} pathLength={1} />
          {cross !== null ? <line className="cross" x1={cross * 6} x2={cross * 6} y1={0} y2={220} style={{ opacity: 1 }} /> : null}
          <circle className="end" ref={endRef} r={5} cx={end[0]} cy={end[1]} />
        </svg>
        {cross !== null && hover !== null ? (
          <div className="tip" style={{ left: `${Math.max(12, Math.min(88, cross))}%` }}>
            {t("da.views")} {data.views[hover].toLocaleString("en-US")} · {t("da.int")} {data.interest[hover]}
          </div>
        ) : null}
      </div>
      <div className="tr-legend">
        <span>
          <i className="lv" />
          <span>{t("da.views")}</span>
        </span>
        <span>
          <i className="li" />
          <span>{t("da.int")}</span>
        </span>
      </div>
    </div>
  );
}
