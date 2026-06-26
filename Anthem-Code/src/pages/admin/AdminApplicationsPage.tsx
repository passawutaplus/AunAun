import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import { SearchBar, useSearch } from "@/components/admin/SearchBar";
import AdminExportButton from "@/components/admin/AdminExportButton";
import { supabase } from "@/integrations/supabase/client";
import { formatThaiDate } from "@/lib/format";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { applicationStatusLabel } from "@/components/jobs/jobCardUtils";
import type { ApplicationStatus } from "@/hooks/useJobs";

interface Row {
  id: string;
  job_id: string;
  job_title: string;
  applicant_id: string;
  applicant_name: string | null;
  status: string;
  cover_letter: string | null;
  created_at: string;
}

const STATUS_OPTIONS: ApplicationStatus[] = ["pending", "shortlisted", "contacted", "hired", "rejected"];

export default function AdminApplicationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_applications", { _limit: 300 });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const updateStatus = async (id: string, status: ApplicationStatus) => {
    const { error } = await supabase.from("job_applications").update({ status } as never).eq("id", id);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["admin-applications"] });
  };

  const { q, setQ, filtered } = useSearch(data, ["job_title", "applicant_name", "status", "cover_letter"]);
  const pending = (data ?? []).filter((r) => r.status === "pending").length;

  const cols: Column<Row>[] = [
    {
      key: "job",
      header: "งาน",
      render: (r) => (
        <Link to={`/jobs/${r.job_id}`} className="font-medium hover:text-admin-accent">
          {r.job_title}
        </Link>
      ),
    },
    {
      key: "applicant",
      header: "ผู้สมัคร",
      render: (r) => (
        <Link to={`/u/${r.applicant_id}`} className="text-sm hover:text-admin-accent">
          {r.applicant_name || r.applicant_id.slice(0, 8) + "…"}
        </Link>
      ),
    },
    {
      key: "status",
      header: "สถานะ",
      render: (r) => (
        <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v as ApplicationStatus)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{applicationStatusLabel[s] ?? s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    { key: "letter", header: "จดหมาย", render: (r) => <span className="text-xs text-admin-muted line-clamp-2 max-w-xs">{r.cover_letter || "—"}</span> },
    { key: "at", header: "สมัครเมื่อ", render: (r) => <span className="font-mono text-xs">{formatThaiDate(r.created_at)}</span> },
  ];

  return (
    <div>
      <SectionHeader
        eyebrow="applications"
        title="ใบสมัครงาน"
        description={`${data?.length ?? 0} ใบสมัคร · รอพิจารณา ${pending}`}
        actions={
          <div className="flex items-center gap-2">
            <AdminExportButton rows={(filtered ?? []) as unknown as Record<string, unknown>[]} filename="job-applications.csv" />
            <SearchBar value={q} onChange={setQ} placeholder="ค้นหาใบสมัคร" />
          </div>
        }
      />
      <DataTable columns={cols} rows={filtered} loading={isLoading} rowKey={(r) => r.id} empty="ยังไม่มีใบสมัคร" />
    </div>
  );
}
