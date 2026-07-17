import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CompactLoader } from "@/components/ui/BanterLoader";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { Column } from "@/components/admin/DataTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatThaiDate } from "@/lib/format";
import { Gift, Wallet, ArrowUpRight, Users, Sparkles, Coins, ExternalLink, Search, Settings2 } from "lucide-react";
import { toast } from "sonner";
import AdminRowActions from "@/components/admin/AdminRowActions";
import { useAdminRejectCashout, useAdminUpdateGift, useAdminUpdateGiftLimits } from "@/hooks/admin/useAdminMutations";
import { notifyAnthem } from "@/lib/notifyAnthem";
import { Label } from "@/components/ui/label";

const isCashoutPaid = (s: string) => s === "mock_paid" || s === "paid";
const isCashoutPending = (s: string) => s === "pending";
const isCashoutProcessing = (s: string) => s === "processing";

interface Overview {
  gift_count: number;
  gift_volume_px: number;
  unique_senders: number;
  unique_recipients: number;
  projects_supported: number;
  topup_total_px: number;
  topup_count: number;
  cashout_pending: number;
  cashout_paid: number;
  cashout_net_total_px: number;
  gift_count_7d: number;
  gift_volume_7d_px: number;
}

const KpiCard = ({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<{ className?: string }>; accent?: boolean;
}) => (
  <div className={`border rounded-sm p-4 ${accent ? "border-admin-accent/40 bg-admin-accent/5" : "border-admin-border bg-admin-surface"}`}>
    <div className="flex items-center justify-between">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-admin-muted">{label}</p>
      <Icon className={`w-4 h-4 ${accent ? "text-admin-accent" : "text-admin-muted"}`} />
    </div>
    <p className="mt-2 text-2xl font-semibold text-admin-fg tabular-nums">{value}</p>
    {sub && <p className="mt-0.5 text-xs text-admin-muted">{sub}</p>}
  </div>
);

const Avatar = ({ url, name }: { url?: string | null; name?: string | null }) => (
  url ? <img src={url} alt="" className="w-7 h-7 rounded-full object-cover" />
      : <div className="w-7 h-7 rounded-full bg-admin-hover text-admin-muted flex items-center justify-center text-xs font-medium">{(name ?? "?")[0]}</div>
);

export default function AdminGiftsPage() {
  const qc = useQueryClient();

  const overview = useQuery({
    queryKey: ["admin-gift-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_gift_overview");
      if (error) throw error;
      return data as unknown as Overview;
    },
  });

  const recent = useQuery({
    queryKey: ["admin-recent-gifts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_recent_gifts", { _limit: 200, _days: 90 });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; created_at: string; price_px: number; message: string;
        sender_id: string; sender_name: string | null; sender_avatar: string | null;
        recipient_id: string; recipient_name: string | null; recipient_avatar: string | null;
        gift_name: string | null; gift_icon: string | null;
        project_id: string | null; project_title: string | null;
      }>;
    },
  });

  const topRecipients = useQuery({
    queryKey: ["admin-top-recipients"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_top_gift_recipients", { _limit: 20 });
      if (error) throw error;
      return (data ?? []) as Array<{ user_id: string; display_name: string; username: string; avatar_url: string | null; total_px: number; gift_count: number; }>;
    },
  });

  const topSenders = useQuery({
    queryKey: ["admin-top-senders"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_top_gift_senders", { _limit: 20 });
      if (error) throw error;
      return (data ?? []) as Array<{ user_id: string; display_name: string; username: string; avatar_url: string | null; total_px: number; gift_count: number; }>;
    },
  });

  const topProjects = useQuery({
    queryKey: ["admin-top-projects"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_top_gift_projects", { _limit: 20 });
      if (error) throw error;
      return (data ?? []) as Array<{ project_id: string; title: string; cover_url: string | null; owner_id: string; owner_name: string | null; total_px: number; gift_count: number; }>;
    },
  });

  const cashouts = useQuery({
    queryKey: ["admin-cashouts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_cashouts", { _limit: 100 });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; created_at: string; processed_at: string | null; status: string; gross_px: number; fee_px: number; net_px: number; bank_info: Record<string, unknown>; user_id: string; user_name: string | null; user_avatar: string | null; }>;
    },
  });

  const topups = useQuery({
    queryKey: ["admin-topups"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_topups", { _limit: 100 });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; created_at: string; amount_px: number; method: string; status: string; user_id: string; user_name: string | null; user_avatar: string | null; }>;
    },
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_mark_cashout_paid", { _id: id });
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      notifyAnthem({ event: "cashout", request_id: id, status: "paid" });
      toast.success("ทำเครื่องหมายว่าจ่ายแล้ว (manual)");
      qc.invalidateQueries({ queryKey: ["admin-cashouts"] });
      qc.invalidateQueries({ queryKey: ["admin-gift-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectCashout = useAdminRejectCashout();
  const updateGift = useAdminUpdateGift();

  const catalog = useQuery({
    queryKey: ["admin-gifts-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gifts")
        .select("id,code,name_th,name_en,icon,price_px,active,display_order")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  type LimitsRow = {
    daily_limit_unverified: number;
    daily_limit_verified: number;
    velocity_per_hour: number;
    hold_hours: number;
    max_topup_per_tx: number;
  };

  const limits = useQuery({
    queryKey: ["admin-gift-limits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gift_limits_config").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data as LimitsRow | null;
    },
  });

  const saveLimits = useAdminUpdateGiftLimits();
  const [limitForm, setLimitForm] = useState<LimitsRow | null>(null);
  const limitsReady = limitForm ?? limits.data;

  const o = overview.data;
  const [tab, setTab] = useState("transactions");

  // Filters per tab
  const [txQuery, setTxQuery] = useState("");
  const [txProject, setTxProject] = useState<"all" | "with" | "without">("all");
  const [projectsQuery, setProjectsQuery] = useState("");
  const [recipientsQuery, setRecipientsQuery] = useState("");
  const [sendersQuery, setSendersQuery] = useState("");
  const [cashoutQuery, setCashoutQuery] = useState("");
  const [cashoutStatus, setCashoutStatus] = useState<"all" | "pending" | "paid" | "rejected">("all");
  const [topupQuery, setTopupQuery] = useState("");

  const norm = (s: string) => s.toLowerCase().trim();

  const filteredRecent = useMemo(() => {
    const rows = recent.data ?? [];
    const q = norm(txQuery);
    return rows.filter((r) => {
      if (txProject === "with" && !r.project_id) return false;
      if (txProject === "without" && r.project_id) return false;
      if (!q) return true;
      const hay = [
        r.project_title, r.sender_name, r.recipient_name,
        r.gift_name, r.message,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [recent.data, txQuery, txProject]);

  const filteredProjects = useMemo(() => {
    const rows = topProjects.data ?? [];
    const q = norm(projectsQuery);
    if (!q) return rows;
    return rows.filter((r) => [r.title, r.owner_name].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [topProjects.data, projectsQuery]);

  const filteredRecipients = useMemo(() => {
    const rows = topRecipients.data ?? [];
    const q = norm(recipientsQuery);
    if (!q) return rows;
    return rows.filter((r) => [r.display_name, r.username].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [topRecipients.data, recipientsQuery]);

  const filteredSenders = useMemo(() => {
    const rows = topSenders.data ?? [];
    const q = norm(sendersQuery);
    if (!q) return rows;
    return rows.filter((r) => [r.display_name, r.username].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [topSenders.data, sendersQuery]);

  const filteredCashouts = useMemo(() => {
    const rows = cashouts.data ?? [];
    const q = norm(cashoutQuery);
    return rows.filter((r) => {
      if (cashoutStatus === "pending" && !isCashoutPending(r.status)) return false;
      if (cashoutStatus === "paid" && !isCashoutPaid(r.status)) return false;
      if (cashoutStatus === "rejected" && r.status !== "rejected") return false;
      if (!q) return true;
      const b = r.bank_info as { account_number?: string; account_name?: string; bank?: string } | null;
      const hay = [r.user_name, b?.account_number, b?.account_name, b?.bank].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [cashouts.data, cashoutQuery, cashoutStatus]);

  const filteredTopups = useMemo(() => {
    const rows = topups.data ?? [];
    const q = norm(topupQuery);
    if (!q) return rows;
    return rows.filter((r) => [r.user_name, r.method].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [topups.data, topupQuery]);


  const txCols: Column<NonNullable<typeof recent.data>[number]>[] = [
    { key: "at", header: "เมื่อ", render: (r) => <span className="font-mono text-xs">{formatThaiDate(r.created_at)}</span> },
    {
      key: "sender", header: "ผู้ส่ง",
      render: (r) => (
        <div className="flex items-center gap-2">
          <Avatar url={r.sender_avatar} name={r.sender_name} />
          <span className="truncate max-w-[140px]">{r.sender_name ?? r.sender_id.slice(0, 8)}</span>
        </div>
      ),
    },
    {
      key: "recipient", header: "ผู้รับ",
      render: (r) => (
        <div className="flex items-center gap-2">
          <Avatar url={r.recipient_avatar} name={r.recipient_name} />
          <span className="truncate max-w-[140px]">{r.recipient_name ?? r.recipient_id.slice(0, 8)}</span>
        </div>
      ),
    },
    { key: "gift", header: "ของขวัญ", render: (r) => <span className="text-sm">{r.gift_name ?? "—"}</span> },
    { key: "px", header: "ราคา", render: (r) => <span className="font-mono text-primary tabular-nums">{r.price_px} px</span> },
    { key: "msg", header: "ข้อความ", render: (r) => <span className="block max-w-xs truncate text-admin-muted">{r.message || "—"}</span> },
    {
      key: "project", header: "ผลงาน",
      render: (r) => r.project_id ? (
        <Link to={`/project/${r.project_id}`} target="_blank" className="inline-flex items-center gap-1 text-admin-accent hover:underline truncate max-w-[160px]">
          <span className="truncate">{r.project_title ?? r.project_id.slice(0, 8)}</span>
          <ExternalLink className="w-3 h-3 shrink-0" />
        </Link>
      ) : <span className="text-admin-muted text-xs">—</span>,
    },
  ];

  const userRowCols = (kind: "recipient" | "sender"): Column<NonNullable<typeof topRecipients.data>[number]>[] => [
    { key: "rank", header: "#", render: (_r, ) => null, className: "w-10" },
    {
      key: "user", header: kind === "recipient" ? "ผู้รับ" : "ผู้ส่ง",
      render: (r) => (
        <Link to={`/profile/${r.username ?? r.user_id}`} target="_blank" className="flex items-center gap-2 hover:text-admin-accent">
          <Avatar url={r.avatar_url} name={r.display_name} />
          <div>
            <p className="text-sm">{r.display_name}</p>
            <p className="text-[11px] text-admin-muted font-mono">@{r.username ?? r.user_id.slice(0, 8)}</p>
          </div>
        </Link>
      ),
    },
    { key: "total", header: "รวม px", render: (r) => <span className="font-mono text-primary tabular-nums">{Number(r.total_px).toLocaleString()} px</span> },
    { key: "count", header: "จำนวน", render: (r) => <span className="font-mono tabular-nums">{r.gift_count}</span> },
  ];

  // strip the unused rank render helper above by injecting rank via wrapper
  const withRank = <T,>(rows: T[]): (T & { __rank: number })[] => rows.map((r, i) => ({ ...r, __rank: i + 1 }));

  const projectCols: Column<NonNullable<typeof topProjects.data>[number] & { __rank: number }>[] = [
    { key: "rank", header: "#", render: (r) => <span className="font-mono text-admin-muted">{r.__rank}</span>, className: "w-10" },
    {
      key: "project", header: "ผลงาน",
      render: (r) => (
        <Link to={`/project/${r.project_id}`} target="_blank" className="flex items-center gap-2 hover:text-admin-accent">
          {r.cover_url
            ? <img src={r.cover_url} alt="" className="w-10 h-10 rounded-sm object-cover" />
            : <div className="w-10 h-10 rounded-sm bg-admin-hover" />}
          <div>
            <p className="text-sm truncate max-w-[260px]">{r.title}</p>
            <p className="text-[11px] text-admin-muted">โดย {r.owner_name ?? "—"}</p>
          </div>
        </Link>
      ),
    },
    { key: "total", header: "รวม px", render: (r) => <span className="font-mono text-primary tabular-nums">{Number(r.total_px).toLocaleString()} px</span> },
    { key: "count", header: "จำนวน", render: (r) => <span className="font-mono tabular-nums">{r.gift_count}</span> },
  ];

  const userColsWithRank = (kind: "recipient" | "sender"): Column<NonNullable<typeof topRecipients.data>[number] & { __rank: number }>[] => [
    { key: "rank", header: "#", render: (r) => <span className="font-mono text-admin-muted">{r.__rank}</span>, className: "w-10" },
    ...userRowCols(kind).slice(1),
  ];

  const cashoutCols: Column<NonNullable<typeof cashouts.data>[number]>[] = [
    { key: "at", header: "ขอเมื่อ", render: (r) => <span className="font-mono text-xs">{formatThaiDate(r.created_at)}</span> },
    {
      key: "user", header: "ผู้ขอ",
      render: (r) => (
        <div className="flex items-center gap-2">
          <Avatar url={r.user_avatar} name={r.user_name} />
          <span>{r.user_name ?? r.user_id.slice(0, 8)}</span>
        </div>
      ),
    },
    { key: "gross", header: "Gross", render: (r) => <span className="font-mono tabular-nums">{r.gross_px.toLocaleString()} px</span> },
    { key: "fee", header: "ค่าธรรมเนียม", render: (r) => <span className="font-mono text-admin-muted tabular-nums">{r.fee_px.toLocaleString()} px</span> },
    { key: "net", header: "Net (THB)", render: (r) => <span className="font-mono text-primary tabular-nums">{r.net_px.toLocaleString()} ฿</span> },
    {
      key: "bank", header: "ปลายทาง",
      render: (r) => {
        const b = r.bank_info as { bank?: string; account_number?: string; account_name?: string } | null;
        if (!b || Object.keys(b).length === 0) return <span className="text-admin-muted text-xs">—</span>;
        return (
          <div className="text-xs">
            <p>{b.bank ?? "?"} · <span className="font-mono">{b.account_number ?? "—"}</span></p>
            <p className="text-admin-muted">{b.account_name ?? ""}</p>
          </div>
        );
      },
    },
    {
      key: "status", header: "สถานะ",
      render: (r) => {
        if (isCashoutPaid(r.status)) return <Badge className="bg-emerald-600 hover:bg-emerald-600">จ่ายแล้ว</Badge>;
        if (r.status === "rejected") return <Badge variant="destructive">ปฏิเสธ</Badge>;
        if (r.status === "failed") return <Badge variant="destructive">โอนล้มเหลว</Badge>;
        if (isCashoutProcessing(r.status)) return <Badge className="bg-amber-600 hover:bg-amber-600">กำลังโอน</Badge>;
        if (isCashoutPending(r.status)) return <Badge variant="secondary">รอจ่าย</Badge>;
        return <Badge variant="outline">{r.status}</Badge>;
      },
    },
    {
      key: "action", header: "",
      render: (r) =>
        isCashoutPending(r.status) ? (
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="secondary"
              disabled
              title="ตัดเส้น Solo Stripe แล้ว — ใช้ Omise payout หรือ manual"
            >
              Solo โอน (ปิด)
            </Button>
            <Button size="sm" variant="outline" disabled={markPaid.isPending} onClick={() => markPaid.mutate(r.id)}>
              manual
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              disabled={rejectCashout.isPending}
              onClick={() => {
                const note = window.prompt("เหตุผลปฏิเสธ (ถ้ามี):") ?? "";
                rejectCashout.mutate(
                  { id: r.id, note },
                  {
                    onSuccess: () => toast.success("ปฏิเสธคำขอแล้ว — คืน earned_px"),
                    onError: (e: Error) => toast.error(e.message),
                  },
                );
              }}
            >
              ปฏิเสธ
            </Button>
          </div>
        ) : (
          <span className="text-[11px] text-admin-muted font-mono">{r.processed_at ? formatThaiDate(r.processed_at) : ""}</span>
        ),
    },
  ];

  type GiftRow = NonNullable<typeof catalog.data>[number];
  const catalogCols: Column<GiftRow>[] = [
    { key: "icon", header: "", render: (r) => <span className="text-lg">{r.icon}</span>, className: "w-10" },
    { key: "name", header: "ชื่อ", render: (r) => <span className="font-medium">{r.name_th}</span> },
    { key: "code", header: "Code", render: (r) => <span className="font-mono text-xs">{r.code}</span> },
    { key: "px", header: "ราคา px", render: (r) => <span className="font-mono tabular-nums">{r.price_px}</span> },
    {
      key: "active",
      header: "เปิดใช้",
      render: (r) => (r.active ? <Badge>active</Badge> : <Badge variant="secondary">off</Badge>),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (r) => (
        <AdminRowActions
          actions={[
            {
              label: r.active ? "ปิดการขาย" : "เปิดการขาย",
              onClick: () =>
                updateGift.mutate(
                  { id: r.id, active: !r.active },
                  {
                    onSuccess: () => toast.success("อัปเดตของขวัญแล้ว"),
                    onError: (e: Error) => toast.error(e.message),
                  },
                ),
            },
            {
              label: "แก้ราคา px",
              onClick: () => {
                const v = window.prompt("ราคา px ใหม่:", String(r.price_px));
                if (v == null || v.trim() === "") return;
                const n = parseInt(v, 10);
                if (!Number.isFinite(n) || n < 0) {
                  toast.error("ราคาไม่ถูกต้อง");
                  return;
                }
                updateGift.mutate(
                  { id: r.id, active: r.active, price_px: n },
                  {
                    onSuccess: () => toast.success("อัปเดตราคาแล้ว"),
                    onError: (e: Error) => toast.error(e.message),
                  },
                );
              },
            },
          ]}
        />
      ),
    },
  ];

  const topupCols: Column<NonNullable<typeof topups.data>[number]>[] = [
    { key: "at", header: "เมื่อ", render: (r) => <span className="font-mono text-xs">{formatThaiDate(r.created_at)}</span> },
    {
      key: "user", header: "ผู้ใช้",
      render: (r) => (
        <div className="flex items-center gap-2">
          <Avatar url={r.user_avatar} name={r.user_name} />
          <span>{r.user_name ?? r.user_id.slice(0, 8)}</span>
        </div>
      ),
    },
    { key: "amount", header: "จำนวน", render: (r) => <span className="font-mono text-primary tabular-nums">+{r.amount_px.toLocaleString()} px</span> },
    { key: "method", header: "ช่องทาง", render: (r) => <Badge variant="outline" className="font-mono text-[10px]">{r.method}</Badge> },
    { key: "status", header: "สถานะ", render: (r) => <span className="text-xs text-admin-muted">{r.status}</span> },
  ];

  return (
    <div>
      <SectionHeader
        eyebrow="gifts & wallet"
        title="ของขวัญ & กระเป๋า Pixel"
        description="มอนิเตอร์การให้ของขวัญ การเติม Pixel และคำขอถอนเงินของระบบ"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="ของขวัญทั้งหมด" value={o?.gift_count?.toLocaleString() ?? "—"} sub={`${o?.gift_count_7d?.toLocaleString() ?? 0} ใน 7 วัน`} icon={Gift} />
        <KpiCard label="ปริมาณ px" value={o?.gift_volume_px?.toLocaleString() ?? "—"} sub={`+${(o?.gift_volume_7d_px ?? 0).toLocaleString()} ใน 7 วัน`} icon={Coins} accent />
        <KpiCard label="ผู้ส่ง / ผู้รับ" value={`${o?.unique_senders ?? 0} / ${o?.unique_recipients ?? 0}`} sub={`${o?.projects_supported ?? 0} ผลงานที่ได้รับ`} icon={Users} />
        <KpiCard label="เติม Pixel รวม" value={o?.topup_total_px?.toLocaleString() ?? "—"} sub={`${o?.topup_count ?? 0} ครั้ง`} icon={Sparkles} />
        <KpiCard label="Cashout รอจ่าย" value={o?.cashout_pending ?? "—"} icon={Wallet} accent={!!o && o.cashout_pending > 0} />
        <KpiCard label="Cashout จ่ายแล้ว" value={o?.cashout_paid ?? "—"} icon={ArrowUpRight} />
        <KpiCard label="Net cashout รวม" value={`${o?.cashout_net_total_px?.toLocaleString() ?? "—"} ฿`} icon={Wallet} />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="bg-admin-surface border border-admin-border rounded-sm h-auto p-0.5 flex-wrap">
          <TabsTrigger value="transactions">ธุรกรรม</TabsTrigger>
          <TabsTrigger value="projects">ผลงานยอดนิยม</TabsTrigger>
          <TabsTrigger value="recipients">ผู้รับสูงสุด</TabsTrigger>
          <TabsTrigger value="senders">ผู้ให้สูงสุด</TabsTrigger>
          <TabsTrigger value="cashouts">Cashout</TabsTrigger>
          <TabsTrigger value="topups">เติม Pixel</TabsTrigger>
          <TabsTrigger value="catalog">แคตตาล็อก</TabsTrigger>
          <TabsTrigger value="limits">ขีดจำกัด</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-3">
          <FilterBar>
            <SearchInput value={txQuery} onChange={setTxQuery} placeholder="ค้นจากผลงาน / ผู้ส่ง / ผู้รับ / ของขวัญ / ข้อความ" />
            <ChipGroup
              value={txProject}
              onChange={(v) => setTxProject(v as typeof txProject)}
              options={[
                { value: "all", label: "ทั้งหมด" },
                { value: "with", label: "มีผลงานผูก" },
                { value: "without", label: "ไม่มีผลงาน" },
              ]}
            />
            <ResultCount shown={filteredRecent.length} total={(recent.data ?? []).length} />
          </FilterBar>
          <DataTable columns={txCols} rows={filteredRecent} loading={recent.isLoading} rowKey={(r) => r.id} empty="ไม่พบรายการตามเงื่อนไข" />
        </TabsContent>
        <TabsContent value="projects" className="space-y-3">
          <FilterBar>
            <SearchInput value={projectsQuery} onChange={setProjectsQuery} placeholder="ค้นชื่อผลงาน หรือชื่อเจ้าของ" />
            <ResultCount shown={filteredProjects.length} total={(topProjects.data ?? []).length} />
          </FilterBar>
          <DataTable columns={projectCols} rows={withRank(filteredProjects)} loading={topProjects.isLoading} rowKey={(r) => r.project_id} empty="ไม่พบผลงานตามเงื่อนไข" />
        </TabsContent>
        <TabsContent value="recipients" className="space-y-3">
          <FilterBar>
            <SearchInput value={recipientsQuery} onChange={setRecipientsQuery} placeholder="ค้นชื่อหรือ @username" />
            <ResultCount shown={filteredRecipients.length} total={(topRecipients.data ?? []).length} />
          </FilterBar>
          <DataTable columns={userColsWithRank("recipient")} rows={withRank(filteredRecipients)} loading={topRecipients.isLoading} rowKey={(r) => r.user_id} empty="ไม่พบผู้รับตามเงื่อนไข" />
        </TabsContent>
        <TabsContent value="senders" className="space-y-3">
          <FilterBar>
            <SearchInput value={sendersQuery} onChange={setSendersQuery} placeholder="ค้นชื่อหรือ @username" />
            <ResultCount shown={filteredSenders.length} total={(topSenders.data ?? []).length} />
          </FilterBar>
          <DataTable columns={userColsWithRank("sender")} rows={withRank(filteredSenders)} loading={topSenders.isLoading} rowKey={(r) => r.user_id} empty="ไม่พบผู้ส่งตามเงื่อนไข" />
        </TabsContent>
        <TabsContent value="cashouts" className="space-y-3">
          <FilterBar>
            <SearchInput value={cashoutQuery} onChange={setCashoutQuery} placeholder="ค้นชื่อผู้ขอ หรือเลขบัญชี" />
            <ChipGroup
              value={cashoutStatus}
              onChange={(v) => setCashoutStatus(v as typeof cashoutStatus)}
              options={[
                { value: "all", label: "ทั้งหมด" },
                { value: "pending", label: "รอจ่าย" },
                { value: "paid", label: "จ่ายแล้ว" },
                { value: "rejected", label: "ปฏิเสธ" },
              ]}
            />
            <ResultCount shown={filteredCashouts.length} total={(cashouts.data ?? []).length} />
          </FilterBar>
          <DataTable columns={cashoutCols} rows={filteredCashouts} loading={cashouts.isLoading} rowKey={(r) => r.id} empty="ไม่พบคำขอตามเงื่อนไข" />
        </TabsContent>
        <TabsContent value="topups" className="space-y-3">
          <FilterBar>
            <SearchInput value={topupQuery} onChange={setTopupQuery} placeholder="ค้นชื่อผู้ใช้ หรือช่องทาง" />
            <ResultCount shown={filteredTopups.length} total={(topups.data ?? []).length} />
          </FilterBar>
          <DataTable columns={topupCols} rows={filteredTopups} loading={topups.isLoading} rowKey={(r) => r.id} empty="ไม่พบรายการตามเงื่อนไข" />
        </TabsContent>
        <TabsContent value="catalog" className="space-y-3">
          <p className="text-xs text-admin-muted">เปิด/ปิดและแก้ราคาของขวัญในระบบ (ไม่สร้างรายการใหม่จาก admin)</p>
          <DataTable columns={catalogCols} rows={catalog.data ?? []} loading={catalog.isLoading} rowKey={(r) => r.id} />
        </TabsContent>
        <TabsContent value="limits" className="space-y-4">
          <div className="border border-admin-border rounded-sm p-4 bg-admin-surface max-w-lg space-y-4">
            <div className="flex items-center gap-2 text-admin-muted">
              <Settings2 className="w-4 h-4" />
              <p className="font-mono text-[10px] uppercase tracking-wider">gift_limits_config</p>
            </div>
            {limits.isLoading && <CompactLoader labelClassName="text-admin-muted" className="py-2 justify-start" />}
            {limitsReady && (
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["daily_limit_unverified", "เพดานรายวัน (ยังไม่ยืนยัน)"],
                    ["daily_limit_verified", "เพดานรายวัน (ยืนยันแล้ว)"],
                    ["velocity_per_hour", "ความถี่ต่อชั่วโมง"],
                    ["hold_hours", "Hold (ชม.)"],
                    ["max_topup_per_tx", "เติมสูงสุดต่อครั้ง"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs text-admin-muted">{label}</Label>
                    <Input
                      type="number"
                      className="h-8 text-sm border-admin-border"
                      value={String((limitForm ?? limits.data)![key])}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        const base = limitForm ?? limits.data!;
                        setLimitForm({ ...base, [key]: Number.isFinite(n) ? n : 0 });
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            <Button
              size="sm"
              disabled={!limitsReady || saveLimits.isPending}
              onClick={() => {
                const f = limitForm ?? limits.data;
                if (!f) return;
                saveLimits.mutate(
                  {
                    daily_unverified: f.daily_limit_unverified,
                    daily_verified: f.daily_limit_verified,
                    velocity: f.velocity_per_hour,
                    hold_hours: f.hold_hours,
                    max_topup: f.max_topup_per_tx,
                  },
                  {
                    onSuccess: () => {
                      toast.success("บันทึกขีดจำกัดแล้ว");
                      setLimitForm(null);
                      qc.invalidateQueries({ queryKey: ["admin-gift-limits"] });
                    },
                    onError: (e: Error) => toast.error(e.message),
                  },
                );
              }}
            >
              บันทึกขีดจำกัด
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const FilterBar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center gap-2 p-2 rounded-sm border border-admin-border bg-admin-surface">
    {children}
  </div>
);

const SearchInput = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div className="relative flex-1 min-w-[200px]">
    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-admin-muted" />
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-8 pl-8 text-xs rounded-sm bg-transparent border-admin-border focus-visible:ring-1 focus-visible:ring-admin-accent"
    />
  </div>
);

const ChipGroup = ({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) => (
  <div className="flex items-center gap-1">
    {options.map((opt) => {
      const active = opt.value === value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 rounded-sm text-xs border transition ${
            active
              ? "border-admin-accent bg-admin-accent/10 text-admin-accent"
              : "border-admin-border text-admin-muted hover:text-admin-fg"
          }`}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

const ResultCount = ({ shown, total }: { shown: number; total: number }) => (
  <span className="text-[11px] text-admin-muted font-mono ml-auto whitespace-nowrap">
    พบ {shown.toLocaleString()} จาก {total.toLocaleString()} รายการ
  </span>
);

