import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, ArrowRight, Check, CircleDashed, RotateCcw } from "lucide-react";
import KpiCard from "@/components/admin/KpiCard";
import SectionHeader from "@/components/admin/SectionHeader";
import StatusPill from "@/components/admin/StatusPill";
import { ApprovalPill, CostMeter, FrameCard, GrowthControls, LineNotifyPanel, MockPill, PLATFORM_LABEL, SmallButton, bangkokTime } from "@/components/admin/growth/GrowthBits";
import { approvalProgress, latestVersion } from "@/lib/growth/engine";
import { effectiveCreditStatus } from "@/lib/growth/tasks";
import { MOCK_INSIGHTS, UNAVAILABLE_METRICS } from "@/lib/growth/mockData";
import { useGrowth } from "@/lib/growth/store";
import type { Campaign } from "@/lib/growth/types";
import { useActivationFunnel } from "@/lib/growth/useActivationFunnel";

const TODAY = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short" });

function GroupHeader({ n, title, count, hint }: { n: string; title: string; count: number; hint: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 border-b border-admin-border pb-2">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-admin-muted">{n}</p>
        <h2 className="text-lg font-medium text-admin-fg">
          {title} <span className="font-mono text-sm text-admin-muted">({count})</span>
        </h2>
      </div>
      <p className="hidden text-xs text-admin-muted sm:block">{hint}</p>
    </div>
  );
}

function Check3({ ok, label }: { ok: boolean | "warn"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-admin-fg">
      {ok === true ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3 text-admin-accent" />}
      {label}
    </span>
  );
}

function ApproveCard({ c }: { c: Campaign }) {
  const v = latestVersion(c);
  const prog = approvalProgress(c);
  const warns = v.qc.checks.filter((q) => q.level !== "pass").length;
  const pendingRights = c.rights.filter((r) => r.status === "PENDING").length;
  const first = [...v.variants].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];
  const cover = v.components["frame-1"];
  return (
    <article className="grid gap-4 border border-admin-border bg-admin-bg p-4 rounded-sm sm:grid-cols-[120px_1fr]">
      {cover && <FrameCard component={cover} compact className="w-[120px]" />}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-medium text-admin-fg">{c.name}</h3>
          <StatusPill status={`v${v.version}`} tone="muted" />
          <StatusPill status={c.status} tone="accent" />
        </div>
        <p className="mt-0.5 text-xs text-admin-muted">
          {c.pillar} · goal: {c.goal} · โพสต์แรก {bangkokTime(first.scheduledAt)}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {v.variants.map((d) => (
            <span key={d.platform} className="inline-flex items-center gap-1">
              <span className="text-xs text-admin-muted">{PLATFORM_LABEL[d.platform]}</span>
              <ApprovalPill campaign={c} platform={d.platform} />
            </span>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-3">
          <Check3 ok={c.sources.length > 0} label="Sources" />
          <Check3 ok={pendingRights ? "warn" : true} label={pendingRights ? `Rights ${pendingRights} รอ` : "Rights"} />
          <Check3 ok={warns ? "warn" : true} label={warns ? `QC ${warns} เตือน` : "QC"} />
          <Check3 ok label="Budget (mock)" />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="font-mono text-xs text-admin-muted">
            approve แล้ว {prog.approved}/{prog.total}
          </p>
          <Link to={`campaigns/${c.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-admin-fg hover:underline">
            เปิดดู <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/** North-star from real data (profiles + projects). UNAVAILABLE if it cannot be read, never a guess. */
function ActivationKpi() {
  const { data, isLoading, isError } = useActivationFunnel();
  // /dev/growth runs without an admin login, so row-level security may hide some rows.
  const preview = useLocation().pathname.startsWith("/dev/");
  if (isLoading) return <KpiCard label="Activated creators (7d)" value="…" delta="กำลังนับจากข้อมูลจริง" />;
  if (isError || !data) return <KpiCard label="Activated creators (7d)" value="UNAVAILABLE" delta="อ่านข้อมูลโปรไฟล์/ผลงานไม่ได้" />;
  const step = (label: string, n: number) => (
    <span className="whitespace-nowrap">
      {label} <span className="font-mono text-admin-fg">{n}</span>
    </span>
  );
  return (
    <div className="mb-3 grid gap-3 sm:grid-cols-[220px_1fr]">
      <KpiCard label="Activated creators (7d)" value={data.activated} delta={data.directional ? "ฐานยังเล็ก ดูเป็นทิศทาง" : undefined} accent />
      <div className="flex flex-col justify-center gap-1 border border-admin-border bg-admin-surface p-4 rounded-sm text-sm text-admin-muted">
        <div className="flex flex-wrap items-center gap-2">
          {step("สมัคร", data.signups)} <ArrowRight className="h-3 w-3" /> {step("โปรไฟล์ครบ", data.profileCompleted)} <ArrowRight className="h-3 w-3" />
          {step("ลงผลงานแรกใน 7 วัน", data.activated)}
          <StatusPill status="ข้อมูลจริง" tone="default" />
        </div>
        <p className="text-xs">
          {preview && <span className="text-admin-accent">Preview ไม่ได้ล็อกอิน ตัวเลขอาจไม่ครบ · </span>}
          คนที่สมัครใน {data.windowDays} วันล่าสุด · ยังอยู่ในช่วง 7 วัน {data.stillOpen} คน (ยังขยับได้) · โปรไฟล์ครบ = รูป + role + bio · นับจากผลงานสถานะ Published
        </p>
      </div>
    </div>
  );
}

export default function GrowthOverviewPage() {
  const { state, decide, reset } = useGrowth();
  const toApprove = state.campaigns.filter((c) => c.status === "AWAITING_APPROVAL");
  const scheduled = state.campaigns.filter((c) => c.status === "APPROVED" || c.status === "SCHEDULED" || c.status === "EXPORTED_FOR_MANUAL_POST");

  // Needs Decision = seeded items + anything the system raised (stuck comments, budget, Pause All).
  const raised: { id: string; title: string; detail: string }[] = [];
  if (state.settings.pauseAll) raised.push({ id: "pause", title: "Pause All เปิดอยู่", detail: "ไม่มีงานไหนถูกส่งออกจนกว่าจะปิด" });
  if (effectiveCreditStatus(state.settings) === "EXHAUSTED") raised.push({ id: "credit", title: "AI credit หมดรอบนี้ (จำลอง)", detail: "งาน AI เป็น BLOCKED_BUDGET รอรอบใหม่ ไม่ซื้อเพิ่ม" });
  for (const c of state.campaigns) {
    for (const cm of c.comments.filter((x) => x.status === "NEEDS_OWNER_DECISION")) {
      raised.push({ id: cm.id + c.id, title: `${c.name}: คอมเมนต์รอคุณตัดสินใจ`, detail: cm.aiNote ?? cm.body });
    }
  }
  const openDecisions = state.decisions.filter((d) => !d.decided).length + raised.length;

  return (
    <>
      <SectionHeader
        eyebrow={`Growth Engine · ${TODAY.format(new Date())} · Thailand`}
        title="Today's decisions"
        description="คุณแค่ approve, คอมเมนต์ และตัดสินใจ ที่เหลือ AI ทำ (ตอนนี้เป็น mock)"
        actions={
          <SmallButton onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" /> รีเซ็ตเดโม
          </SmallButton>
        }
      />
      <GrowthControls />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section aria-labelledby="g-approve">
            <GroupHeader n="01" title="Approve Today" count={toApprove.length} hint="ภาพ + ข้อความ + ช่องทาง + เวลา + หลักฐาน" />
            <div className="space-y-3">
              {toApprove.length === 0 && <p className="py-6 text-center text-sm text-admin-muted">ไม่มีงานรอ approve</p>}
              {toApprove.map((c) => (
                <ApproveCard key={c.id} c={c} />
              ))}
              {scheduled.length > 0 && (
                <p className="text-xs text-admin-muted">
                  approve ครบแล้ว: {scheduled.map((c) => `${c.name} (${c.status})`).join(", ")}
                </p>
              )}
            </div>
          </section>

          <section aria-labelledby="g-decide">
            <GroupHeader n="02" title="Needs Decision" count={openDecisions} hint="แหล่งข้อมูล สิทธิ์ คอมเมนต์เสี่ยง งบ ระบบ" />
            <ul className="divide-y divide-admin-border border border-admin-border rounded-sm">
              {raised.map((r) => (
                <li key={r.id} className="flex items-start gap-3 bg-admin-accent/5 p-4">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-admin-accent" />
                  <div>
                    <p className="text-sm font-medium text-admin-fg">{r.title}</p>
                    <p className="text-xs text-admin-muted">{r.detail}</p>
                  </div>
                </li>
              ))}
              {state.decisions.map((d) => (
                <li key={d.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-admin-muted" />
                    <div>
                      <p className="text-sm font-medium text-admin-fg">{d.title}</p>
                      <p className="text-xs text-admin-muted">{d.detail}</p>
                    </div>
                  </div>
                  {d.decided ? (
                    <StatusPill status={`เลือก: ${d.decided}`} tone="default" />
                  ) : (
                    <div className="flex flex-wrap gap-1.5 sm:justify-end">
                      {d.options.map((o) => (
                        <SmallButton key={o} onClick={() => decide(d.id, o)}>
                          {o}
                        </SmallButton>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="g-insights">
            <GroupHeader n="03" title="Growth Insights" count={MOCK_INSIGHTS.length} hint="สูงสุด 3 เรื่องต่อสัปดาห์: Keep / Improve / Stop / Test Next" />
            <ActivationKpi />
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              {UNAVAILABLE_METRICS.map((m) => (
                <KpiCard key={m.label} label={m.label} value="UNAVAILABLE" delta={m.reason} />
              ))}
            </div>
            <ul className="space-y-2">
              {MOCK_INSIGHTS.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-3 border border-admin-border p-3 rounded-sm">
                  <div>
                    <p className="text-sm text-admin-fg">{i.title}</p>
                    <p className="text-xs text-admin-muted">{i.detail}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <StatusPill status={i.action} />
                    <MockPill />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-admin-muted">Insight 3 ข้อด้านบนเป็นตัวอย่าง (mock) ส่วน Activated creators เป็นตัวเลขจริง</p>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <LineNotifyPanel />
          <CostMeter />
        </aside>
      </div>
    </>
  );
}
