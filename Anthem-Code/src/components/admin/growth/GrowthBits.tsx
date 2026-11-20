import { Lock, LockOpen, MessageSquarePlus } from "lucide-react";
import StatusPill from "@/components/admin/StatusPill";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { platformApprovalState, type PlatformApprovalState } from "@/lib/growth/engine";
import { budgetAlertLevel, effectiveCreditStatus } from "@/lib/growth/tasks";
import { useGrowth } from "@/lib/growth/store";
import type { ArtifactComponent, Campaign, FeedTile, Platform, Tone } from "@/lib/growth/types";

/** Brand Book v1.0 tokens (not the draft colours in the Growth Engine doc). */
export const BRAND = { red: "#EE3D29", ink: "#282929", grey: "#F2F2F0", white: "#FFFFFF" } as const;

export function toneStyle(tone: Tone): { background: string; color: string; border?: string } {
  switch (tone) {
    case "ink":
      return { background: BRAND.ink, color: BRAND.white };
    case "grey":
      return { background: BRAND.grey, color: BRAND.ink };
    case "white":
      return { background: BRAND.white, color: BRAND.ink, border: `1px solid ${BRAND.grey}` };
    case "red":
      return { background: BRAND.red, color: BRAND.white };
    case "image":
      return { background: `repeating-linear-gradient(135deg, #d9d9d6 0 6px, ${BRAND.grey} 6px 12px)`, color: BRAND.ink };
  }
}

export const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  threads: "Threads",
  pinterest: "Pinterest",
  blog: "Blog / SEO",
};

const BKK = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
export function bangkokTime(iso: string): string {
  return BKK.format(new Date(iso));
}

export function MockPill({ label = "MOCK" }: { label?: string }) {
  return <StatusPill status={label} tone="muted" />;
}

export function ApprovalPill({ campaign, platform }: { campaign: Campaign; platform: Platform }) {
  const { state, approval } = platformApprovalState(campaign, platform);
  const text: Record<PlatformApprovalState, string> = {
    APPROVED: `Approved v${approval?.version ?? "?"}`,
    AWAITING: "รอ approve",
    STALE: `v${approval?.version} เก่า ต้อง approve ใหม่`,
  };
  return <StatusPill status={text[state]} tone={state === "APPROVED" ? "default" : "accent"} />;
}

export function IconButton({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-sm border text-admin-muted transition-colors hover:bg-admin-hover hover:text-admin-fg",
        active ? "border-admin-fg bg-admin-fg text-admin-bg hover:bg-admin-fg hover:text-admin-bg" : "border-admin-border bg-admin-bg",
      )}
    >
      {children}
    </button>
  );
}

export function LockToggle({ locked, onToggle, label }: { locked: boolean; onToggle: () => void; label: string }) {
  return (
    <IconButton label={locked ? `ปลดล็อก ${label}` : `ล็อก ${label}`} onClick={onToggle} active={locked}>
      {locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
    </IconButton>
  );
}

export function CommentButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <IconButton label={`คอมเมนต์ ${label}`} onClick={onClick}>
      <MessageSquarePlus className="h-3.5 w-3.5" />
    </IconButton>
  );
}

/** Deterministic HTML render of a carousel frame: Thai text is real text, never AI-baked pixels. */
export function FrameCard({ component, compact = false, className }: { component: ArtifactComponent; compact?: boolean; className?: string }) {
  if (component.kind !== "frame") return null;
  const f = component.content;
  const style = toneStyle(f.tone);
  return (
    <div className={cn("relative flex aspect-[4/5] flex-col overflow-hidden rounded-sm", compact ? "p-2" : "p-3", className)} style={style}>
      <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.2em] opacity-70">
        {!compact && <span>SAMECOR</span>}
        <span className={cn(compact && "ml-auto")}>{component.id.replace("frame-", "")}</span>
      </div>
      {!compact && (
        <div className="mt-2 flex min-h-[2.5rem] flex-1 items-center justify-center rounded-sm border border-dashed border-current px-2 text-center text-[9px] leading-tight opacity-60">
          MOCK VISUAL · {f.visualNote}
        </div>
      )}
      <div className={cn("mt-auto", compact ? "pt-1" : "pt-2")}>
        <p className={cn("font-semibold leading-tight", compact ? "text-[9px]" : "text-sm")}>{f.headline}</p>
        {!compact && (
          <ul className="mt-1 space-y-0.5 text-[10px] leading-snug opacity-90">
            {f.lines.map((l) => (
              <li key={l}>· {l}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function FeedGrid({ tiles, highlightOwn = true }: { tiles: FeedTile[]; highlightOwn?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-0.5 bg-admin-border p-0.5">
      {tiles.map((t, i) => (
        <div key={t.id} className="relative flex aspect-[3/4] flex-col justify-end p-1.5" style={toneStyle(t.tone)}>
          <span className="absolute left-1 top-1 font-mono text-[8px] opacity-60">{i + 1}</span>
          {t.own && highlightOwn && <span className="absolute right-1 top-1 rounded-sm bg-[#EE3D29] px-1 font-mono text-[7px] uppercase text-white">ใหม่</span>}
          <p className={cn("leading-tight", t.textHeavy ? "text-[9px] font-semibold" : "text-[8px] opacity-80")}>{t.label}</p>
          <p className="font-mono text-[7px] uppercase opacity-50">{t.recipe}</p>
        </div>
      ))}
    </div>
  );
}

/** Pause All + mode + cost meter. Shown on every Growth page. */
export function GrowthControls() {
  const { state, setPauseAll } = useGrowth();
  const { settings } = state;
  return (
    <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto]">
      <div className="flex flex-wrap items-center gap-3 border border-admin-border bg-admin-surface px-4 py-3 rounded-sm">
        <StatusPill status={`${settings.mode} mode`} tone="accent" />
        <p className="text-sm text-admin-muted">ข้อมูลตัวอย่างทั้งหมด ไม่มี AI จริง ไม่โพสต์จริง ไม่ใช้เครดิต</p>
      </div>
      <label
        className={cn(
          "flex cursor-pointer items-center justify-between gap-4 border px-4 py-3 rounded-sm",
          settings.pauseAll ? "border-admin-accent bg-admin-accent/10" : "border-admin-border bg-admin-surface",
        )}
      >
        <span>
          <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-admin-muted">Kill switch</span>
          <span className="block text-sm font-medium text-admin-fg">{settings.pauseAll ? "Pause All เปิดอยู่" : "Pause All"}</span>
          <span className="block text-xs text-admin-muted">หยุดส่งโพสต์ + หยุดรัน AI ไม่ลบงาน</span>
        </span>
        <Switch checked={settings.pauseAll} onCheckedChange={setPauseAll} aria-label="Pause All" />
      </label>
    </div>
  );
}

function MeterRow({ label, value, note, tone }: { label: string; value: string; note: string; tone: "muted" | "accent" | "default" }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-admin-border py-2 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-admin-fg">{label}</p>
        <p className="text-xs text-admin-muted">{note}</p>
      </div>
      <StatusPill status={value} tone={tone} />
    </div>
  );
}

export function CostMeter() {
  const { state, runAgents, simulateCreditOut, newCreditCycle } = useGrowth();
  const { aiCredit } = state.settings;
  const status = effectiveCreditStatus(state.settings);
  const level = budgetAlertLevel(aiCredit.spentEstimateUsd, aiCredit.capUsd);
  const counts = state.tasks.reduce<Record<string, number>>((m, t) => ({ ...m, [t.status]: (m[t.status] ?? 0) + 1 }), {});
  const claude =
    aiCredit.source === "unavailable"
      ? { value: "UNAVAILABLE", note: "ยังไม่มี API key (Phase 2) เลยอ่านเครดิตไม่ได้", tone: "muted" as const }
      : { value: `MOCK ${status}`, note: level == null ? "ค่าจำลอง ยังไม่ได้ตั้งเพดานใน DB" : `ค่าจำลอง ใช้ไป ${level}% ของเพดาน`, tone: status === "EXHAUSTED" ? ("accent" as const) : ("muted" as const) };
  return (
    <div className="border border-admin-border bg-admin-surface p-4 rounded-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-admin-muted">Cost meter</p>
        <MockPill label="ไม่ใช่เงินจริง" />
      </div>
      <MeterRow label="Claude API credit" {...claude} />
      <MeterRow label="Magnific credits" value="UNAVAILABLE" note="ยังไม่ต่อ adapter (รอเช็ก REST API)" tone="muted" />
      <MeterRow label="ค่ารันรอบนี้" value="MOCK $0.00" note="mock agent ไม่เรียก API" tone="muted" />
      <MeterRow
        label="คิวงาน AI"
        value={counts.BLOCKED_BUDGET ? `${counts.BLOCKED_BUDGET} BLOCKED_BUDGET` : `${counts.QUEUED ?? 0} QUEUED`}
        note={`DONE ${counts.DONE ?? 0} · CLAIMED ${counts.CLAIMED ?? 0}`}
        tone={counts.BLOCKED_BUDGET ? "accent" : "muted"}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <SmallButton onClick={() => runAgents()}>รันคิว (mock)</SmallButton>
        <SmallButton onClick={simulateCreditOut}>จำลอง credit หมด</SmallButton>
        <SmallButton onClick={newCreditCycle}>เริ่มรอบใหม่</SmallButton>
      </div>
      {state.lineNotices.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-admin-border pt-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-admin-muted">LINE (จำลอง ไม่ได้ส่ง)</p>
          {state.lineNotices.slice(-3).map((n) => (
            <p key={n.at + n.text} className="text-xs text-admin-fg">
              {bangkokTime(n.at)} · {n.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function SmallButton({ onClick, children, primary, disabled }: { onClick: () => void; children: React.ReactNode; primary?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-sm border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        primary ? "border-admin-fg bg-admin-fg text-admin-bg hover:opacity-90" : "border-admin-border bg-admin-bg text-admin-fg hover:bg-admin-hover",
      )}
    >
      {children}
    </button>
  );
}
