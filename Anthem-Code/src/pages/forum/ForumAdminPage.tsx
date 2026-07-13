import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  FileWarning,
  Flame,
  MessageSquareWarning,
  Pin,
  Settings2,
  Shield,
  Users,
} from "lucide-react";
import { ForumPageHeader } from "@/components/forum/ForumLayout";
import { ForumRankChip, ForumUserAvatar } from "@/components/forum/ForumUserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAdminSetForumRank,
  useAdminSetForumTopic,
  useForumCategories,
  useForumProfileSearch,
  useForumRanks,
} from "@/hooks/useForum";
import {
  useAdminSetForumCategory,
  useForumAdminAnalytics,
  useForumAdminAttachments,
  useForumAdminAudit,
  useForumAdminOverview,
  useForumAdminReports,
  useForumAdminTopics,
  useUpdateForumReportStatus,
  type ForumAdminTopicRow,
} from "@/hooks/useForumAdmin";
import { useAuth } from "@/hooks/useAuth";
import { forumCategoryTone } from "@/data/forumCategories";
import {
  FORUM_RANK_LABELS,
  FORUM_STATUS_LABELS,
  PRODUCT_FEEDBACK_STATUSES,
  formatRelativeTh,
  type ForumRankSlug,
  type ForumTopicStatus,
} from "@/lib/forum";
import { formatBytes } from "@/lib/forumAttachments";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "ภาพรวม", icon: Flame },
  { id: "moderation", label: "คิวดูแล", icon: MessageSquareWarning },
  { id: "topics", label: "กระทู้", icon: Pin },
  { id: "feedback", label: "Feedback", icon: AlertTriangle },
  { id: "ranks", label: "ยศ/สมาชิก", icon: Users },
  { id: "files", label: "ไฟล์", icon: FileWarning },
  { id: "analytics", label: "สถิติ", icon: BarChart3 },
  { id: "settings", label: "ตั้งค่า", icon: Settings2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "warn" | "ok";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        tone === "warn" && "border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20",
        tone === "ok" && "border-emerald-300/60 bg-emerald-50/30 dark:bg-emerald-950/20",
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function TopicActions({ topic }: { topic: ForumAdminTopicRow }) {
  const setTopic = useAdminSetForumTopic();
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <Select
        value={topic.status}
        onValueChange={(v) => setTopic.mutate({ topicId: topic.id, status: v as ForumTopicStatus })}
      >
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[...PRODUCT_FEEDBACK_STATUSES, "answered", "closed"].map((s) => (
            <SelectItem key={s} value={s}>
              {FORUM_STATUS_LABELS[s as ForumTopicStatus] ?? s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant={topic.is_pinned ? "default" : "outline"}
        className="h-8 gap-1"
        onClick={() => setTopic.mutate({ topicId: topic.id, isPinned: !topic.is_pinned })}
      >
        <Pin className="h-3.5 w-3.5" />
        {topic.is_pinned ? "ถอนหมุด" : "ปักหมุด"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8"
        onClick={() =>
          setTopic.mutate({
            topicId: topic.id,
            moderationState: topic.moderation_state === "published" ? "hidden" : "published",
          })
        }
      >
        {topic.moderation_state === "published" ? "ซ่อน" : "แสดง"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8"
        onClick={() => setTopic.mutate({ topicId: topic.id, isLocked: !topic.is_locked })}
      >
        {topic.is_locked ? "ปลดล็อก" : "ล็อก"}
      </Button>
    </div>
  );
}

function OverviewTab({ onGo }: { onGo: (tab: TabId) => void }) {
  const { data, isLoading } = useForumAdminOverview();
  const { data: topics = [] } = useForumAdminTopics(12);
  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground py-6">กำลังโหลดภาพรวม…</p>;
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="กระทู้วันนี้" value={data.topicsToday} hint={`7 วัน: ${data.topics7d}`} />
        <StatCard label="ความเห็นวันนี้" value={data.repliesToday} hint={`7 วัน: ${data.replies7d}`} />
        <StatCard
          label="ยังไม่มีคำตอบ"
          value={data.unanswered}
          tone={data.unanswered > 0 ? "warn" : "ok"}
        />
        <StatCard
          label="รายงานค้าง"
          value={data.openReports}
          tone={data.openReports > 0 ? "warn" : "ok"}
        />
        <StatCard label="กระทู้ที่ซ่อน" value={data.hiddenTopics} />
        <StatCard
          label="ไฟล์ถูกบล็อก"
          value={data.blockedAttachments}
          tone={data.blockedAttachments > 0 ? "warn" : "default"}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onGo("moderation")}>
          เปิดคิวดูแล
        </Button>
        <Button size="sm" variant="outline" onClick={() => onGo("feedback")}>
          Feedback board
        </Button>
        <Button size="sm" variant="outline" onClick={() => onGo("files")}>
          ดูไฟล์แนบ
        </Button>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">กิจกรรมล่าสุด</h3>
        <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {topics.slice(0, 8).map((t) => (
            <li key={t.id} className="px-3 py-2.5 flex flex-wrap items-center gap-2 bg-card">
              <Link to={`/forum/t/${t.id}`} className="text-sm font-medium text-primary hover:underline flex-1 min-w-0 truncate">
                {t.is_pinned ? "📌 " : ""}
                {t.title}
              </Link>
              <span className="text-[11px] text-muted-foreground">{t.reply_count} ตอบ</span>
              <span className="text-[11px] text-muted-foreground">{formatRelativeTh(t.last_activity_at)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ModerationTab() {
  const { user } = useAuth();
  const { data: reports = [], isLoading } = useForumAdminReports();
  const { data: topics = [] } = useForumAdminTopics(200);
  const updateReport = useUpdateForumReportStatus();
  const hidden = topics.filter((t) => t.moderation_state === "hidden");

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-primary" />
          รายงานกระทู้/คอมเมนต์ค้าง
        </h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">กำลังโหลด…</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border p-6 text-center">
            ไม่มีรายงานค้าง — ดีมาก
          </p>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground">
                    {r.target_type === "forum_topic" ? "กระทู้" : "คอมเมนต์"}
                  </span>
                  <span>{r.reason}</span>
                  <span>·</span>
                  <span>{formatRelativeTh(r.created_at)}</span>
                  <span>·</span>
                  <span>{r.status}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{r.details || "—"}</p>
                <div className="flex flex-wrap gap-2">
                  {r.target_type === "forum_topic" ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/forum/t/${r.target_id}`} target="_blank">
                        เปิดกระทู้
                      </Link>
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updateReport.isPending}
                    onClick={() =>
                      updateReport.mutate({ id: r.id, status: "reviewing", resolvedBy: user?.id })
                    }
                  >
                    กำลังตรวจ
                  </Button>
                  <Button
                    size="sm"
                    disabled={updateReport.isPending}
                    onClick={() =>
                      updateReport.mutate({ id: r.id, status: "resolved", resolvedBy: user?.id })
                    }
                  >
                    แก้แล้ว
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={updateReport.isPending}
                    onClick={() =>
                      updateReport.mutate({ id: r.id, status: "dismissed", resolvedBy: user?.id })
                    }
                  >
                    ยกเลิก
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">กระทู้ที่ซ่อนอยู่</h3>
        {hidden.length === 0 ? (
          <p className="text-sm text-muted-foreground">ไม่มีกระทู้ที่ซ่อน</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {hidden.map((t) => (
              <li key={t.id} className="px-3 py-3 space-y-2 bg-card">
                <Link to={`/forum/t/${t.id}`} className="text-sm font-medium text-primary hover:underline">
                  {t.title}
                </Link>
                <TopicActions topic={t} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TopicsTab({ feedbackOnly = false }: { feedbackOnly?: boolean }) {
  const { data: topics = [], isLoading } = useForumAdminTopics(200);
  const [q, setQ] = useState("");
  const [modFilter, setModFilter] = useState<"all" | "published" | "hidden">("all");
  const [catFilter, setCatFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return topics.filter((t) => {
      if (feedbackOnly) {
        const slug = t.category?.slug;
        if (slug !== "bug" && slug !== "idea" && slug !== "feedback") return false;
      }
      if (modFilter !== "all" && t.moderation_state !== modFilter) return false;
      if (catFilter !== "all" && t.category?.slug !== catFilter) return false;
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        const hay = `${t.title} ${t.author_name ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [topics, feedbackOnly, modFilter, catFilter, q]);

  const byStatus = useMemo(() => {
    if (!feedbackOnly) return null;
    const groups: Record<string, ForumAdminTopicRow[]> = {};
    for (const s of PRODUCT_FEEDBACK_STATUSES) groups[s] = [];
    for (const t of filtered) {
      const key = PRODUCT_FEEDBACK_STATUSES.includes(t.status as ForumTopicStatus)
        ? t.status
        : "open";
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    return groups;
  }, [filtered, feedbackOnly]);

  if (isLoading) return <p className="text-sm text-muted-foreground py-6">กำลังโหลด…</p>;

  return (
    <div className="space-y-4">
      {!feedbackOnly ? (
        <div className="flex flex-wrap gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาหัวข้อ / ผู้โพสต์…"
            className="max-w-xs"
          />
          <Select value={modFilter} onValueChange={(v) => setModFilter(v as typeof modFilter)}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะเผยแพร่</SelectItem>
              <SelectItem value="published">เผยแพร่</SelectItem>
              <SelectItem value="hidden">ซ่อน</SelectItem>
            </SelectContent>
          </Select>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="หมวด" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกหมวด</SelectItem>
              <SelectItem value="help">ช่วยเหลือ</SelectItem>
              <SelectItem value="bug">แจ้งเหตุ</SelectItem>
              <SelectItem value="idea">เสนอไอเดีย</SelectItem>
              <SelectItem value="feedback">ฟีดแบ็ก</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          บอร์ดสถานะสำหรับแจ้งเหตุ / ไอเดีย / ฟีดแบ็ก — เปลี่ยนสถานะเพื่อติดตามงาน product
        </p>
      )}

      {feedbackOnly && byStatus ? (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {PRODUCT_FEEDBACK_STATUSES.map((status) => (
            <div key={status} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <span className="text-xs font-semibold">
                  {FORUM_STATUS_LABELS[status]}
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {(byStatus[status] ?? []).length}
                </span>
              </div>
              <ul className="max-h-72 overflow-y-auto divide-y divide-border">
                {(byStatus[status] ?? []).length === 0 ? (
                  <li className="px-3 py-4 text-xs text-muted-foreground">ว่าง</li>
                ) : (
                  (byStatus[status] ?? []).map((t) => (
                    <li key={t.id} className="px-3 py-2.5 space-y-2">
                      <Link
                        to={`/forum/t/${t.id}`}
                        className="text-sm font-medium text-primary hover:underline line-clamp-2"
                      >
                        {t.title}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">
                        {t.category?.name_th} · {t.author_name}
                      </p>
                      <TopicActions topic={t} />
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {filtered.map((t) => {
            const tone = forumCategoryTone(t.category?.slug);
            return (
              <li key={t.id} className="px-3 py-3 space-y-2 bg-card">
                <div className="flex flex-wrap items-start gap-2">
                  <Link
                    to={`/forum/t/${t.id}`}
                    className="text-sm font-medium text-primary hover:underline flex-1 min-w-0"
                  >
                    {t.is_pinned ? <Pin className="inline h-3.5 w-3.5 mr-1" /> : null}
                    {t.title}
                  </Link>
                  {t.category ? (
                    <span className={cn("text-[11px] font-medium", tone.text)}>
                      {t.category.name_th}
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t.author_name} · {t.reply_count} ตอบ · {t.like_count} ถูกใจ · {t.view_count} ดู ·{" "}
                  {t.moderation_state}
                </p>
                <TopicActions topic={t} />
              </li>
            );
          })}
          {filtered.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">ไม่พบกระทู้</li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

function RanksTab() {
  const setRank = useAdminSetForumRank();
  const { data: ranks = [], isLoading: ranksLoading } = useForumRanks();
  const { data: analytics } = useForumAdminAnalytics(30);
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const { data: searchHits = [] } = useForumProfileSearch(search);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">มอบยศผู้ช่วยชุมชน</h3>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา username หรือชื่อ…"
          />
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="หมายเหตุ (ไม่บังคับ)" />
          {search.trim().length >= 2 ? (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {searchHits.length === 0 ? (
                <li className="px-3 py-2 text-xs text-muted-foreground">ไม่พบสมาชิก</li>
              ) : (
                searchHits.map((p) => (
                  <li key={p.user_id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <ForumUserAvatar src={p.avatar_url} name={p.display_name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.display_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.username ? `@${p.username}` : p.user_id.slice(0, 8)}
                      </p>
                    </div>
                    <Select
                      onValueChange={(v) => {
                        setRank.mutate({
                          userId: p.user_id,
                          rank: v as ForumRankSlug | "none",
                          note,
                        });
                        setSearch("");
                      }}
                    >
                      <SelectTrigger className="h-8 w-40 text-xs">
                        <SelectValue placeholder="ตั้งยศ" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(FORUM_RANK_LABELS) as ForumRankSlug[]).map((r) => (
                          <SelectItem key={r} value={r}>
                            {FORUM_RANK_LABELS[r]}
                          </SelectItem>
                        ))}
                        <SelectItem value="none">ถอนยศ</SelectItem>
                      </SelectContent>
                    </Select>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">แนะนำจากสถิติตอบ (30 วัน)</h3>
        <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {(analytics?.topHelpers ?? []).map((h) => (
            <li key={h.userId} className="flex flex-wrap items-center gap-3 px-3 py-2.5 bg-card">
              <ForumUserAvatar
                src={null}
                name={h.profile?.display_name}
                size="md"
                rank={h.hasRank ? "helper" : null}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{h.profile?.display_name || "สมาชิก"}</p>
                <p className="text-[11px] text-muted-foreground">{h.count} คำตอบ · 30 วัน</p>
              </div>
              {h.hasRank ? (
                <span className="text-[11px] text-muted-foreground">มียศแล้ว</span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setRank.mutate({
                      userId: h.userId,
                      rank: "helper",
                      note: "แนะนำจากสถิติตอบ",
                    })
                  }
                >
                  มอบผู้ช่วยชุมชน
                </Button>
              )}
            </li>
          ))}
          {!analytics?.topHelpers?.length ? (
            <li className="px-3 py-6 text-sm text-muted-foreground text-center">ยังไม่มีข้อมูล</li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">รายชื่อมียศ</h3>
        <div className="rounded-xl border border-border overflow-hidden">
          {ranksLoading ? (
            <p className="p-4 text-sm text-muted-foreground">กำลังโหลดยศ…</p>
          ) : ranks.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">ยังไม่มีใครมียศ</p>
          ) : (
            <ul className="divide-y divide-border">
              {ranks.map((r) => (
                <li key={r.user_id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <ForumUserAvatar
                    src={r.profile?.avatar_url}
                    name={r.profile?.display_name}
                    rank={r.rank}
                    rankTitle={r.title_th}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {r.profile?.display_name || "สมาชิก"}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <ForumRankChip rank={r.rank} title={r.title_th} />
                      {r.note ? (
                        <span className="text-[11px] text-muted-foreground">{r.note}</span>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRank.mutate({ userId: r.user_id, rank: "none" })}
                  >
                    ถอนยศ
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function FilesTab() {
  const [status, setStatus] = useState<"all" | "blocked" | "pending" | "clean">("blocked");
  const { data = [], isLoading } = useForumAdminAttachments(status);

  return (
    <div className="space-y-4">
      <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
        <SelectTrigger className="w-44 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="blocked">ถูกบล็อก</SelectItem>
          <SelectItem value="pending">รอสแกน</SelectItem>
          <SelectItem value="clean">ผ่านแล้ว</SelectItem>
          <SelectItem value="all">ทั้งหมด</SelectItem>
        </SelectContent>
      </Select>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">กำลังโหลด…</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {data.map((a) => (
            <li key={a.id} className="px-3 py-3 space-y-1 bg-card">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium truncate">{a.file_name}</span>
                <span
                  className={cn(
                    "text-[11px] rounded-md px-1.5 py-0.5",
                    a.scan_status === "blocked" && "bg-rose-100 text-rose-800",
                    a.scan_status === "pending" && "bg-amber-100 text-amber-800",
                    a.scan_status === "clean" && "bg-emerald-100 text-emerald-800",
                  )}
                >
                  {a.scan_status}
                </span>
                <span className="text-[11px] text-muted-foreground">{a.kind}</span>
                <span className="text-[11px] text-muted-foreground">{formatBytes(a.size_bytes)}</span>
              </div>
              {a.scan_reason ? (
                <p className="text-xs text-rose-700 dark:text-rose-300">{a.scan_reason}</p>
              ) : null}
              <div className="flex flex-wrap gap-2 text-xs">
                {a.topic_id ? (
                  <Link to={`/forum/t/${a.topic_id}`} className="text-primary hover:underline">
                    เปิดกระทู้
                  </Link>
                ) : null}
                {a.public_url && a.scan_status === "clean" ? (
                  <a href={a.public_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    เปิดไฟล์
                  </a>
                ) : null}
              </div>
            </li>
          ))}
          {data.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">ไม่มีรายการ</li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

function AnalyticsTab() {
  const { data, isLoading } = useForumAdminAnalytics(14);
  const { data: audit = [] } = useForumAdminAudit(30);

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground py-6">กำลังโหลดสถิติ…</p>;
  }

  const max = Math.max(1, ...data.series.map((d) => d.topics + d.replies));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <StatCard label="กระทู้ 14 วัน" value={data.topicCount} />
        <StatCard label="ความเห็น 14 วัน" value={data.replyCount} />
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">กิจกรรมรายวัน</h3>
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          {data.series.map((d) => (
            <div key={d.date} className="flex items-center gap-3 text-xs">
              <span className="w-24 text-muted-foreground tabular-nums shrink-0">
                {d.date.slice(5)}
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden flex">
                <div
                  className="h-full bg-sky-500/80"
                  style={{ width: `${(d.topics / max) * 100}%` }}
                  title={`กระทู้ ${d.topics}`}
                />
                <div
                  className="h-full bg-violet-500/80"
                  style={{ width: `${(d.replies / max) * 100}%` }}
                  title={`ตอบ ${d.replies}`}
                />
              </div>
              <span className="w-16 text-right tabular-nums text-muted-foreground shrink-0">
                {d.topics}/{d.replies}
              </span>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground pt-1">ฟ้า = กระทู้ · ม่วง = ความเห็น</p>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">บันทึกแอดมิน (forum)</h3>
        <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden max-h-80 overflow-y-auto">
          {audit.map((a) => (
            <li key={a.id} className="px-3 py-2 text-xs bg-card">
              <p className="font-medium">{a.action}</p>
              <p className="text-muted-foreground">
                {a.target_type} · {a.target_id.slice(0, 8)}… · {formatRelativeTh(a.created_at)}
              </p>
            </li>
          ))}
          {audit.length === 0 ? (
            <li className="px-3 py-6 text-center text-muted-foreground">ยังไม่มีบันทึก</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

function SettingsTab() {
  const { data: categories = [] } = useForumCategories({ includeInactive: true });
  const setCat = useAdminSetForumCategory();
  const [drafts, setDrafts] = useState<
    Record<string, { name_th: string; description: string; sort_order: number; is_active: boolean }>
  >({});

  const getDraft = (c: { id: string; name_th: string; description: string; sort_order: number; is_active: boolean }) =>
    drafts[c.id] ?? {
      name_th: c.name_th,
      description: c.description,
      sort_order: c.sort_order,
      is_active: c.is_active,
    };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        แก้ชื่อ/คำอธิบายหมวด และเปิด-ปิดหมวด — แพทเทิร์นเขียนกระทู้แก้ที่โค้ด `forumCategories.ts`
      </p>
      <ul className="space-y-4">
        {categories.map((c) => {
          const d = getDraft(c);
          const tone = forumCategoryTone(c.slug);
          return (
            <li key={c.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-sm", tone.swatch)} />
                <span className="text-xs text-muted-foreground font-mono">{c.slug}</span>
              </div>
              <Input
                value={d.name_th}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [c.id]: { ...d, name_th: e.target.value } }))
                }
              />
              <Textarea
                value={d.description}
                rows={2}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [c.id]: { ...d, description: e.target.value } }))
                }
              />
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  type="number"
                  className="w-24"
                  value={d.sort_order}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [c.id]: { ...d, sort_order: Number(e.target.value) || 0 },
                    }))
                  }
                />
                <Button
                  size="sm"
                  variant={d.is_active ? "default" : "outline"}
                  onClick={() =>
                    setDrafts((prev) => ({ ...prev, [c.id]: { ...d, is_active: !d.is_active } }))
                  }
                >
                  {d.is_active ? "เปิดใช้" : "ปิดอยู่"}
                </Button>
                <Button
                  size="sm"
                  disabled={setCat.isPending}
                  onClick={() =>
                    setCat.mutate({
                      categoryId: c.id,
                      nameTh: d.name_th,
                      description: d.description,
                      sortOrder: d.sort_order,
                      isActive: d.is_active,
                    })
                  }
                >
                  บันทึก
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function ForumAdminPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") as TabId | null;
  const tab: TabId = TABS.some((t) => t.id === raw) ? (raw as TabId) : "overview";

  const setTab = (next: TabId) => {
    setParams(next === "overview" ? {} : { tab: next }, { replace: true });
  };

  return (
    <>
      <ForumPageHeader
        title="แอดมินฟอรัม"
        subtitle="มอนิเตอร์ชุมชน · ดูแลรายงาน · Feedback · ยศ · ไฟล์ · สถิติ"
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="space-y-5">
        <TabsList className="h-auto flex flex-wrap gap-1 bg-muted/60 p-1 w-full justify-start">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.id} value={t.id} className="gap-1.5 text-xs sm:text-sm">
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab onGo={setTab} />
        </TabsContent>
        <TabsContent value="moderation">
          <ModerationTab />
        </TabsContent>
        <TabsContent value="topics">
          <TopicsTab />
        </TabsContent>
        <TabsContent value="feedback">
          <TopicsTab feedbackOnly />
        </TabsContent>
        <TabsContent value="ranks">
          <RanksTab />
        </TabsContent>
        <TabsContent value="files">
          <FilesTab />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
