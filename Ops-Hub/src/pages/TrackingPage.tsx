import { useState } from "react";
import { ExternalLink, Globe, Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { TrackingFeatureCard } from "@/components/TrackingFeatureCard";
import {
  ECOSYSTEM_SITES,
  TRACKING_UPDATED,
  percentBarColor,
  percentColor,
  type TrackingSite,
} from "@/lib/ecosystem-tracking";
import { collectTrackingIssueDrafts } from "@/lib/tracking-issues";
import { useCreateTrackingIssues } from "@/hooks/useCreateTrackingIssues";
import { friendlyError } from "@/lib/friendly-error";
import { useInfraMonitor } from "@/hooks/useInfraMonitor";
import { useEcosystemFunnel } from "@/hooks/useEcosystemFunnel";
import { computeTrackingSyncOverlay, getSyncedSites, latestSyncTime } from "@/lib/tracking-sync";

const SITE_TAB_STYLE: Record<TrackingSite["id"], { active: string; ring: string }> = {
  so1o: { active: "bg-brand text-white", ring: "ring-brand/30" },
  an1hem: { active: "bg-an1hem text-white", ring: "ring-an1hem/30" },
  ops_hub: { active: "bg-ink text-white", ring: "ring-ink/20" },
};

function SiteOverview({
  site,
  onCreateAll,
  creating,
  pendingCount,
}: {
  site: TrackingSite;
  onCreateAll: () => void;
  creating: boolean;
  pendingCount: number;
}) {
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
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-xs text-muted">ความพร้อมรวม</p>
            <p className={`text-3xl font-bold tabular-nums ${percentColor(site.overallPercent)}`}>
              {site.overallPercent}%
            </p>
          </div>
          {pendingCount > 0 ? (
            <button
              type="button"
              disabled={creating}
              onClick={onCreateAll}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand/90 disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              สร้างงานจาก tracking ({pendingCount})
            </button>
          ) : (
            <p className="text-[10px] text-muted">ไม่มีรายการพัฒนาเพิ่ม</p>
          )}
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
  const [createMsg, setCreateMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const createIssues = useCreateTrackingIssues();
  const { data: infra } = useInfraMonitor();
  const { data: funnel } = useEcosystemFunnel(7);

  const syncedSites = getSyncedSites(infra, funnel);
  const syncOverlays = computeTrackingSyncOverlay(infra, funnel);
  const syncedAt = latestSyncTime(syncOverlays);
  const site = syncedSites.find((s) => s.id === activeId) ?? syncedSites[0];
  const pendingCount = collectTrackingIssueDrafts(site).length;

  const runCreate = async (
    key: string,
    input: Parameters<typeof createIssues.mutateAsync>[0],
  ) => {
    setCreatingKey(key);
    setCreateMsg(null);
    try {
      const result = await createIssues.mutateAsync(input);
      setCreateMsg({
        ok: true,
        text: `สร้าง ${result.created} งาน · ข้าม ${result.skipped} ที่มีอยู่แล้ว (รวม ${result.total} รายการ)`,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      setCreateMsg({
        ok: false,
        text: friendlyError(`สร้างงานไม่สำเร็จ${detail ? `: ${detail}` : ""}`),
      });
    } finally {
      setCreatingKey(null);
    }
  };

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
          สิ่งที่ทำแล้ว และสิ่งที่ควรพัฒนาต่อ — อัปเดตล่าสุด: {TRACKING_UPDATED}
          {syncedAt ? ` · sync live ${new Date(syncedAt).toLocaleString("th-TH")}` : infra ? " · sync จาก /monitor" : ""}
          {" · "}
          กด <strong className="text-ink">สร้างงานจาก tracking</strong> เพื่อส่งรายการพัฒนาไปยัง task board
          ของแต่ละเว็บ (ops.issues)
        </div>

        {createMsg ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              createMsg.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {createMsg.text}
          </div>
        ) : null}

        {/* Site tabs */}
        <div className="flex flex-wrap gap-2">
          {ECOSYSTEM_SITES.map((s) => {
            const synced = syncedSites.find((x) => x.id === s.id) ?? s;
            const style = SITE_TAB_STYLE[s.id];
            const isActive = s.id === activeId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setActiveId(s.id);
                  setCreateMsg(null);
                }}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? `${style.active} border-transparent shadow-sm`
                    : "border-border bg-white text-muted hover:text-ink"
                }`}
              >
                {s.name}
                <span className={`ml-2 tabular-nums ${isActive ? "opacity-90" : percentColor(synced.overallPercent)}`}>
                  {synced.overallPercent}%
                </span>
              </button>
            );
          })}
        </div>

        <SiteOverview
          site={site}
          pendingCount={pendingCount}
          creating={creatingKey === "site"}
          onCreateAll={() => void runCreate("site", { site })}
        />

        {/* Categories */}
        <div className="space-y-8">
          {site.categories.map((cat) => (
            <section key={cat.id}>
              <div className="mb-4">
                <h3 className="text-base font-semibold text-ink">{cat.title}</h3>
                <p className="text-sm text-muted">{cat.summary}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {cat.features.map((f) => {
                  const key = `${cat.id}:${f.name}`;
                  return (
                    <TrackingFeatureCard
                      key={f.name}
                      feature={f}
                      creating={creatingKey === key}
                      onCreate={
                        f.improve.length > 0
                          ? () =>
                              void runCreate(key, {
                                site,
                                filter: { categoryId: cat.id, featureName: f.name },
                              })
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Ecosystem summary */}
        <section className="rounded-xl border border-dashed border-border bg-white/50 p-5">
          <h3 className="mb-3 text-sm font-semibold">สรุปทั้ง ecosystem</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {syncedSites.map((s) => (
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
                <p className="text-[10px] text-muted">
                  {s.categories.length} หมวด · {s.categories.reduce((n, c) => n + c.features.length, 0)} ฟีเจอร์
                  {" · "}
                  {collectTrackingIssueDrafts(s).length} งานพัฒนา
                </p>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
