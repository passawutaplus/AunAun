import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, Check, ChevronRight, Circle, Eye, Handshake, Images, Inbox, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { MascotCharacter } from "@/components/project/TourMascot";
import StudioActionQueue, { isStaleRequest, STALE_REQUEST_DAYS } from "@/components/dashboard/StudioActionQueue";
import StudioPushNudge from "@/components/dashboard/StudioPushNudge";
import StudioNoteCard from "@/components/dashboard/StudioNoteCard";
import StudioTodoPanel from "@/components/dashboard/StudioTodoPanel";
import { EarningsHireBalanceCard } from "@/components/earnings/EarningsHireBalanceCard";
import { useProfile } from "@/hooks/useProfile";
import { useHiringRequests } from "@/hooks/useHiringRequests";
import { useReceivedCollabRequests } from "@/hooks/useCollabRequests";
import { useMyProjects } from "@/hooks/useProjects";
import { useHireWallet } from "@/hooks/useHireWallet";
import { usePortfolioOverviewSeries } from "@/hooks/usePortfolioOverviewSeries";
import { useProfilesByIds } from "@/core/profiles";
import { isContactedNewStatus, HIRE_TAB_ACCEPTED } from "@/lib/hiringStatus";
import { isCollabAcceptedStatus, isCollabContactedNewStatus } from "@/lib/collabInbox";
import { PAYOUT_MIN_SATANG } from "@/lib/payments/payoutPolicy";
import { formatMoneyLabel } from "@/lib/payments/fxDisplay";
import { satangToThb } from "@/lib/payments/fees";
import { withdrawStartPath } from "@/lib/payments/withdrawPin";
import { getProjectStatsRangeBounds } from "@/lib/projectStatsDateRange";
import { isCommerceEnabled } from "@/lib/aplus1Launch";
import { ABOUT_ME_EDIT_HREF } from "@/lib/settingsNav";
import { STUDIO_COLLAB_PATH, STUDIO_HIRE_PATH, STUDIO_INSIGHTS_PATH, STUDIO_PROJECTS_PATH } from "@/lib/studioNav";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
};

const ACTIVE_ROWS = 5;

/** My Studio home: what needs you today first, then numbers, work in progress, profile checklist, own notes. */
export default function StudioHomePanel({ userId }: Props) {
  const navigate = useNavigate();
  const { data: profile } = useProfile(userId);
  const { data: hireRequests = [], isLoading: hireLoading } = useHiringRequests(userId);
  const { data: collabRequests = [], isLoading: collabLoading } = useReceivedCollabRequests();
  const { data: projects = [], isLoading: projectsLoading } = useMyProjects(userId);
  const { view: wallet, isLoading: walletLoading, isPreview, resetPreview } = useHireWallet(userId);

  const bounds = useMemo(() => getProjectStatsRangeBounds({ preset: "7d" }), []);
  const projectIds = projects.map((p) => p.id);
  const overview = usePortfolioOverviewSeries(
    userId,
    projectIds,
    bounds?.from.toISOString(),
    bounds?.to.toISOString(),
    !projectsLoading && !!bounds,
  );

  // Matches the action queue: requests left unanswered for a month aren't "waiting today"
  const waiting =
    hireRequests.filter((r) => isContactedNewStatus(r.status) && !isStaleRequest(r.created_at)).length +
    collabRequests.filter((r) => isCollabContactedNewStatus(r.status) && !isStaleRequest(r.created_at)).length;
  const activeHire = hireRequests.filter((r) => r.status === HIRE_TAB_ACCEPTED);
  const activeCollab = collabRequests.filter((r) => isCollabAcceptedStatus(r.status));
  const { data: partners } = useProfilesByIds(activeCollab.map((r) => r.sender_id));

  const activeRows = [
    ...activeHire.map((r) => ({
      id: `h-${r.id}`,
      title: r.project_title || "งานจ้าง",
      meta: r.client_name || "",
      tag: "งานจ้าง",
      to: STUDIO_HIRE_PATH,
      at: r.updated_at,
    })),
    ...activeCollab.map((r) => {
      const p = partners?.map[r.sender_id];
      return {
        id: `c-${r.id}`,
        title: `คอลแลปกับ ${p?.display_name || (p?.username ? `@${p.username}` : "ครีเอเตอร์")}`,
        meta: (r.collab_types ?? []).slice(0, 2).join(", "),
        tag: "คอลแลป",
        to: STUDIO_COLLAB_PATH,
        at: r.updated_at,
      };
    }),
  ].sort((a, b) => b.at.localeCompare(a.at));
  // Jobs nobody has touched for a month are summarised, not listed as work in progress
  const staleActive = activeRows.filter((r) => isStaleRequest(r.at));
  const liveRows = activeRows.filter((r) => !isStaleRequest(r.at));

  const published = projects.filter((p) => p.status === "Published").length;
  const p = profile as
    | { avatar_url?: string | null; bio?: string | null; skills?: string[] | null; opportunity_status?: string | null }
    | undefined;
  const checklist = [
    { id: "avatar", label: "ใส่รูปโปรไฟล์", done: !!p?.avatar_url, to: ABOUT_ME_EDIT_HREF },
    { id: "work", label: "ลงผลงานแรก", done: published > 0, to: "/portfolio/new" },
    { id: "bio", label: "เขียนแนะนำตัว", done: !!p?.bio?.trim(), to: ABOUT_ME_EDIT_HREF },
    { id: "skills", label: "ใส่สกิล", done: (p?.skills?.length ?? 0) > 0, to: ABOUT_ME_EDIT_HREF },
    { id: "open", label: "บอกว่าเปิดรับงานแบบไหน", done: !!p?.opportunity_status, to: ABOUT_ME_EDIT_HREF },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  const canWithdraw = isPreview && wallet.availableSatang >= PAYOUT_MIN_SATANG;
  const withdrawHint = !isPreview
    ? "ระบบถอนจริงกำลังเปิด — ทดลองกดได้ในเดโม่หรือโหมดตัวอย่าง"
    : wallet.availableSatang < PAYOUT_MIN_SATANG
      ? `อีก ${formatMoneyLabel(satangToThb(Math.max(0, PAYOUT_MIN_SATANG - wallet.availableSatang)), "THB")} ถึงขั้นต่ำถอน`
      : undefined;

  const loading = hireLoading || collabLoading;
  const stats = [
    { label: "รอตอบ", value: loading ? "–" : waiting, to: STUDIO_HIRE_PATH, hot: waiting > 0, icon: Inbox },
    { label: "กำลังทำ", value: loading ? "–" : liveRows.length, to: STUDIO_HIRE_PATH, hot: false, icon: Briefcase },
    { label: "เข้าชม 7 วัน", value: overview.data?.current.views.length ?? "–", to: STUDIO_INSIGHTS_PATH, hot: false, icon: Eye },
    { label: "ผลงานที่เผยแพร่", value: projectsLoading ? "–" : published, to: STUDIO_PROJECTS_PATH, hot: false, icon: Images },
  ];

  const name = (profile?.display_name || profile?.username || "").trim();
  const today = new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" });
  const publicHref = profile?.username ? `/@${profile.username}` : `/u/${userId}`;

  // Mascot's line changes with how busy today is
  const greetingLine = loading
    ? "กำลังดูว่าวันนี้มีอะไรบ้าง…"
    : waiting > 0
      ? `มี ${waiting} เรื่องรอคุณตอบอยู่ ไปเคลียร์กันเลย`
      : liveRows.length > 0
        ? `ไม่มีอะไรค้างตอบ มีงานกำลังทำ ${liveRows.length} งาน สู้ ๆ`
        : published === 0
          ? "เริ่มจากลงผลงานแรก ให้คนเห็นฝีมือคุณกัน"
          : "วันนี้ว่าง ลองแชร์โปรไฟล์ให้คนเห็นมากขึ้นดีไหม";

  const shareProfile = async () => {
    const url = `${window.location.origin}${publicHref}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: name || "โปรไฟล์ของฉัน", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("คัดลอกลิงก์โปรไฟล์แล้ว");
    } catch {
      /* share cancelled */
    }
  };

  const checklistCard =
    doneCount < checklist.length ? (
      <section className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-foreground">ทำโปรไฟล์ให้ครบ</h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {doneCount}/{checklist.length}
          </span>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-brand" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
        </div>
        <ul className="space-y-0.5">
          {checklist.map((c) => (
            <li key={c.id}>
              {c.done ? (
                <span className="flex items-center gap-2.5 py-1.5 text-sm text-muted-foreground line-through decoration-muted-foreground/40">
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden />
                  {c.label}
                </span>
              ) : (
                <Link to={c.to} className="group flex items-center gap-2.5 py-1.5 text-sm text-foreground">
                  <Circle className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span className="flex-1 group-hover:underline">{c.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  return (
    <div className="space-y-6">
      <section className="relative flex flex-wrap items-center gap-x-5 gap-y-4 overflow-hidden rounded-3xl border border-border bg-card px-4 py-4 sm:px-6">
        <MascotCharacter className="h-24 w-28 shrink-0 sm:h-28 sm:w-32" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{today}</p>
          <h2 className="mt-0.5 truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            สวัสดี{name ? ` ${name}` : ""}
          </h2>
          <p className="mt-1 text-sm text-foreground/80">{greetingLine}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to={publicHref}>
              <Eye className="mr-1.5 h-4 w-4" />
              ดูโปรไฟล์
            </Link>
          </Button>
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => void shareProfile()}>
            <Share2 className="mr-1.5 h-4 w-4" />
            แชร์โปรไฟล์
          </Button>
        </div>
      </section>

      <div data-tour="studio-stats" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((st) => {
          const Icon = st.icon;
          return (
            <Link
              key={st.label}
              to={st.to}
              className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3.5 transition-colors hover:border-foreground/20"
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  st.hot ? "bg-foreground text-background" : "bg-secondary text-foreground",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-2xl font-semibold leading-tight tabular-nums text-foreground">{st.value}</span>
                <span className="block truncate text-xs text-muted-foreground">{st.label}</span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="space-y-6 lg:col-span-2">
          <StudioActionQueue hire={hireRequests} collab={collabRequests} loading={loading} />

          <section className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-foreground">งานที่กำลังทำ</h2>
              {liveRows.length > ACTIVE_ROWS ? (
                <Link to={STUDIO_HIRE_PATH} className="text-xs text-muted-foreground hover:text-foreground">
                  ดูทั้งหมด {liveRows.length}
                </Link>
              ) : null}
            </div>
            {liveRows.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">
                {staleActive.length > 0
                  ? "ช่วงนี้ไม่มีงานที่ขยับ"
                  : "ยังไม่มีงานที่กำลังทำ ตอบรับคำขอแล้วงานจะมาอยู่ตรงนี้"}
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {liveRows.slice(0, ACTIVE_ROWS).map((row) => (
                  <li key={row.id}>
                    <Link
                      to={row.to}
                      className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/50"
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          row.tag === "งานจ้าง"
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
                            : "bg-brand/10 text-foreground",
                        )}
                      >
                        {row.tag === "งานจ้าง" ? <Briefcase className="h-4 w-4" /> : <Handshake className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{row.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[row.meta, `อัปเดต ${updatedAgo(row.at)}`].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {staleActive.length > 0 ? (
              <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                ไม่เคลื่อนไหวเกิน {STALE_REQUEST_DAYS} วัน {staleActive.length} งาน —{" "}
                <Link
                  to={staleActive.some((r) => r.tag === "งานจ้าง") ? STUDIO_HIRE_PATH : STUDIO_COLLAB_PATH}
                  className="font-medium text-foreground hover:underline"
                >
                  ส่งงาน ปิดงาน หรือคุยต่อ
                </Link>
              </p>
            ) : null}
          </section>
        </div>

        <div className="space-y-6">
          {checklistCard}
          <StudioPushNudge />
          <StudioTodoPanel userId={userId} queue={[]} />
          <StudioNoteCard userId={userId} />
          {!isCommerceEnabled() ? null : walletLoading ? (
            <InlineLoader />
          ) : (
            <EarningsHireBalanceCard
              compact
              availableSatang={wallet.availableSatang}
              onWithdraw={() => navigate(withdrawStartPath({ preview: isPreview }))}
              canWithdraw={canWithdraw}
              withdrawHint={withdrawHint}
              isPreview={isPreview}
              bankName={wallet.bankName}
              accountLast4={wallet.accountLast4}
              onResetPreview={isPreview ? resetPreview : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function updatedAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "วันนี้";
  if (days === 1) return "เมื่อวาน";
  if (days < 30) return `${days} วันก่อน`;
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}
