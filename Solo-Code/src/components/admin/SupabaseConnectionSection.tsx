import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Database,
  ExternalLink,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Terminal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSupabaseProjectInfo, isProjectConfigConsistent } from "@/lib/supabaseProject";
import { toast } from "sonner";

type ProbeStatus = "ok" | "missing" | "error" | "checking";

interface MigrationProbe {
  id: string;
  label: string;
  migrationFile: string;
  status: ProbeStatus;
  detail?: string;
}

const PENDING_SQL_BUNDLE = `supabase/manual/apply-pending-202606.sql`;
const FEEDBACK_SQL_BUNDLE = `supabase/manual/apply-feedback-tickets-20260607.sql`;

async function probeTable(table: string): Promise<{ status: ProbeStatus; detail?: string }> {
  const { error } = await supabase
    .from(table as never)
    .select("id")
    .limit(1);
  if (!error) return { status: "ok" };
  const msg = error.message ?? "";
  if (msg.includes("does not exist") || msg.includes("Could not find the table")) {
    return { status: "missing", detail: msg };
  }
  if (error.code === "PGRST301" || msg.includes("permission")) {
    return { status: "ok", detail: "ตารางมีอยู่ (RLS จำกัดการอ่าน)" };
  }
  return { status: "error", detail: msg };
}

async function probeFeedbackTicketFields(): Promise<{ status: ProbeStatus; detail?: string }> {
  const { error } = await supabase
    .from("support_tickets")
    .select("rating, beta_feedback_id")
    .limit(1);
  if (!error) return { status: "ok" };
  const msg = error.message ?? "";
  if (msg.includes("does not exist") || msg.includes("Could not find the table")) {
    return { status: "missing", detail: "รัน support_tickets migration ก่อน" };
  }
  if (msg.includes("rating") || msg.includes("beta_feedback") || msg.includes("schema cache")) {
    return { status: "missing", detail: "ยังไม่มีคอลัมน์ rating / beta_feedback_id" };
  }
  if (error.code === "PGRST301" || msg.includes("permission")) {
    return { status: "ok", detail: "คอลัมน์มีอยู่ (RLS จำกัดการอ่าน)" };
  }
  return { status: "error", detail: msg };
}

async function probeActivityFeedRpc(): Promise<{ status: ProbeStatus; detail?: string }> {
  const { error } = await (
    supabase as unknown as {
      rpc: (
        fn: string,
        args: object,
      ) => Promise<{ error: { message?: string; code?: string } | null }>;
    }
  ).rpc("get_admin_activity_feed", { _days: 1, _category: "all", _limit: 1 });
  if (!error) return { status: "ok" };
  const msg = error.message ?? "";
  if (msg.includes("Could not find the function") || msg.includes("PGRST202")) {
    return { status: "missing", detail: "ยังไม่มี RPC get_admin_activity_feed" };
  }
  if (msg.includes("admin only") || error.code === "42501") {
    return { status: "ok", detail: "RPC พร้อม (ต้องเป็น admin ถึงเรียกได้)" };
  }
  return { status: "error", detail: msg };
}

async function probeAdminBusinessRls(): Promise<{ status: ProbeStatus; detail?: string }> {
  const [statsRes, quotesRes] = await Promise.all([
    supabase.rpc("get_feature_data_stats" as never),
    supabase.from("quotations").select("id", { count: "exact", head: true }),
  ]);

  if (quotesRes.error) {
    const msg = quotesRes.error.message ?? "";
    if (msg.includes("does not exist") || msg.includes("Could not find the table")) {
      return { status: "missing", detail: msg };
    }
    return { status: "error", detail: msg };
  }

  const statsRows = (statsRes.data ?? []) as Array<{ table_name: string; total_records: number }>;
  const statsTotal = Number(
    statsRows.find((r) => r.table_name === "quotations")?.total_records ?? 0,
  );
  const directCount = quotesRes.count ?? 0;

  if (statsTotal > 0 && directCount < statsTotal) {
    return {
      status: "missing",
      detail: `Admin เห็น ${directCount} ใบเสนอ แต่ระบบมี ${statsTotal} — รัน admin_business_rls migration`,
    };
  }

  return {
    status: "ok",
    detail:
      statsTotal > 0
        ? `admin เห็น quotations ${directCount}/${statsTotal}`
        : "พร้อม (ยังไม่มีใบเสนอในระบบ)",
  };
}

async function probeQuotationContractColumns(): Promise<{ status: ProbeStatus; detail?: string }> {
  const { error } = await supabase
    .from("quotations")
    .select("contract_accepted, contract_signed_at, contract_signer_ip")
    .limit(1);
  if (!error) return { status: "ok" };
  const msg = error.message ?? "";
  if (msg.includes("contract_") || msg.includes("schema cache")) {
    return { status: "missing", detail: "ยังไม่มีคอลัมน์ contract_* บน quotations" };
  }
  return { status: "error", detail: msg };
}

async function probeProfilesDocumentTheme(): Promise<{ status: ProbeStatus; detail?: string }> {
  const { error } = await supabase.from("profiles").select("document_theme").limit(1);
  if (!error) return { status: "ok" };
  const msg = error.message ?? "";
  if (msg.includes("document_theme") || msg.includes("schema cache")) {
    return { status: "missing", detail: "ยังไม่มี profiles.document_theme" };
  }
  if (error.code === "PGRST301" || msg.includes("permission")) {
    return { status: "ok", detail: "คอลัมน์มีอยู่ (RLS จำกัดการอ่าน)" };
  }
  return { status: "error", detail: msg };
}

async function probeQuotationCollabColumns(): Promise<{ status: ProbeStatus; detail?: string }> {
  const { error } = await supabase
    .from("quotations")
    .select("quotation_kind, org_snapshot, studio_snapshot, org_id, studio_id")
    .limit(1);
  if (!error) return { status: "ok" };
  const msg = error.message ?? "";
  if (
    msg.includes("quotation_kind") ||
    msg.includes("org_snapshot") ||
    msg.includes("studio_snapshot") ||
    msg.includes("schema cache")
  ) {
    return { status: "missing", detail: "ยังไม่มีคอลัมน์ inhouse/studio บน quotations" };
  }
  return { status: "error", detail: msg };
}

async function probeCoeditRlsHelpers(): Promise<{ status: ProbeStatus; detail?: string }> {
  const { error } = await (
    supabase as unknown as {
      rpc: (
        fn: string,
        args: object,
      ) => Promise<{ error: { message?: string; code?: string } | null }>;
    }
  ).rpc("is_quotation_collaborator", { p_quotation_id: "00000000-0000-0000-0000-000000000000" });
  if (!error) return { status: "ok" };
  const msg = error.message ?? "";
  if (msg.includes("Could not find the function") || msg.includes("PGRST202")) {
    return { status: "missing", detail: "ยังไม่มี RPC is_quotation_collaborator (co-edit RLS)" };
  }
  return { status: "ok", detail: "RPC พร้อม (ผลลัพธ์ false สำหรับ id ปลอม)" };
}

export function SupabaseConnectionSection() {
  const info = React.useMemo(() => getSupabaseProjectInfo(), []);
  const consistent = isProjectConfigConsistent(info);
  const [connOk, setConnOk] = React.useState<boolean | null>(null);
  const [latencyMs, setLatencyMs] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [probes, setProbes] = React.useState<MigrationProbe[]>([
    {
      id: "contract",
      label: "สัญญาจ้าง (contract_* บน quotations)",
      migrationFile: "20260605100000_quotations_contract.sql",
      status: "checking",
    },
    {
      id: "support_tickets",
      label: "Support Tickets MVP",
      migrationFile: "20260604150000_support_tickets.sql",
      status: "checking",
    },
    {
      id: "shared_projects",
      label: "Shared Squad (Phase 2 schema)",
      migrationFile: "20260605110000_shared_projects_phase2.sql",
      status: "checking",
    },
    {
      id: "pipeline_org",
      label: "Pipeline indexes & organization",
      migrationFile: "20260605120000_pipeline_supabase_organization.sql",
      status: "checking",
    },
    {
      id: "feedback_ticket_fields",
      label: "Give Feedback → Tickets (rating + link)",
      migrationFile: "20260607120000_feedback_ticket_fields.sql",
      status: "checking",
    },
    {
      id: "admin_activity_feed",
      label: "Mission Control Activity Feed RPC",
      migrationFile: "20260607130000_admin_activity_feed.sql",
      status: "checking",
    },
    {
      id: "inhouse_workspace",
      label: "In-House Co-working (org + kanban + chat)",
      migrationFile: "20260612120000_inhouse_workspace.sql",
      status: "checking",
    },
    {
      id: "document_theme",
      label: "Custom Docs — profiles.document_theme",
      migrationFile: "20260616120000_profiles_document_theme.sql",
      status: "checking",
    },
    {
      id: "quotation_collab",
      label: "In-House quotes — collaborators + kind/snapshots",
      migrationFile: "20260616130000_quotation_collab_inhouse_branding.sql",
      status: "checking",
    },
    {
      id: "quotation_collaborators",
      label: "ตาราง quotation_collaborators",
      migrationFile: "20260616130000_quotation_collab_inhouse_branding.sql",
      status: "checking",
    },
    {
      id: "coedit_rls",
      label: "Co-edit RLS (collaborator SELECT/UPDATE)",
      migrationFile: "20260617120000_quotation_coedit_rls.sql",
      status: "checking",
    },
  ]);

  const runChecks = React.useCallback(async () => {
    setLoading(true);
    setConnOk(null);
    setLatencyMs(null);

    const t0 = performance.now();
    try {
      const { error } = await supabase.from("profiles").select("user_id").limit(1);
      setLatencyMs(Math.round(performance.now() - t0));
      setConnOk(!error || !error.message.includes("Failed to fetch"));
    } catch {
      setConnOk(false);
      setLatencyMs(Math.round(performance.now() - t0));
    }

    const [
      contract,
      tickets,
      shared,
      feedbackFields,
      activityFeed,
      adminBusinessRls,
      inhouse,
      documentTheme,
      quotationCollabCols,
      quotationCollaborators,
      coeditRls,
    ] = await Promise.all([
      probeQuotationContractColumns(),
      probeTable("support_tickets"),
      probeTable("shared_projects"),
      probeFeedbackTicketFields(),
      probeActivityFeedRpc(),
      probeAdminBusinessRls(),
      probeTable("inhouse_orgs"),
      probeProfilesDocumentTheme(),
      probeQuotationCollabColumns(),
      probeTable("quotation_collaborators"),
      probeCoeditRlsHelpers(),
    ]);

    const contractOk = contract.status === "ok";
    const pipelineOrg: { status: ProbeStatus; detail?: string } = contractOk
      ? { status: "ok", detail: "รันร่วมกับ contract migration (ตรวจแบบย่อ)" }
      : { status: "missing", detail: "รันหลัง contract migration" };

    const feedbackNotify: { status: ProbeStatus; detail?: string } =
      feedbackFields.status === "ok"
        ? { status: "ok", detail: "รวมใน 20260607120100_ticket_feedback_notify.sql" }
        : { status: "missing", detail: "รันหลัง feedback_ticket_fields" };

    setProbes([
      {
        id: "contract",
        label: "สัญญาจ้าง (contract_* บน quotations)",
        migrationFile: "20260605100000_quotations_contract.sql",
        ...contract,
      },
      {
        id: "support_tickets",
        label: "Support Tickets MVP",
        migrationFile: "20260604150000_support_tickets.sql",
        ...tickets,
      },
      {
        id: "shared_projects",
        label: "Shared Squad (Phase 2 schema)",
        migrationFile: "20260605110000_shared_projects_phase2.sql",
        ...shared,
      },
      {
        id: "pipeline_org",
        label: "Pipeline indexes & organization",
        migrationFile: "20260605120000_pipeline_supabase_organization.sql",
        ...pipelineOrg,
      },
      {
        id: "feedback_ticket_fields",
        label: "Give Feedback → Tickets (rating + link)",
        migrationFile: "20260607120000_feedback_ticket_fields.sql",
        ...feedbackFields,
      },
      {
        id: "feedback_notify",
        label: "แจ้งลูกค้าเมื่อแก้ฟีดแบ็ก",
        migrationFile: "20260607120100_ticket_feedback_notify.sql",
        ...feedbackNotify,
      },
      {
        id: "admin_activity_feed",
        label: "Mission Control Activity Feed RPC",
        migrationFile: "20260607130000_admin_activity_feed.sql",
        ...activityFeed,
      },
      {
        id: "admin_business_rls",
        label: "Admin business KPI RLS (quotations + finance)",
        migrationFile: "20260609120000_admin_business_rls.sql",
        ...adminBusinessRls,
      },
      {
        id: "inhouse_workspace",
        label: "In-House Co-working (org + kanban + chat)",
        migrationFile: "20260612120000_inhouse_workspace.sql",
        ...inhouse,
      },
      {
        id: "document_theme",
        label: "Custom Docs — profiles.document_theme",
        migrationFile: "20260616120000_profiles_document_theme.sql",
        ...documentTheme,
      },
      {
        id: "quotation_collab",
        label: "In-House quotes — collaborators + kind/snapshots",
        migrationFile: "20260616130000_quotation_collab_inhouse_branding.sql",
        ...quotationCollabCols,
      },
      {
        id: "quotation_collaborators",
        label: "ตาราง quotation_collaborators",
        migrationFile: "20260616130000_quotation_collab_inhouse_branding.sql",
        ...quotationCollaborators,
      },
      {
        id: "coedit_rls",
        label: "Co-edit RLS (collaborator SELECT/UPDATE)",
        migrationFile: "20260617120000_quotation_coedit_rls.sql",
        ...coeditRls,
      },
    ]);

    setLoading(false);
  }, []);

  React.useEffect(() => {
    runChecks();
  }, [runChecks]);

  const allOk = probes.every((p) => p.status === "ok");
  const anyMissing = probes.some((p) => p.status === "missing");

  const copyRef = () => {
    navigator.clipboard.writeText(info.projectRef);
    toast.success("คัดลอก Project Ref แล้ว");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Supabase Connection
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            โปรเจกต์ที่แอปเชื่อมต่ออยู่จริง + สถานะ migrations ล่าสุด
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={runChecks}
          disabled={loading}
          className="h-8 gap-1.5"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          ตรวจสอบใหม่
        </Button>
      </div>

      <Card className={consistent ? "border-emerald-200/60" : "border-amber-300/60"}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">โปรเจกต์ที่เชื่อมต่อ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoRow label="Project Ref" value={info.projectRef || "—"} mono />
            <InfoRow label="API Host" value={info.apiHost || "—"} mono />
            <InfoRow
              label="Publishable Key"
              value={info.hasPublishableKey ? "ตั้งค่าแล้ว" : "ไม่พบ"}
            />
            <InfoRow
              label="Key ↔ Project"
              value={
                info.publishableKeyRef
                  ? info.publishableKeyRef === info.projectRef
                    ? "ตรงกัน ✓"
                    : `ไม่ตรง! key=${info.publishableKeyRef}`
                  : "—"
              }
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant={consistent ? "default" : "destructive"} className="text-[10px]">
              {consistent ? "Config สอดคล้อง" : "Config ไม่ตรงกัน — ตรวจ .env"}
            </Badge>
            {connOk === true && (
              <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">
                เชื่อมต่อได้ {latencyMs != null ? `(${latencyMs}ms)` : ""}
              </Badge>
            )}
            {connOk === false && (
              <Badge variant="outline" className="text-[10px] text-red-600 border-red-300">
                เชื่อมต่อไม่ได้
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={copyRef}>
              <Copy className="h-3.5 w-3.5" />
              คัดลอก Ref
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
              <a href={info.dashboardUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                เปิด Supabase Dashboard
              </a>
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
              <a href={`${info.dashboardUrl}/editor`} target="_blank" rel="noopener noreferrer">
                <Terminal className="h-3.5 w-3.5" />
                SQL Editor
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">สถานะ Migrations (2026-06)</CardTitle>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : allOk ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : anyMissing ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {probes.map((p) => (
            <div
              key={p.id}
              className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-xs"
            >
              <div className="min-w-0">
                <p className="font-medium">{p.label}</p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">
                  {p.migrationFile}
                </p>
                {p.detail && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                    {p.detail}
                  </p>
                )}
              </div>
              <ProbeBadge status={p.status} />
            </div>
          ))}

          {anyMissing && (
            <div className="mt-3 rounded-lg bg-muted/50 border border-dashed p-3 text-[11px] text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">วิธี push migrations</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  รัน{" "}
                  <code className="bg-muted px-1 rounded">./scripts/install-supabase-cli.sh</code>
                </li>
                <li>
                  รัน <code className="bg-muted px-1 rounded">npx supabase login</code> (หรือตั้ง{" "}
                  <code>SUPABASE_ACCESS_TOKEN</code>)
                </li>
                <li>
                  รัน{" "}
                  <code className="bg-muted px-1 rounded">./scripts/supabase-push-via-api.sh</code>{" "}
                  (หรือ <code className="bg-muted px-1 rounded">supabase-push-pipeline.sh</code>{" "}
                  ถ้ามี DB password)
                </li>
                <li>
                  หรือวาง SQL ใน Dashboard → SQL Editor:{" "}
                  <code className="bg-muted px-1 rounded">{PENDING_SQL_BUNDLE}</code> (schema มิ.ย.)
                  หรือ <code className="bg-muted px-1 rounded">{FEEDBACK_SQL_BUNDLE}</code> (ฟีดแบ็ก
                  + Activity Feed)
                </li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">ขั้นตอนถัดไป</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-[11px] text-muted-foreground">
          <SetupRow
            done={allOk && !anyMissing}
            label="Schema migrations"
            hint={allOk && !anyMissing ? "ครบแล้ว" : "รัน ./scripts/supabase-push-via-api.sh"}
          />
          <SetupRow
            label="Auth redirect URLs (localhost + production)"
            hint="รัน ./scripts/supabase-setup-project.sh หรือ Dashboard → Auth → URL Configuration"
            link={`${info.dashboardUrl}/auth/url-configuration`}
            linkLabel="ตั้งค่า Auth"
          />
          <SetupRow
            label="Edge Functions + GEMINI_API_KEY"
            hint="Dashboard → Edge Functions → Secrets แล้ว deploy 4 functions"
            link={`${info.dashboardUrl}/functions`}
            linkLabel="Edge Functions"
          />
          <SetupRow
            label="Revoke access token ที่เคยแชร์"
            hint="Account → Access Tokens → revoke แล้วสร้างใหม่"
            link="https://supabase.com/dashboard/account/tokens"
            linkLabel="Access Tokens"
          />
          <SetupRow
            label="สมัครบัญชีแรก + ตั้ง admin"
            hint="สมัครในแอป แล้วเพิ่ม role admin ใน user_roles (โปรเจกต์ใหม่ไม่มีข้อมูลเก่า)"
          />
        </CardContent>
      </Card>

      <Card className="border-border bg-muted/20">
        <CardContent className="p-3.5 text-[11px] text-muted-foreground leading-relaxed">
          <strong>หมายเหตุ:</strong> Cursor MCP อาจแสดงโปรเจกต์คนละตัวกับที่แอปใช้ — อ้างอิง Project
          Ref ด้านบนเท่านั้น. เอกสาร: <code>supabase/README.md</code> · ค่าใน{" "}
          <code>config.toml</code> ต้องตรง <code>VITE_SUPABASE_PROJECT_ID</code>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`font-medium truncate ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}

function SetupRow({
  label,
  hint,
  done,
  link,
  linkLabel,
}: {
  label: string;
  hint: string;
  done?: boolean;
  link?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2">
      <div className="min-w-0">
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-[10px] mt-0.5">{hint}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {done ? (
          <Badge className="text-[9px] bg-emerald-600 hover:bg-emerald-600">เสร็จ</Badge>
        ) : (
          <Badge variant="outline" className="text-[9px]">
            ทำเอง
          </Badge>
        )}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-primary hover:underline"
          >
            {linkLabel ?? "เปิด"}
          </a>
        )}
      </div>
    </div>
  );
}

function ProbeBadge({ status }: { status: ProbeStatus }) {
  if (status === "checking") {
    return (
      <Badge variant="outline" className="shrink-0 text-[9px]">
        กำลังตรวจ...
      </Badge>
    );
  }
  if (status === "ok") {
    return (
      <Badge className="shrink-0 text-[9px] bg-emerald-600 hover:bg-emerald-600">ขึ้นแล้ว</Badge>
    );
  }
  if (status === "missing") {
    return (
      <Badge variant="outline" className="shrink-0 text-[9px] text-amber-700 border-amber-300">
        ยังไม่รัน
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="shrink-0 text-[9px]">
      ผิดพลาด
    </Badge>
  );
}
