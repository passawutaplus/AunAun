import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  UserPlus, FolderKanban, HandshakeIcon, HeartHandshake, Building2,
  MessageCircle, UserCheck, Gift, Flag, MessageSquareHeart, Bookmark,
  Sparkles, MessageSquare, Wallet, ShieldCheck, Shield, ScrollText, Eye,
} from "lucide-react";
import BriefcaseIcon from "@/components/icons/BriefcaseIcon";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import { PlusOneMark } from "@/components/brand/PlusOneMark";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchBar, useSearch } from "@/components/admin/SearchBar";
import AdminExportButton from "@/components/admin/AdminExportButton";
import { usePlatformActivity, type ActivityEvent, type ActivityEventType } from "@/hooks/admin/useAdminData";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

const PlusOneIcon = ({ className }: { className?: string }) => (
  <PlusOneMark className={cn("text-admin-muted text-xs", className)} />
);

const typeMeta: Record<ActivityEventType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  user: { label: "สมาชิก", icon: UserPlus },
  project: { label: "ผลงาน", icon: FolderKanban },
  job: { label: "งาน", icon: BriefcaseIcon },
  hire: { label: "จ้าง", icon: HandshakeIcon },
  collab: { label: "คอลแลป", icon: HeartHandshake },
  studio: { label: "สตูดิโอ", icon: Building2 },
  like: { label: "+1", icon: PlusOneIcon },
  comment: { label: "คอมเมนต์", icon: MessageCircle },
  follow: { label: "ติดตาม", icon: UserCheck },
  gift: { label: "ของขวัญ", icon: Gift },
  view: { label: "วิว", icon: Eye },
  report: { label: "รายงาน", icon: Flag },
  feedback: { label: "ฟีดแบ็ก", icon: MessageSquareHeart },
  collection: { label: "คอลเลกชัน", icon: Bookmark },
  inspire: { label: "Inspire", icon: Sparkles },
  message: { label: "แชต", icon: MessageSquare },
  cashout: { label: "ถอนเงิน", icon: Wallet },
  kyc: { label: "KYC", icon: ShieldCheck },
  aml: { label: "AML", icon: Shield },
  admin: { label: "แอดมิน", icon: ScrollText },
};

const FILTERS: { key: string; types: ActivityEventType[] | null }[] = [
  { key: "all", types: null },
  { key: "social", types: ["like", "comment", "follow", "gift", "view"] },
  { key: "market", types: ["hire", "collab", "job"] },
  { key: "content", types: ["project", "collection", "inspire", "comment"] },
  { key: "safety", types: ["report", "feedback", "kyc", "aml", "admin"] },
  { key: "chat", types: ["message"] },
];

export default function AdminActivityPage() {
  const { data, isLoading, dataUpdatedAt } = usePlatformActivity(120);
  const [filter, setFilter] = useState("all");
  const { q, setQ, filtered: searched } = useSearch(data, ["title", "subtitle", "type"]);

  const filtered = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter);
    if (!f?.types) return searched;
    return searched?.filter((e) => f.types!.includes(e.type));
  }, [searched, filter]);

  const cols: Column<ActivityEvent>[] = [
    {
      key: "type",
      header: "ประเภท",
      render: (r) => {
        const m = typeMeta[r.type];
        const Icon = m.icon;
        return (
          <span className="inline-flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-admin-muted" />
            <StatusPill status={m.label} tone="muted" />
          </span>
        );
      },
    },
    {
      key: "event",
      header: "เหตุการณ์",
      render: (r) => (
        <div className="min-w-0">
          <p className="font-medium text-admin-fg truncate">{r.title}</p>
          <p className="text-xs text-admin-muted truncate">{r.subtitle}</p>
        </div>
      ),
    },
    {
      key: "actor",
      header: "ผู้กระทำ",
      render: (r) =>
        r.actorId ? (
          <Link to={`/u/${r.actorId}`} className="font-mono text-xs text-admin-accent hover:underline">
            {r.actorId.slice(0, 8)}…
          </Link>
        ) : (
          <span className="text-admin-muted text-xs">—</span>
        ),
    },
    {
      key: "at",
      header: "เมื่อ",
      render: (r) => (
        <div className="text-right">
          <p className="font-mono text-xs">{r.at.slice(0, 19).replace("T", " ")}</p>
          <p className="text-[10px] text-admin-muted">
            {formatDistanceToNow(new Date(r.at), { locale: th, addSuffix: true })}
          </p>
        </div>
      ),
    },
    {
      key: "link",
      header: "",
      render: (r) =>
        r.link ? (
          <Link to={r.link} className="text-xs text-admin-accent hover:underline whitespace-nowrap">
            ดู →
          </Link>
        ) : null,
    },
  ];

  return (
    <div>
      <SectionHeader
        eyebrow="activity / monitor"
        title="มอนิเตอร์กิจกรรมทั้งเว็บ"
        description="รวมทุกการกระทำบนแพลตฟอร์ม — อัปเดตอัตโนมัติทุก 20 วินาที"
        actions={
          <div className="flex items-center gap-2">
            <AdminExportButton
              rows={(filtered ?? []) as unknown as Record<string, unknown>[]}
              filename="platform-activity.csv"
            />
            <SearchBar value={q} onChange={setQ} placeholder="ค้นหาเหตุการณ์" />
          </div>
        }
      />

      <Tabs value={filter} onValueChange={setFilter} className="mb-4">
        <TabsList className="bg-admin-surface border border-admin-border flex-wrap h-auto">
          <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
          <TabsTrigger value="social">โซเชียล</TabsTrigger>
          <TabsTrigger value="market">ตลาดงาน</TabsTrigger>
          <TabsTrigger value="content">คอนเทนต์</TabsTrigger>
          <TabsTrigger value="safety">ความปลอดภัย</TabsTrigger>
          <TabsTrigger value="chat">แชต</TabsTrigger>
        </TabsList>
      </Tabs>

      <p className="font-mono text-[10px] text-admin-muted mb-3">
        last-sync: {dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : "—"} · {filtered?.length ?? 0} events
      </p>

      <DataTable
        columns={cols}
        rows={filtered}
        loading={isLoading}
        rowKey={(r) => r.id}
        empty="ยังไม่มีกิจกรรม"
      />
    </div>
  );
}
