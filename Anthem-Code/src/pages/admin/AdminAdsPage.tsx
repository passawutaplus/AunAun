import { useMemo, useState } from "react";
import AdStatsPanel from "@/components/admin/AdStatsPanel";
import { Link } from "react-router-dom";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { Column } from "@/components/admin/DataTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAllAdApplications,
  useAllAdCampaigns,
  useApproveAdApplication,
  useDeleteAdCampaign,
  useRejectAdApplication,
  useUpdateAdCampaign,
  type AdApplication,
  type AdCampaign,
} from "@/hooks/useAds";
import { formatThaiDate } from "@/lib/format";
import { Megaphone, Eye, MousePointerClick, CheckCircle2, XCircle, Pause, Play, Trash2, ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";

const KpiCard = ({ label, value, icon: Icon, accent }: {
  label: string; value: string | number;
  icon: React.ComponentType<{ className?: string }>; accent?: boolean;
}) => (
  <div className={`border rounded-sm p-4 ${accent ? "border-admin-accent/40 bg-admin-accent/5" : "border-admin-border bg-admin-surface"}`}>
    <div className="flex items-center justify-between">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-admin-muted">{label}</p>
      <Icon className={`w-4 h-4 ${accent ? "text-admin-accent" : "text-admin-muted"}`} />
    </div>
    <p className="mt-2 text-2xl font-semibold text-admin-fg tabular-nums">{value}</p>
  </div>
);

const statusColor: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  paused: "bg-zinc-500/15 text-zinc-600 border-zinc-500/30",
  rejected: "bg-red-500/15 text-red-600 border-red-500/30",
  expired: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30",
  approved: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  draft: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30",
};

const StatusPill = ({ s }: { s: string }) => (
  <span className={`inline-flex px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border ${statusColor[s] ?? "bg-muted text-muted-foreground border-border"}`}>{s}</span>
);

export default function AdminAdsPage() {
  const { data: campaigns = [], isLoading: cLoad } = useAllAdCampaigns();
  const { data: applications = [], isLoading: aLoad } = useAllAdApplications();
  const updateCampaign = useUpdateAdCampaign();
  const deleteCampaign = useDeleteAdCampaign();
  const approve = useApproveAdApplication();
  const reject = useRejectAdApplication();

  const [searchC, setSearchC] = useState("");
  const [statusC, setStatusC] = useState<string>("all");
  const [searchA, setSearchA] = useState("");
  const [statusA, setStatusA] = useState<string>("all");

  const stats = useMemo(() => {
    const active = campaigns.filter((c) => c.status === "active").length;
    const impressions = campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0);
    const clicks = campaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) + "%" : "0%";
    const pending = applications.filter((a) => a.status === "paid").length;
    return { active, impressions, clicks, ctr, pending };
  }, [campaigns, applications]);

  const filteredCampaigns = useMemo(() => {
    const q = searchC.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (statusC !== "all" && c.status !== statusC) return false;
      if (!q) return true;
      return c.title.toLowerCase().includes(q) || c.target_url.toLowerCase().includes(q);
    });
  }, [campaigns, searchC, statusC]);

  const filteredApps = useMemo(() => {
    const q = searchA.trim().toLowerCase();
    return applications.filter((a) => {
      if (statusA !== "all" && a.status !== statusA) return false;
      if (!q) return true;
      return (
        a.ad_title.toLowerCase().includes(q) ||
        a.contact_name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.company.toLowerCase().includes(q)
      );
    });
  }, [applications, searchA, statusA]);

  const handleToggleStatus = (c: AdCampaign) => {
    const next = c.status === "active" ? "paused" : "active";
    updateCampaign.mutate(
      { id: c.id, patch: { status: next } },
      {
        onSuccess: () => toast.success(next === "active" ? "เปิดใช้งานโฆษณาแล้ว" : "หยุดโฆษณาชั่วคราว"),
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

  const handleDelete = (c: AdCampaign) => {
    if (!confirm(`ลบแคมเปญ "${c.title}"?`)) return;
    deleteCampaign.mutate(c.id, {
      onSuccess: () => toast.success("ลบแล้ว"),
      onError: (e: Error) => toast.error(e.message),
    });
  };

  const handleApprove = (a: AdApplication) => {
    if (!confirm(`อนุมัติคำขอจาก ${a.contact_name}? โฆษณาจะแสดงทันที ${a.duration_days} วัน`)) return;
    approve.mutate(
      { id: a.id, durationDays: a.duration_days },
      {
        onSuccess: () => toast.success("อนุมัติและสร้างแคมเปญแล้ว"),
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

  const handleReject = (a: AdApplication) => {
    const note = prompt("เหตุผลที่ปฏิเสธ (จะส่งให้ผู้ขอ):", "");
    if (note === null) return;
    reject.mutate(
      { id: a.id, note },
      {
        onSuccess: () => toast.success("ปฏิเสธคำขอแล้ว"),
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

  const campaignCols: Column<AdCampaign>[] = [
    {
      key: "ad",
      header: "โฆษณา",
      render: (c) => (
        <div className="flex items-center gap-3 min-w-0">
          <img src={c.image_url} alt="" className="w-12 h-12 rounded object-cover shrink-0 border border-admin-border" />
          <div className="min-w-0">
            <p className="text-admin-fg font-medium truncate">{c.title}</p>
            <a href={c.target_url} target="_blank" rel="noreferrer" className="text-xs text-admin-muted hover:text-admin-accent inline-flex items-center gap-1 truncate max-w-[260px]">
              {c.target_url} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      ),
    },
    { key: "pkg", header: "แพ็กเกจ", render: (c) => <Badge variant="secondary" className="uppercase text-[10px]">{c.package}</Badge> },
    { key: "status", header: "สถานะ", render: (c) => <StatusPill s={c.status} /> },
    { key: "imp", header: "Impressions", render: (c) => <span className="tabular-nums">{c.impressions.toLocaleString()}</span> },
    { key: "clk", header: "Clicks", render: (c) => <span className="tabular-nums">{c.clicks.toLocaleString()}</span> },
    {
      key: "ctr",
      header: "CTR",
      render: (c) => (
        <span className="tabular-nums text-admin-muted">
          {c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) + "%" : "—"}
        </span>
      ),
    },
    {
      key: "end",
      header: "สิ้นสุด",
      render: (c) => <span className="text-xs text-admin-muted">{c.end_at ? formatThaiDate(c.end_at) : "—"}</span>,
    },
    {
      key: "act",
      header: "",
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(c)} title={c.status === "active" ? "หยุดชั่วคราว" : "เปิดใช้งาน"}>
            {c.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDelete(c)} className="text-red-600 hover:text-red-700" title="ลบ">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const appCols: Column<AdApplication>[] = [
    {
      key: "ad",
      header: "คำขอ",
      render: (a) => (
        <div className="flex items-center gap-3 min-w-0">
          <img src={a.image_url} alt="" className="w-12 h-12 rounded object-cover shrink-0 border border-admin-border" />
          <div className="min-w-0">
            <p className="text-admin-fg font-medium truncate">{a.ad_title}</p>
            <p className="text-xs text-admin-muted truncate">{a.contact_name} · {a.company || a.email}</p>
          </div>
        </div>
      ),
    },
    { key: "pkg", header: "แพ็กเกจ", render: (a) => <Badge variant="secondary" className="uppercase text-[10px]">{a.package}</Badge> },
    { key: "dur", header: "ระยะเวลา", render: (a) => <span>{a.duration_days} วัน</span> },
    { key: "budget", header: "งบ (Px)", render: (a) => <span className="tabular-nums">{a.budget_px.toLocaleString()}</span> },
    { key: "status", header: "สถานะ", render: (a) => <StatusPill s={a.status} /> },
    { key: "date", header: "ส่งเมื่อ", render: (a) => <span className="text-xs text-admin-muted">{formatThaiDate(a.created_at)}</span> },
    {
      key: "act",
      header: "",
      render: (a) => {
        if (a.status === "paid") {
          return (
            <div className="flex items-center justify-end gap-1">
              <Button size="sm" variant="default" onClick={() => handleApprove(a)} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="w-4 h-4 mr-1" /> อนุมัติ
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleReject(a)} className="text-red-600 hover:text-red-700">
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          );
        }
        if (a.status === "pending" || a.status === "pending_payment") {
          return <span className="text-xs text-admin-muted">รอลูกค้าชำระเงินก่อน</span>;
        }
        return <span className="text-xs text-admin-muted">{a.admin_note || "—"}</span>;
      },
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <SectionHeader
        eyebrow="Ads"
        title="จัดการโฆษณา"
        description="ดูแลแคมเปญที่กำลังแสดงและคำขอลงโฆษณาจากผู้ใช้"
        actions={
          <Button asChild variant="outline">
            <Link to="/advertise"><Megaphone className="w-4 h-4 mr-1" /> หน้าลงโฆษณา</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="แคมเปญ Active" value={stats.active} icon={Megaphone} accent />
        <KpiCard label="Impressions" value={stats.impressions.toLocaleString()} icon={Eye} />
        <KpiCard label="Clicks" value={stats.clicks.toLocaleString()} icon={MousePointerClick} />
        <KpiCard label="CTR" value={stats.ctr} icon={MousePointerClick} />
        <KpiCard label="ชำระแล้ว รออนุมัติ" value={stats.pending} icon={CheckCircle2} accent />
      </div>

      <AdStatsPanel campaigns={campaigns} />



      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">แคมเปญ ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="applications">คำขอลงโฆษณา ({applications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted" />
              <Input value={searchC} onChange={(e) => setSearchC(e.target.value)} placeholder="ค้นหาชื่อแคมเปญ / URL" className="pl-9" />
            </div>
            {["all", "active", "pending", "paused", "rejected", "expired"].map((s) => (
              <Button key={s} variant={statusC === s ? "default" : "outline"} size="sm" onClick={() => setStatusC(s)}>
                {s === "all" ? "ทั้งหมด" : s}
              </Button>
            ))}
          </div>
          <DataTable columns={campaignCols} rows={filteredCampaigns} rowKey={(c) => c.id} loading={cLoad} empty="ยังไม่มีแคมเปญ" />
        </TabsContent>

        <TabsContent value="applications" className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted" />
              <Input value={searchA} onChange={(e) => setSearchA(e.target.value)} placeholder="ค้นหาชื่อ / บริษัท / อีเมล" className="pl-9" />
            </div>
            {["all", "pending_payment", "paid", "approved", "rejected"].map((s) => (
              <Button key={s} variant={statusA === s ? "default" : "outline"} size="sm" onClick={() => setStatusA(s)}>
                {s === "all" ? "ทั้งหมด" : s}
              </Button>
            ))}
          </div>
          <DataTable columns={appCols} rows={filteredApps} rowKey={(a) => a.id} loading={aLoad} empty="ยังไม่มีคำขอ" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
