import { Bot, ExternalLink, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { useAdminTriage } from "@/hooks/useAdminTriage";
import { anthemAdmin } from "@/lib/links";
import {
  KYC_REC_LABEL,
  REPORT_REC_LABEL,
  kycRiskTone,
} from "@/lib/report-ai-triage";

function PreviewRow({
  title,
  meta,
  summary,
  href,
  tone,
}: {
  title: string;
  meta: string;
  summary: string;
  href: string;
  tone: "urgent" | "high" | "medium";
}) {
  const border =
    tone === "urgent"
      ? "border-red-200 bg-red-50/80"
      : tone === "high"
        ? "border-orange-200 bg-orange-50/60"
        : "border-border bg-white";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`block rounded-lg border px-3 py-2.5 text-sm transition hover:shadow-md ${border}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-ink">{title}</p>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted opacity-50" />
      </div>
      <p className="mt-0.5 text-xs text-muted">{meta}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-ink/90">{summary}</p>
    </a>
  );
}

export function AdminTriagePanel() {
  const { data, isLoading } = useAdminTriage();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-white p-4 text-sm text-muted">
        กำลังโหลด AI สรุปคิว...
      </div>
    );
  }

  if (!data) return null;

  const hasPreview = data.kycPreview.length > 0 || data.reportPreview.length > 0;
  const hasFlags = data.highRiskKyc > 0 || data.urgentReports > 0;

  if (!hasPreview && !hasFlags) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-900">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Bot className="h-4 w-4" /> AI สรุปคิว
        </span>
        <p className="mt-1 text-xs text-emerald-800/90">
          ไม่มี KYC ความเสี่ยงสูงหรือรายงานด่วน — AI ช่วยสรุปเมื่อมีรายการใหม่ (ไม่อนุมัติแทนคน)
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/80 to-white p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Bot className="h-4 w-4 text-violet-600" />
            AI สรุปคิว — ช่วย triage ไม่ auto-resolve
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            อ่านสรุปแล้วกดเปิด Admin เพื่ออนุมัติ/ดำเนินการเอง · โทษคำหยาบลงอัตโนมัติแยกต่างหาก
          </p>
        </div>
        <Link
          to="/inbox"
          className="text-xs font-medium text-brand hover:underline"
        >
          เปิด Inbox →
        </Link>
      </div>

      {(data.highRiskKyc > 0 || data.urgentReports > 0) && (
        <div className="mb-3 flex flex-wrap gap-2">
          {data.highRiskKyc > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-xs font-medium text-red-900">
              <ShieldAlert className="h-3.5 w-3.5" />
              KYC ความเสี่ยงสูง {data.highRiskKyc}
            </span>
          ) : null}
          {data.urgentReports > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-950">
              รายงานด่วน {data.urgentReports}
            </span>
          ) : null}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data.kycPreview.length > 0 ? (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              KYC ควรดูก่อน
            </h3>
            <div className="space-y-2">
              {data.kycPreview.map((k) => {
                const tone = kycRiskTone(k.ai_risk_score);
                return (
                  <PreviewRow
                    key={k.id}
                    title={k.legal_name || `User ${k.user_id.slice(0, 8)}…`}
                    meta={`ความเสี่ยง ${k.ai_risk_score ?? "—"}/100 · ${KYC_REC_LABEL[k.ai_recommendation ?? ""] ?? "รอ AI"}`}
                    summary={k.ai_summary || "ยังไม่มีสรุป AI — เปิดดูเอกสาร"}
                    href={anthemAdmin("/kyc")}
                    tone={tone === "high" ? "urgent" : "high"}
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        {data.reportPreview.length > 0 ? (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              รายงานในคิว (เรียงความสำคัญ)
            </h3>
            <div className="space-y-2">
              {data.reportPreview.map((r) => {
                const urgent =
                  (r.ai_priority ?? 0) >= 70 || r.ai_recommendation === "urgent";
                return (
                  <PreviewRow
                    key={r.id}
                    title={`${r.reason} · ${r.target_type}`}
                    meta={`ลำดับ ${r.ai_priority ?? "—"}/100 · ${REPORT_REC_LABEL[r.ai_recommendation ?? ""] ?? "—"}`}
                    summary={r.ai_summary || "—"}
                    href={anthemAdmin("/reports")}
                    tone={urgent ? "urgent" : (r.ai_priority ?? 0) >= 45 ? "high" : "medium"}
                  />
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
