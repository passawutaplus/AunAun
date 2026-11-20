import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { toast } from "sonner";
import DataTable, { type Column } from "@/components/admin/DataTable";
import SectionHeader from "@/components/admin/SectionHeader";
import StatusPill from "@/components/admin/StatusPill";
import {
  ApprovalPill,
  CommentButton,
  CostMeter,
  FeedGrid,
  FrameCard,
  GrowthControls,
  LockToggle,
  MockPill,
  PLATFORM_LABEL,
  SmallButton,
  bangkokTime,
} from "@/components/admin/growth/GrowthBits";
import { BLOCK_REASON_TH, isPlatformApproved, latestVersion, platformsOf } from "@/lib/growth/engine";
import { shortHash } from "@/lib/growth/hash";
import { DEMO_COMMENT } from "@/lib/growth/mockData";
import { MOCK_PARSER_HELP } from "@/lib/growth/revision";
import { useGrowth } from "@/lib/growth/store";
import type { ArtifactComponent, AuditEntry, Campaign, CampaignVersion, CommentScope, Platform, QcCheck } from "@/lib/growth/types";
import { cn } from "@/lib/utils";

type Tab = "master" | "platforms" | "feed" | "seo" | "diff" | "history";
const TABS: { id: Tab; label: string }[] = [
  { id: "master", label: "Master" },
  { id: "platforms", label: "Platforms" },
  { id: "feed", label: "Feed 3×3" },
  { id: "seo", label: "SEO" },
  { id: "diff", label: "Before / After" },
  { id: "history", label: "History" },
];

const SCOPES: { id: CommentScope; label: string }[] = [
  { id: "CAMPAIGN", label: "ทั้งแคมเปญ" },
  { id: "IMAGE_FRAME", label: "ภาพ / เฟรม" },
  { id: "COPY_CHANNEL", label: "แคปชั่นรายช่อง" },
  { id: "SEO_SECTION", label: "ส่วนของบทความ" },
  { id: "FEED", label: "ฟีด 3×3" },
];

const selectCls = "h-9 w-full rounded-sm border border-admin-border bg-admin-bg px-2 text-sm text-admin-fg focus:outline-none focus:ring-1 focus:ring-admin-fg";

function targetsFor(scope: CommentScope, v: CampaignVersion): ArtifactComponent[] {
  const all = Object.values(v.components);
  if (scope === "IMAGE_FRAME") return all.filter((c) => c.kind === "frame");
  if (scope === "COPY_CHANNEL") return all.filter((c) => c.kind === "copy");
  if (scope === "SEO_SECTION") return all.filter((c) => c.kind === "seo_section" || c.kind === "seo_meta");
  return [];
}

function QcLine({ check }: { check?: QcCheck }) {
  if (!check) return null;
  return <StatusPill status={check.level === "pass" ? "QC ผ่าน" : `QC ${check.level}: ${check.detail}`} tone={check.level === "pass" ? "muted" : "accent"} />;
}

function Toolbar({ c, comp, onComment }: { c: Campaign; comp: ArtifactComponent; onComment: () => void }) {
  const { toggleLock } = useGrowth();
  return (
    <div className="flex items-center gap-1.5">
      <LockToggle locked={c.locks.includes(comp.id)} onToggle={() => toggleLock(c.id, comp.id)} label={comp.label} />
      <CommentButton onClick={onComment} label={comp.label} />
    </div>
  );
}

function TextBlock({ comp }: { comp: ArtifactComponent }) {
  if (comp.kind === "copy") {
    return (
      <div className="space-y-1 text-sm text-admin-fg">
        <p className="whitespace-pre-line">{comp.content.text}</p>
        {comp.content.hashtags.length > 0 && <p className="text-xs text-admin-muted">{comp.content.hashtags.map((h) => `#${h}`).join(" ")}</p>}
        {comp.content.cta && <p className="font-mono text-[10px] uppercase tracking-wider text-admin-muted">CTA: {comp.content.cta}</p>}
      </div>
    );
  }
  if (comp.kind === "seo_section") {
    return (
      <div className="text-sm text-admin-fg">
        <p className="font-medium">H2 · {comp.content.heading}</p>
        <p className="mt-1 text-admin-muted">{comp.content.body}</p>
        {comp.content.bullets.length > 0 && (
          <ul className="mt-1 list-disc pl-5 text-admin-fg">
            {comp.content.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  if (comp.kind === "seo_meta") {
    return (
      <div className="text-sm">
        <p className="text-admin-fg underline">{comp.content.title}</p>
        <p className="font-mono text-xs text-admin-muted">samecor.com/journal/{comp.content.slug}</p>
        <p className="text-admin-muted">{comp.content.metaDescription}</p>
      </div>
    );
  }
  if (comp.kind === "pin") {
    return (
      <div className="flex aspect-[2/3] w-40 flex-col justify-between rounded-sm bg-[#F2F2F0] p-3 text-[#282929]">
        <p className="text-sm font-semibold leading-tight">{comp.content.title}</p>
        <ul className="space-y-1 text-[10px]">
          {comp.content.items.map((i) => (
            <li key={i}>☐ {i}</li>
          ))}
        </ul>
        <p className="font-mono text-[8px] uppercase tracking-[0.2em] opacity-60">SAMECOR · 2:3</p>
      </div>
    );
  }
  if (comp.kind === "feed") return <FeedGrid tiles={comp.content.tiles} />;
  return <FrameCard component={comp} className="w-48" />;
}

function PlatformCard({ c, platform, onComment, selected, onSelect }: { c: Campaign; platform: Platform; onComment: (scope: CommentScope, id: string) => void; selected: boolean; onSelect: () => void }) {
  const v = latestVersion(c);
  const def = v.variants.find((d) => d.platform === platform)!;
  const comps = def.componentIds.map((id) => v.components[id]);
  const copy = comps.find((x) => x.kind === "copy");
  const frames = comps.filter((x) => x.kind === "frame");
  return (
    <article className="border border-admin-border bg-admin-bg p-4 rounded-sm">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={selected} onChange={onSelect} className="h-4 w-4 accent-[#282929]" />
          <span className="font-medium text-admin-fg">{def.label}</span>
          <span className="font-mono text-[10px] text-admin-muted">{def.canvas}</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-admin-muted">{bangkokTime(def.scheduledAt)}</span>
          <ApprovalPill campaign={c} platform={platform} />
        </div>
      </header>
      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <div>
          {platform === "instagram" && (
            <div className="grid grid-cols-6 gap-1 md:w-[360px]">
              {frames.map((f) => (
                <FrameCard key={f.id} component={f} compact />
              ))}
            </div>
          )}
          {(platform === "facebook" || platform === "blog") && frames[0] && <FrameCard component={frames[0]} className="w-40" />}
          {platform === "pinterest" && comps.find((x) => x.kind === "pin") && <TextBlock comp={comps.find((x) => x.kind === "pin")!} />}
          {platform === "threads" && <p className="max-w-[220px] font-mono text-[10px] uppercase tracking-wider text-admin-muted">text-first ไม่มีภาพ</p>}
        </div>
        <div className="min-w-0 space-y-3">
          {copy && (
            <div className="flex items-start justify-between gap-3">
              <TextBlock comp={copy} />
              <Toolbar c={c} comp={copy} onComment={() => onComment("COPY_CHANNEL", copy.id)} />
            </div>
          )}
          {platform === "blog" && v.components["seo:meta"] && <TextBlock comp={v.components["seo:meta"]} />}
          <p className="font-mono text-[10px] text-admin-muted">hash {shortHash(v.variantHashes[platform])}</p>
        </div>
      </div>
    </article>
  );
}

function DiffView({ c }: { c: Campaign }) {
  const revised = c.versions.filter((v) => v.changeSummary);
  const [pick, setPick] = useState<number | null>(null);
  const v = revised.find((x) => x.version === pick) ?? revised[revised.length - 1];
  if (!v?.changeSummary) {
    return <p className="py-10 text-center text-sm text-admin-muted">ยังไม่มีการแก้ ลองพิมพ์คอมเมนต์แล้วกด Revise</p>;
  }
  const s = v.changeSummary;
  const prev = c.versions.find((x) => x.version === s.fromVersion)!;
  return (
    <div className="space-y-4">
      {revised.length > 1 && (
        <div className="flex gap-1.5">
          {revised.map((x) => (
            <SmallButton key={x.version} onClick={() => setPick(x.version)} primary={x.version === v.version}>
              v{x.version - 1} → v{x.version}
            </SmallButton>
          ))}
        </div>
      )}
      <div className="border border-admin-border bg-admin-surface p-4 rounded-sm">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-admin-muted">
          v{s.fromVersion} → v{s.toVersion} · comment {s.commentId}
        </p>
        <p className="mt-1 text-sm text-admin-fg">{s.text}</p>
      </div>
      {s.modified.map((ch) => (
        <div key={ch.componentId} className="border border-admin-border p-4 rounded-sm">
          <p className="mb-3 text-sm font-medium text-admin-fg">
            {ch.label} <span className="font-normal text-admin-muted">· {ch.note}</span>
          </p>
          <div className="grid grid-cols-2 gap-4">
            {(["before", "after"] as const).map((side) => (
              <div key={side}>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-admin-muted">
                  {side === "before" ? `Before v${s.fromVersion}` : `After v${s.toVersion}`}
                </p>
                <TextBlock comp={ch[side]} />
              </div>
            ))}
          </div>
        </div>
      ))}
      {s.keptLocked.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border border-admin-border p-4 rounded-sm">
          <Lock className="h-4 w-4 text-admin-muted" />
          <span className="text-sm text-admin-fg">ไม่แตะ (ล็อก):</span>
          {s.keptLocked.map((id) => (
            <StatusPill key={id} status={`${v.components[id]?.label ?? id} · hash เดิม ${shortHash(v.componentHashes[id])}`} tone="muted" />
          ))}
        </div>
      )}
      <div className="border border-admin-border p-4 rounded-sm">
        <p className="mb-2 text-sm font-medium text-admin-fg">Approval ที่ได้รับผล</p>
        <ul className="space-y-1 text-sm">
          {platformsOf(v).map((p) => {
            const changed = s.affectedPlatforms.includes(p);
            return (
              <li key={p} className="flex flex-wrap items-center gap-2">
                <span className="w-24 text-admin-muted">{PLATFORM_LABEL[p]}</span>
                <span className="font-mono text-xs text-admin-muted">
                  {shortHash(prev.variantHashes[p])} → {shortHash(v.variantHashes[p])}
                </span>
                <StatusPill status={changed ? "เปลี่ยน · ต้อง approve ใหม่" : "เหมือนเดิม · approval เดิมใช้ต่อได้"} tone={changed ? "accent" : "muted"} />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const AUDIT_COLS: Column<AuditEntry>[] = [
  { key: "at", header: "เวลา", render: (r) => <span className="whitespace-nowrap text-xs">{bangkokTime(r.at)}</span> },
  { key: "actor", header: "ใคร", render: (r) => <span className="text-xs">{r.actor.name}</span> },
  { key: "action", header: "Action", render: (r) => <span className="font-mono text-xs">{r.action}</span> },
  { key: "detail", header: "รายละเอียด", render: (r) => <span className="break-all font-mono text-[11px] text-admin-muted">{[r.fromVersion && `v${r.fromVersion}→`, r.toVersion && `v${r.toVersion}`, r.detail].filter(Boolean).join(" ")}</span> },
];

export default function GrowthCampaignPage() {
  const { campaignId = "" } = useParams();
  const g = useGrowth();
  const c = g.campaign(campaignId);
  const [tab, setTab] = useState<Tab>("master");
  const [scope, setScope] = useState<CommentScope>("IMAGE_FRAME");
  const [targetId, setTargetId] = useState("frame-2");
  const [body, setBody] = useState(DEMO_COMMENT);
  const [selected, setSelected] = useState<Platform[]>([]);
  const [confirmReject, setConfirmReject] = useState(false);
  const composer = useRef<HTMLTextAreaElement>(null);
  const v = c ? latestVersion(c) : null;
  const targets = useMemo(() => (v ? targetsFor(scope, v) : []), [scope, v]);

  if (!c || !v) {
    return (
      <div className="py-16 text-center">
        <p className="text-admin-muted">ไม่เจอแคมเปญนี้</p>
        <Link to=".." className="mt-2 inline-block text-sm underline">
          กลับหน้า Growth
        </Link>
      </div>
    );
  }

  const qcFor = (id: string) => v.qc.checks.find((q) => q.componentId === id);
  const focusComment = (s: CommentScope, id: string) => {
    setScope(s);
    setTargetId(id);
    if (!body) setBody("");
    composer.current?.focus();
    composer.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const onScope = (s: CommentScope) => {
    setScope(s);
    setTargetId(targetsFor(s, v)[0]?.id ?? "");
  };

  const revise = () => {
    const platform = scope === "COPY_CHANNEL" ? (targetId.replace("copy:", "") as Platform) : undefined;
    const r = g.revise(c.id, { scope, targetId: targetId || undefined, platform, body });
    if (r.ok === false) return toast.error(r.error);
    if (r.value.kind === "revised") {
      toast.success(`ได้ v${r.value.version.version} แล้ว · กลับไปรอ approve`);
      setTab("diff");
      setBody("");
    } else {
      toast.message("ยังไม่แก้", { description: r.value.reason });
    }
  };

  const approve = (platforms: Platform[]) => {
    const r = g.approve(c.id, platforms);
    if (r.ok === false) return toast.error(r.error);
    toast.success(`Approve ${platforms.map((p) => PLATFORM_LABEL[p]).join(", ")} แล้ว`);
    setSelected([]);
  };

  const notApproved = platformsOf(v).filter((p) => !isPlatformApproved(c, p));
  const canApprove = c.status === "AWAITING_APPROVAL";
  const canSchedule = platformsOf(v).some((p) => isPlatformApproved(c, p) && !c.jobs.some((j) => j.platform === p && ["SCHEDULED", "EXPORTED_FOR_MANUAL_POST"].includes(j.status)));
  const scheduledJobs = c.jobs.filter((j) => j.status === "SCHEDULED");
  const lastDispatch = g.state.lastDispatch?.campaignId === c.id ? g.state.lastDispatch.results : null;
  const frames = Object.values(v.components).filter((x) => x.kind === "frame");
  const feed = v.components["feed:grid"];
  const seo = Object.values(v.components).filter((x) => x.kind === "seo_meta" || x.kind === "seo_section");

  return (
    <>
      <Link to=".." className="mb-3 inline-flex items-center gap-1 text-sm text-admin-muted hover:text-admin-fg">
        <ArrowLeft className="h-3.5 w-3.5" /> Today's decisions
      </Link>
      <SectionHeader
        eyebrow={`Campaign review · ${c.pillar} · goal: ${c.goal}`}
        title={c.name}
        description={`เวอร์ชันล่าสุด v${v.version} · hash ${shortHash(v.contentHash)} · QC ${v.qc.level.toUpperCase()}`}
        actions={<StatusPill status={c.status} tone={c.status === "AWAITING_APPROVAL" ? "accent" : "default"} />}
      />
      <GrowthControls />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div role="tablist" className="mb-4 flex flex-wrap gap-1 border-b border-admin-border">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
                  tab === t.id ? "border-admin-fg font-medium text-admin-fg" : "border-transparent text-admin-muted hover:text-admin-fg",
                )}
              >
                {t.label}
                {t.id === "diff" && c.versions.length > 1 && <span className="ml-1 font-mono text-[10px]">v{v.version}</span>}
              </button>
            ))}
          </div>

          {tab === "master" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {frames.map((f) => (
                <div key={f.id} className={cn("space-y-2", c.locks.includes(f.id) && "opacity-95")}>
                  <FrameCard component={f} className={cn(c.locks.includes(f.id) && "ring-2 ring-admin-fg ring-offset-2")} />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-admin-fg">
                      {f.label} {c.locks.includes(f.id) && <span className="font-mono text-[10px] text-admin-muted">LOCKED</span>}
                    </span>
                    <Toolbar c={c} comp={f} onComment={() => focusComment("IMAGE_FRAME", f.id)} />
                  </div>
                  <QcLine check={qcFor(f.id)} />
                </div>
              ))}
            </div>
          )}

          {tab === "platforms" && (
            <div className="space-y-3">
              {platformsOf(v).map((p) => (
                <PlatformCard
                  key={p}
                  c={c}
                  platform={p}
                  onComment={focusComment}
                  selected={selected.includes(p)}
                  onSelect={() => setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]))}
                />
              ))}
            </div>
          )}

          {tab === "feed" && feed && (
            <div className="grid gap-6 md:grid-cols-[320px_1fr]">
              <FeedGrid tiles={feed.kind === "feed" ? feed.content.tiles : []} />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-admin-fg">เรียงตามเวลาโพสต์จริง ช่อง 1 = ใหม่สุด</p>
                  <Toolbar c={c} comp={feed} onComment={() => focusComment("FEED", feed.id)} />
                </div>
                {v.qc.checks
                  .filter((q) => q.componentId === "feed:grid")
                  .map((q) => (
                    <div key={q.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-admin-fg">{q.label}</span>
                      <StatusPill status={`${q.level} · ${q.detail}`} tone={q.level === "pass" ? "muted" : "accent"} />
                    </div>
                  ))}
                <p className="text-xs text-admin-muted">ช่องอื่นเป็นโพสต์ตัวอย่าง (mock) ไม่ใช่ฟีดจริง</p>
              </div>
            </div>
          )}

          {tab === "seo" && (
            <div className="space-y-3">
              {seo.map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-3 border border-admin-border p-4 rounded-sm">
                  <div className="min-w-0 space-y-1">
                    <TextBlock comp={s} />
                    {s.kind === "seo_meta" &&
                      v.qc.checks
                        .filter((q) => q.componentId === s.id)
                        .map((q) => <QcLine key={q.id} check={q} />)}
                  </div>
                  <Toolbar c={c} comp={s} onComment={() => focusComment("SEO_SECTION", s.id)} />
                </div>
              ))}
            </div>
          )}

          {tab === "diff" && <DiffView c={c} />}

          {tab === "history" && (
            <div className="space-y-4">
              <DataTable columns={AUDIT_COLS} rows={[...c.audit].reverse()} rowKey={(r) => r.id} empty="ยังไม่มีประวัติ" />
              <p className="text-xs text-admin-muted">
                Jobs: {c.jobs.length ? c.jobs.map((j) => `${j.platform} ${j.status} (${j.idempotencyKey})`).join(" · ") : "ยังไม่มี"} · Exports: {c.publications.length} (simulated)
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <section className="border border-admin-border bg-admin-surface p-4 rounded-sm">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-admin-muted">Decision</p>
            <ul className="mb-3 space-y-1.5">
              {platformsOf(v).map((p) => (
                <li key={p} className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm text-admin-fg">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#282929]"
                      checked={selected.includes(p)}
                      disabled={isPlatformApproved(c, p)}
                      onChange={() => setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]))}
                    />
                    {PLATFORM_LABEL[p]}
                  </label>
                  <ApprovalPill campaign={c} platform={p} />
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <SmallButton primary disabled={!canApprove || notApproved.length === 0} onClick={() => approve(notApproved)}>
                Approve ทั้งหมด
              </SmallButton>
              <SmallButton disabled={!canApprove || selected.length === 0} onClick={() => approve(selected)}>
                Approve ที่เลือก
              </SmallButton>
              {confirmReject ? (
                <SmallButton
                  onClick={() => {
                    const r = g.reject(c.id, "owner rejected (mock)");
                    if (r.ok === false) toast.error(r.error);
                    setConfirmReject(false);
                  }}
                >
                  ยืนยัน Reject
                </SmallButton>
              ) : (
                <SmallButton disabled={c.status === "REJECTED"} onClick={() => setConfirmReject(true)}>
                  Reject
                </SmallButton>
              )}
            </div>
            {(canSchedule || scheduledJobs.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-admin-border pt-3">
                <SmallButton disabled={!canSchedule} onClick={() => {
                  const r = g.schedule(c.id);
                  if (r.ok === false) toast.error(r.error);
                  else toast.success(`ลงคิว ${r.value} งาน (simulated)`);
                }}>
                  ลงคิว (mock)
                </SmallButton>
                <SmallButton disabled={scheduledJobs.length === 0} onClick={() => g.dispatch(c.id)}>
                  จำลองถึงเวลาโพสต์ <ArrowRight className="h-3 w-3" />
                </SmallButton>
              </div>
            )}
            {lastDispatch && (
              <ul className="mt-2 space-y-1 text-xs">
                {lastDispatch.map((r) => (
                  <li key={r.jobId} className="text-admin-fg">
                    {PLATFORM_LABEL[r.platform]}: {r.outcome === "exported" ? "ส่งเป็น manual export draft (จำลอง)" : `บล็อก · ${BLOCK_REASON_TH[r.reason!]}`}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-admin-muted">Approve ผูกกับ hash ของแต่ละช่อง แก้อะไรก็ต้อง approve ใหม่</p>
          </section>

          <section className="border border-admin-border bg-admin-surface p-4 rounded-sm">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-admin-muted">Comment / ขอแก้</p>
            <div className="grid grid-cols-2 gap-2">
              <select aria-label="Scope" className={selectCls} value={scope} onChange={(e) => onScope(e.target.value as CommentScope)}>
                {SCOPES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select aria-label="Target" className={selectCls} value={targetId} disabled={targets.length === 0} onChange={(e) => setTargetId(e.target.value)}>
                {targets.length === 0 && <option value="">{scope === "FEED" ? "ฟีดทั้งกริด" : "ทั้งแคมเปญ"}</option>}
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                    {c.locks.includes(t.id) ? " (ล็อก)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              ref={composer}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="เช่น ภาพ 2 แน่นไป ลดข้อความ 30% อย่าแก้ภาพ 3"
              className="mt-2 w-full rounded-sm border border-admin-border bg-admin-bg p-2 text-sm text-admin-fg focus:outline-none focus:ring-1 focus:ring-admin-fg"
            />
            <p className="text-[11px] text-admin-muted">{MOCK_PARSER_HELP}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[11px] text-admin-muted">Revise = สั่งแก้ ไม่ใช่ approve</span>
              <SmallButton primary disabled={!body.trim() || !["AWAITING_APPROVAL", "APPROVED", "SCHEDULED"].includes(c.status)} onClick={revise}>
                Revise (mock)
              </SmallButton>
            </div>
            {c.comments.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-admin-border pt-3">
                {[...c.comments].reverse().map((cm) => (
                  <li key={cm.id} className="text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusPill status={cm.status} tone={cm.status === "RESOLVED_BY_AI" ? "muted" : "accent"} />
                      <span className="font-mono text-admin-muted">
                        {cm.scope} · v{cm.version}
                        {cm.resolvedInVersion ? ` → v${cm.resolvedInVersion}` : ""}
                      </span>
                    </div>
                    <p className="mt-1 text-admin-fg">{cm.body}</p>
                    {cm.aiNote && <p className="mt-0.5 text-admin-muted">{cm.aiNote}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <CostMeter />
          <div className="flex items-center gap-2 text-xs text-admin-muted">
            <MockPill /> ทุกอย่างในหน้านี้อยู่ในหน่วยความจำ รีเฟรชแล้วกลับค่าเริ่มต้น
          </div>
        </aside>
      </div>
    </>
  );
}
