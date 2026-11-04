import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Mail, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { type Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAdminInviteAction, useAdminInvites, type AdminInviteRow } from "@/hooks/useCreatorInvites";
import { INVITE_STATUS_LABEL, INVITE_TABS, inviteStatusTone, type InviteTab } from "@/lib/creatorInviteAdmin";
import { cn } from "@/lib/utils";

const SKIP_REASON: Record<string, string> = {
  no_email: "ไม่มีอีเมล (ส่งทาง DM)",
  unsubscribed: "หยุดรับอีเมลแล้ว",
  inactive: "หมดอายุ/ยกเลิก/ปิดแล้ว",
  not_waiting: "ตอบรับแล้ว ไม่ต้องเตือน",
  already_queued: "อยู่ในคิวแล้ว",
  not_found: "ไม่พบ",
};

export default function AdminCreatorInvitationsPage() {
  const navigate = useNavigate();
  const { data = [], isLoading } = useAdminInvites();
  const action = useAdminInviteAction();
  const [tab, setTab] = useState<InviteTab>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const counts = useMemo(() => {
    const m = new Map<InviteTab, number>();
    for (const t of INVITE_TABS) m.set(t.id, t.statuses ? data.filter((r) => t.statuses!.includes(r.status)).length : data.length);
    return m;
  }, [data]);
  const rows = useMemo(() => {
    const def = INVITE_TABS.find((t) => t.id === tab);
    return def?.statuses ? data.filter((r) => def.statuses!.includes(r.status)) : data;
  }, [data, tab]);

  const toggle = (id: string, on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  const allOn = rows.length > 0 && rows.every((r) => selected.has(r.id));

  async function bulk(kind: "send" | "remind") {
    const ids = [...selected];
    if (!ids.length) return;
    const res = (await action.mutateAsync({ action: kind, ids })) as { queued: number; skipped: { id: string; reason: string }[]; mail?: { sent: number; deferred: number } | null };
    const names = new Map(data.map((r) => [r.id, r.display_name]));
    const skipped = res.skipped.map((s) => `${names.get(s.id) ?? s.id}: ${SKIP_REASON[s.reason] ?? s.reason}`);
    toast.success(
      `${kind === "send" ? "ส่งคำเชิญ" : "ส่งเตือน"} ${res.queued} ฉบับ${res.mail?.deferred ? ` · ${res.mail.deferred} ฉบับรอรอบถัดไป (จำกัด 50/ชม.)` : ""}`,
      skipped.length ? { description: `ข้าม: ${skipped.join(" · ")}` } : undefined,
    );
    setSelected(new Set());
  }

  const stat = (label: string, n: number) => (
    <div className="rounded-sm border border-admin-border bg-admin-surface px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-admin-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-admin-fg">{n}</p>
    </div>
  );

  const columns: Column<AdminInviteRow>[] = [
    {
      key: "sel",
      header: "",
      className: "w-10",
      render: (r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected.has(r.id)} onCheckedChange={(v) => toggle(r.id, v === true)} aria-label={`เลือก ${r.display_name}`} />
        </span>
      ),
    },
    {
      key: "creator",
      header: "Creator",
      render: (r) => (
        <div className="min-w-0">
          <p className="font-medium text-admin-fg">{r.display_name}</p>
          <p className="text-[11px] text-admin-muted">
            {[r.country, r.language.toUpperCase(), r.send_mode === "manual_dm" ? "DM" : null].filter(Boolean).join(" · ")}
          </p>
        </div>
      ),
    },
    { key: "disc", header: "สาขา", render: (r) => <span className="text-xs">{r.discipline ?? "—"}</span> },
    {
      key: "contact",
      header: "Email / handle",
      render: (r) => (
        <span className="break-all text-xs text-admin-muted">
          {r.contact_email ?? r.social_handle}
          {r.unsubscribed ? " · หยุดรับอีเมล" : ""}
        </span>
      ),
    },
    {
      key: "status",
      header: "สถานะ",
      render: (r) => (
        <span className="flex flex-wrap items-center gap-1">
          <StatusPill status={INVITE_STATUS_LABEL[r.status]} tone={inviteStatusTone(r.status)} />
          {r.status === "preparing" && r.review_sent_at ? <StatusPill status="Review sent" tone="muted" /> : null}
        </span>
      ),
    },
    {
      key: "updated",
      header: "อัปเดต",
      render: (r) => <span className="text-xs text-admin-muted">{format(new Date(r.updated_at), "d MMM HH:mm", { locale: th })}</span>,
    },
  ];

  const waiting = data.filter((r) => r.status === "submitted").length;
  const changes = data.filter((r) => r.status === "needs_changes").length;

  return (
    <div>
      <SectionHeader
        eyebrow="growth"
        title="Creator invitations"
        description={`${data.length} คำเชิญ · ${waiting} รอทีมทำ Draft · ${changes} รอแก้`}
        actions={
          <Button asChild size="sm">
            <Link to="/admin/creator-invitations/new">
              <Plus className="mr-1.5 h-4 w-4" aria-hidden /> สร้างคำเชิญ
            </Link>
          </Button>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stat("ส่งแล้ว", data.filter((r) => r.sent_at).length)}
        {stat("กำลังกรอก / ส่งแล้ว", data.filter((r) => ["started", "submitted"].includes(r.status)).length)}
        {stat("รอทีม", data.filter((r) => ["submitted", "preparing", "needs_changes", "approved"].includes(r.status)).length)}
        {stat("เผยแพร่แล้ว", data.filter((r) => r.status === "published").length)}
      </div>
      <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="สถานะ">
        {INVITE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-sm border px-3 py-1.5 text-xs font-medium",
              tab === t.id ? "border-admin-fg bg-admin-fg text-admin-bg" : "border-admin-border text-admin-fg hover:bg-admin-hover",
            )}
          >
            {t.label} <span className="opacity-70">{counts.get(t.id) ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-sm border border-admin-border bg-admin-surface px-3 py-2 text-xs">
        <label className="flex items-center gap-2">
          <Checkbox
            checked={allOn}
            onCheckedChange={(v) => setSelected(v === true ? new Set(rows.map((r) => r.id)) : new Set())}
            aria-label="เลือกทั้งหมดในแท็บนี้"
          />
          {selected.size ? `เลือก ${selected.size} คน` : "เลือกหลายคนเพื่อส่งพร้อมกัน"}
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!selected.size || action.isPending} onClick={() => void bulk("send")}>
            <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden /> ส่งอีเมลคำเชิญ
          </Button>
          <Button size="sm" variant="outline" disabled={!selected.size || action.isPending} onClick={() => void bulk("remind")}>
            <Mail className="mr-1.5 h-3.5 w-3.5" aria-hidden /> ส่งเตือน
          </Button>
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={isLoading}
        empty={data.length ? "ไม่มีคำเชิญในแท็บนี้" : "ยังไม่มีคำเชิญ — กด “สร้างคำเชิญ”"}
        onRowClick={(r) => navigate(`/admin/creator-invitations/${r.id}`)}
      />
      <p className="mt-3 text-[11px] text-admin-muted">
        อีเมลคำเชิญ/เตือนส่งไม่เกิน 50 ฉบับต่อชั่วโมง ที่เหลือส่งรอบถัดไปอัตโนมัติ · คนที่มีแค่ handle จะถูกข้าม (ส่งเองทาง DM จากหน้ารายละเอียด)
      </p>
    </div>
  );
}
