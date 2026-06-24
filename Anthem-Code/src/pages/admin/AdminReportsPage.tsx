import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { Download, Bot } from "lucide-react";
import { toCsv, downloadCsv } from "@/lib/csv";
import { getLicenseMeta } from "@/lib/licenses";
import { useAdminApplyModeration } from "@/hooks/useModeration";
import { enrichReportRow, ReportAiSummaryCard } from "@/components/admin/ReportAiSummary";

type EvidenceFile = { url: string; type: string; name: string; size: number };
type ReportRow = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  target_owner_id: string | null;
  reason: string;
  details: string;
  evidence_urls: string[];
  evidence_files: EvidenceFile[];
  status: "open" | "reviewing" | "resolved" | "dismissed";
  admin_note: string;
  created_at: string;
  ai_priority?: number | null;
  ai_summary?: string | null;
  ai_recommendation?: string | null;
};

const STATUSES = ["open", "reviewing", "resolved", "dismissed"] as const;

const targetLink = (r: ReportRow) => {
  switch (r.target_type) {
    case "project":
      return `/project/${r.target_id}`;
    case "user":
      return `/u/${r.target_id}`;
    case "job":
      return `/jobs/${r.target_id}`;
    case "studio":
      return `/admin/studios`;
    case "comment":
      return `/admin/comments`;
    case "message":
      return `/admin/chats`;
    default:
      return "#";
  }
};

export default function AdminReportsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof STATUSES)[number]>("open");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const applyMod = useAdminApplyModeration();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "reports", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_reports" as never)
        .select("*")
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const reports = (data ?? []) as unknown as ReportRow[];
      const projectIds = [...new Set(
        reports.filter((r) => r.target_type === "project" && r.reason === "copyright").map((r) => r.target_id),
      )];
      if (!projectIds.length) return reports;
      const { data: projects } = await supabase
        .from("projects")
        .select("id, license_type, license_note, rights_attested_at")
        .in("id", projectIds);
      const licenseMap = new Map((projects ?? []).map((p) => [p.id, p]));
      const enriched = reports.map((r) => {
        let row = enrichReportRow(r);
        if (row.target_type === "project" && row.reason === "copyright") {
          const lic = licenseMap.get(row.target_id);
          if (lic) {
            const meta = getLicenseMeta(lic.license_type);
            const suffix = ` [ลิขสิทธิ์: ${meta.shortLabel}${lic.rights_attested_at ? "" : ", ไม่ยืนยันสิทธิ์"}]`;
            row = { ...row, details: (row.details || "") + suffix };
          }
        }
        return row;
      });
      enriched.sort((a, b) => (b.ai_priority ?? 0) - (a.ai_priority ?? 0));
      return enriched;
    },
  });

  const displayRows = useMemo(() => {
    if (!urgentOnly) return rows;
    return rows.filter(
      (r) => (r.ai_priority ?? 0) >= 70 || r.ai_recommendation === "urgent",
    );
  }, [rows, urgentOnly]);

  const update = useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: string; status: ReportRow["status"]; adminNote?: string }) => {
      const patch: Record<string, unknown> = { status };
      if (adminNote !== undefined) patch.admin_note = adminNote;
      if (status === "resolved" || status === "dismissed") {
        patch.resolved_by = user?.id ?? null;
        patch.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase.from("user_reports" as never).update(patch as never).eq("id", id);
      if (error) throw error;
      if (user?.id) {
        await supabase.from("admin_audit_log").insert({
          actor_id: user.id,
          action: `report.${status}`,
          target_type: "user_report",
          target_id: id,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
      toast.success("อัปเดตสถานะแล้ว");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "อัปเดตไม่สำเร็จ"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_reports" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
      toast.success("ลบรายงานแล้ว");
    },
  });

  const cols = useMemo<Column<ReportRow>[]>(
    () => [
      {
        key: "at",
        header: "เวลา",
        render: (r) => <span className="font-mono text-xs">{r.created_at.slice(0, 16).replace("T", " ")}</span>,
      },
      {
        key: "target",
        header: "เป้าหมาย",
        render: (r) => (
          <a href={targetLink(r)} target="_blank" rel="noreferrer" className="underline font-mono text-xs">
            {r.target_type}/{r.target_id.slice(0, 8)}…
          </a>
        ),
      },
      {
        key: "reason",
        header: "เหตุผล",
        render: (r) => <StatusPill status={r.reason} tone="accent" />,
      },
      {
        key: "ai",
        header: "AI สรุป",
        render: (r) => (
          <ReportAiSummaryCard
            priority={r.ai_priority}
            summary={r.ai_summary}
            recommendation={r.ai_recommendation}
            compact
          />
        ),
      },
      {
        key: "details",
        header: "รายละเอียด",
        render: (r) => (
          <div className="space-y-1 max-w-md">
            <span className="text-xs line-clamp-2">{r.details || "—"}</span>
            {r.evidence_files?.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {r.evidence_files.map((f, i) => (
                  <a key={i} href={f.url} target="_blank" rel="noreferrer" className="block">
                    {f.type.startsWith("image/") ? (
                      <img src={f.url} alt="" className="w-10 h-10 object-cover rounded border border-border" />
                    ) : (
                      <span className="text-[10px] underline">{f.name}</span>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "reporter",
        header: "ผู้รายงาน",
        render: (r) => <span className="font-mono text-xs">{r.reporter_id.slice(0, 8)}…</span>,
      },
      {
        key: "actions",
        header: "จัดการ",
        render: (r) => (
          <div className="flex flex-col gap-2 max-w-xs">
            <Textarea
              placeholder="บันทึกแอดมิน (แสดงให้ผู้รายงานเห็น)"
              value={notes[r.id] ?? r.admin_note ?? ""}
              onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
              rows={2}
              className="text-xs"
            />
            <div className="flex gap-1 flex-wrap">
            {r.status !== "reviewing" && (
              <Button size="sm" variant="outline" onClick={() => update.mutate({ id: r.id, status: "reviewing", adminNote: notes[r.id] })}>
                ตรวจสอบ
              </Button>
            )}
            {r.status !== "resolved" && (
              <Button size="sm" variant="default" onClick={() => update.mutate({ id: r.id, status: "resolved", adminNote: notes[r.id] })}>
                ดำเนินการแล้ว
              </Button>
            )}
            {r.status !== "dismissed" && (
              <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: r.id, status: "dismissed", adminNote: notes[r.id] })}>
                ปัด
              </Button>
            )}
            {r.target_owner_id && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await applyMod.mutateAsync({ userId: r.target_owner_id!, action: "strike", note: `report:${r.id}` });
                      toast.success("เพิ่ม strike แล้ว");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "ล้มเหลว");
                    }
                  }}
                >
                  +Strike
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await applyMod.mutateAsync({ userId: r.target_owner_id!, action: "ban", days: 3, note: `report:${r.id}` });
                      toast.success("แบน 3 วัน");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "ล้มเหลว");
                    }
                  }}
                >
                  แบน 3d
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove.mutate(r.id)}>
              ลบ
            </Button>
            </div>
          </div>
        ),
      },
    ],
    [update, remove, notes, applyMod]
  );

  return (
    <div>
      <SectionHeader
        eyebrow="moderation"
        title="รายงานเนื้อหา"
        description="AI สรุปและจัดลำดับความสำคัญให้แล้ว — แอดมินกด ตรวจสอบ/ดำเนินการ/ปัด/strike เอง (ไม่ auto-resolve)"
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
        <TabsList>
          {STATUSES.map((s) => (
            <TabsTrigger key={s} value={s}>{s}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {(tab === "open" || tab === "reviewing") && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={urgentOnly ? "default" : "outline"}
            onClick={() => setUrgentOnly((v) => !v)}
            className="gap-1.5"
          >
            <Bot className="w-3.5 h-3.5" />
            {urgentOnly ? "แสดงด่วนเท่านั้น" : "กรองเฉพาะด่วน (AI)"}
          </Button>
          <span className="text-xs text-admin-muted">
            เรียงตาม ai_priority · โทษคำหยาบ = ระบบลง strike อัตโนมัติแยกต่างหาก
          </span>
        </div>
      )}
      <div className="flex justify-end mb-2">
        <Button size="sm" variant="outline" onClick={() => {
          const csv = toCsv(displayRows.map((r) => ({
            created_at: r.created_at, status: r.status, target_type: r.target_type,
            target_id: r.target_id, reason: r.reason, details: r.details,
            ai_priority: r.ai_priority, ai_summary: r.ai_summary, ai_recommendation: r.ai_recommendation,
            reporter_id: r.reporter_id, admin_note: r.admin_note,
            evidence: (r.evidence_files ?? []).map((f) => f.url).join(" | "),
          })));
          downloadCsv(`reports-${tab}-${new Date().toISOString().slice(0,10)}.csv`, csv);
        }}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
        </Button>
      </div>
      <DataTable
        columns={cols}
        rows={displayRows}
        loading={isLoading}
        rowKey={(r) => r.id}
        empty={`ยังไม่มีรายงานสถานะ "${tab}"${urgentOnly ? " ที่ AI จัดเป็นด่วน" : ""}`}
      />
    </div>
  );
}
