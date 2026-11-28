import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { getStudioInsights, type InsightDay, type StudioWork } from "@/server/queries/studio";
import { count } from "../profile/tiles";
import { coverOf } from "./StudioWorks";
import LoadError from "../shell/LoadError";

type Metric = "views" | "followers" | "likes";
const METRICS: ReadonlyArray<readonly [Metric, string]> = [
  ["views", "Views"],
  ["followers", "Followers"],
  ["likes", "Likes"],
];
const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
/** "2026-11-15" → "15 พ.ย." (mock DT). */
export const thDay = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${TH_MONTHS[Number(m) - 1] ?? ""}`;
};

export function useInsights(uid: string, days: number) {
  return useQuery({ queryKey: ["sc-studio-insights", uid, days], queryFn: () => getStudioInsights(days), staleTime: 60_000 });
}

/** The current period (last `days` days) and the one before it. */
export function splitPeriods(rows: InsightDay[] | null | undefined, days: number) {
  const all = rows ?? [];
  return { cur: all.slice(-days), prev: all.slice(0, Math.max(0, all.length - days)) };
}

const sum = (rows: InsightDay[], m: Metric) => rows.reduce((a, r) => a + (r[m] ?? 0), 0);

/** My Studio → Insights (mock): 7D / 30D, three totals, a daily bar chart per metric, top works. */
export default function StudioInsights({ uid, works }: { uid: string; works: StudioWork[] }) {
  const [days, setDays] = useState<7 | 30>(7);
  const [metric, setMetric] = useState<Metric>("views");
  const q = useInsights(uid, days);
  const { cur, prev } = splitPeriods(q.data, days);
  const ready = !!q.data;

  const series = cur.map((r) => r[metric]);
  const total = series.reduce((a, b) => a + b, 0);
  const before = sum(prev, metric);
  const pct = before > 0 ? Math.round(((total - before) / before) * 100) : total > 0 ? 100 : 0;
  const max = series.length ? Math.max(...series) : 0;
  const maxDay = series.length ? cur[series.indexOf(max)].day : "";
  const top = Math.max(4, Math.ceil(max / 4) * 4);
  const avg = series.length ? total / series.length : 0;
  const best = works
    .filter((w) => w.status === "Published")
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 3);

  return (
    <>
      <div className="ms-row">
        <div className="ms-seg" role="group" aria-label="ช่วงเวลา">
          {([7, 30] as const).map((d) => (
            <button key={d} type="button" className={days === d ? "ms-seg-on" : ""} aria-pressed={days === d} onClick={() => setDays(d)}>
              {d}D
            </button>
          ))}
        </div>
      </div>
      <div className="ms-nums">
        <div className="ms-num">
          <b>{ready ? count(sum(cur, "views")) : "—"}</b>
          <span>Views</span>
        </div>
        <div className="ms-num">
          <b>{ready ? count(sum(cur, "followers")) : "—"}</b>
          <span>New followers</span>
        </div>
        <div className="ms-num">
          <b>{ready ? count(sum(cur, "likes")) : "—"}</b>
          <span>Likes</span>
        </div>
      </div>
      <div className="ms-chartcard">
        <div className="ms-row ms-wrap">
          {METRICS.map(([k, label]) => (
            <button key={k} type="button" className={metric === k ? "ms-met ms-met-on" : "ms-met"} aria-pressed={metric === k} onClick={() => setMetric(k)}>
              {label}
            </button>
          ))}
        </div>
        {ready ? (
          <>
            <div className="ms-csum">
              <span>
                <b className="ms-ctotal">{count(total)}</b> รวม
              </span>
              <span style={{ color: pct >= 0 ? "#2F6B3A" : "#B8321F" }}>
                {pct >= 0 ? "+" : ""}
                {pct}% จากช่วงก่อน
              </span>
              <span>
                เฉลี่ย <b>{avg.toFixed(1)}</b> / วัน
              </span>
              <span>
                สูงสุด <b>{max}</b> · {maxDay ? thDay(maxDay) : "—"}
              </span>
            </div>
            <div className="ms-chart" role="img" aria-label={`กราฟ ${metric} รายวัน ${series.length} วัน รวม ${total}`}>
              {[0, 0.5, 1].map((f) => (
                <span key={f} className="ms-gl" style={{ bottom: `${f * 100}%` }}>
                  <span>{Math.round(top * f)}</span>
                </span>
              ))}
              <span aria-hidden="true" className="ms-avg" style={{ bottom: `${(avg / top) * 100}%` }}>
                <span>เฉลี่ย</span>
              </span>
              <div className="ms-bars">
                {cur.map((r, i) => {
                  const last = i === cur.length - 1;
                  const v = r[metric];
                  return (
                    <button key={r.day} type="button" className="ms-bw" aria-label={`${thDay(r.day)} ${v}`}>
                      <span className={last ? "ms-bar ms-bar-last" : "ms-bar"} style={{ height: `${Math.max(1.5, (v / top) * 100)}%` }} />
                      <span className="ms-tip">
                        {thDay(r.day)}
                        {last ? " (วันนี้)" : ""}
                        <b>{v}</b>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="ms-xl">
              {cur.map((r, i) => {
                const last = i === cur.length - 1;
                // Every day for 7D; for 30D every 5th day, minus the one that would touch "วันนี้" (mock + phones).
                const shown = cur.length <= 7 || last || (i % 5 === 4 && i < cur.length - 3);
                return <span key={r.day}>{shown ? (last ? "วันนี้" : thDay(r.day)) : ""}</span>;
              })}
            </div>
          </>
        ) : (
          q.isError ? <LoadError onRetry={() => void q.refetch()} /> : <p className="ms-dash">{q.isPending ? "" : "—"}</p>
        )}
      </div>
      <div>
        <h3 className="ms-h3">Top works</h3>
        {best.map((w, i) => (
          <div key={w.id} className="ms-evr ms-top">
            <span className="ms-rank">{i + 1}</span>
            {coverOf(w) ? <img src={proxiedImageUrl(coverOf(w), 160)} alt="" className="ms-thumb" /> : <span aria-hidden="true" className="ms-thumb" />}
            <span className="ms-top-t">{w.title?.trim() || "Untitled"}</span>
            <span className="ms-top-v">
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
              {count(w.views ?? 0)}
            </span>
          </div>
        ))}
        {best.length ? null : <p className="ms-dash">—</p>}
      </div>
      {/* "90D · ที่มา · Export PDF" + Samecor Pro is hidden while Pro is hidden (owner decision 8). */}
    </>
  );
}
