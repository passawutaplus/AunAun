import { useState } from "react";
import { ExternalLink, Globe } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { TrackingFeatureCard } from "@/components/TrackingFeatureCard";
import {
  ECOSYSTEM_SITES,
  TRACKING_UPDATED,
  percentBarColor,
  percentColor,
  type TrackingSite,
} from "@/lib/ecosystem-tracking";

const SITE_TAB_STYLE: Record<TrackingSite["id"], { active: string; ring: string }> = {
  so1o: { active: "bg-brand text-white", ring: "ring-brand/30" },
  an1hem: { active: "bg-an1hem text-white", ring: "ring-an1hem/30" },
  ops_hub: { active: "bg-ink text-white", ring: "ring-ink/20" },
};

function SiteOverview({ site }: { site: TrackingSite }) {
  const style = SITE_TAB_STYLE[site.id];
  return (
    <div className={`rounded-xl border border-border bg-white p-5 shadow-sm ring-2 ${style.ring}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted" />
            <h2 className="text-xl font-bold">{site.name}</h2>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-brand"
            >
              เปิดเว็บ <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted">{site.tagline}</p>
          <p className="mt-1 text-[10px] text-muted">{site.tech}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">ความพร้อมรวม</p>
          <p className={`text-3xl font-bold tabular-nums ${percentColor(site.overallPercent)}`}>
            {site.overallPercent}%
          </p>
        </div>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface">
        <div
          className={`h-full rounded-full ${percentBarColor(site.overallPercent)}`}
          style={{ width: `${site.overallPercent}%` }}
        />
      </div>
    </div>
  );
}

export default function TrackingPage() {
  const [activeId, setActiveId] = useState<TrackingSite["id"]>("so1o");
  const site = ECOSYSTEM_SITES.find((s) => s.id === activeId) ?? ECOSYSTEM_SITES[0];

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="ติดตามระบบ"
        subtitle="สรุปฟีเจอร์ทุกเว็บใน ecosystem — ดูว่าทำอะไรไปแล้ว พัฒนาต่อได้อีกแค่ไหน"
      />

      <main className="space-y-6 p-6">
        <div className="rounded-xl border border-border bg-surface/40 px-4 py-3 text-sm leading-relaxed text-muted">
          <strong className="text-ink">หน้านี้คืออะไร?</strong>{" "}
          บันทึกความคืบหน้าของแต่ละเว็บแบบจดบันทึก — แยกหมวดชัดเจน มี % ความพร้อม
          สิ่งที่ทำแล้ว และสิ่งที่ควรพัฒนาต่อ อัปเดตล่าสุด: {TRACKING_UPDATED}
        </div>

        {/* Site tabs */}
        <div className="flex flex-wrap gap-2">
          {ECOSYSTEM_SITES.map((s) => {
            const style = SITE_TAB_STYLE[s.id];
            const isActive = s.id === activeId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveId(s.id)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? `${style.active} border-transparent shadow-sm`
                    : "border-border bg-white text-muted hover:text-ink"
                }`}
              >
                {s.name}
                <span className={`ml-2 tabular-nums ${isActive ? "opacity-90" : percentColor(s.overallPercent)}`}>
                  {s.overallPercent}%
                </span>
              </button>
            );
          })}
        </div>

        <SiteOverview site={site} />

        {/* Categories */}
        <div className="space-y-8">
          {site.categories.map((cat) => (
            <section key={cat.id}>
              <div className="mb-4">
                <h3 className="text-base font-semibold text-ink">{cat.title}</h3>
                <p className="text-sm text-muted">{cat.summary}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {cat.features.map((f) => (
                  <TrackingFeatureCard key={f.name} feature={f} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Ecosystem summary */}
        <section className="rounded-xl border border-dashed border-border bg-white/50 p-5">
          <h3 className="mb-3 text-sm font-semibold">สรุปทั้ง ecosystem</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {ECOSYSTEM_SITES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveId(s.id)}
                className="rounded-lg border border-border bg-white px-4 py-3 text-left transition hover:border-brand/40"
              >
                <p className="font-medium">{s.name}</p>
                <p className={`text-2xl font-bold tabular-nums ${percentColor(s.overallPercent)}`}>
                  {s.overallPercent}%
                </p>
                <p className="text-[10px] text-muted">{s.categories.length} หมวด · {s.categories.reduce((n, c) => n + c.features.length, 0)} ฟีเจอร์</p>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
