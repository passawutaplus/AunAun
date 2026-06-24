import * as React from "react";
import type { Quotation } from "@/store/quotations";
import { computeRevisionDates, computeTotals, formatBaht } from "@/store/quotations";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/auth/AuthProvider";
import { resolveDocumentTheme, type DocumentThemeInput } from "@/lib/documentTheme";
import { issuerFromQuotation } from "@/lib/quotationKinds";

interface Props {
  q: Quotation;
}

const fmt = (s?: string) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return format(d, "d MMMM yyyy", { locale: th });
};

/**
 * Printable timeline appendix — appears in PDF when user selects
 * "แทรกไทม์ไลน์" in the export options dialog.
 * Minimal A4 layout matching the brief PDF aesthetic.
 */
export function QuotationTimelineAppendix({ q }: Props) {
  const { tier } = useSubscription();
  const { profile } = useAuth();
  const issuer = issuerFromQuotation(q);
  const { colors } = React.useMemo(() => {
    const themeInput =
      (issuer?.documentTheme as DocumentThemeInput | undefined) ??
      ((profile?.document_theme ?? {}) as DocumentThemeInput);
    const effectiveTier = issuer ? "inhouse" : tier;
    return resolveDocumentTheme(effectiveTier, themeInput);
  }, [issuer, tier, profile?.document_theme]);
  const accent = colors.primary;
  const accentSoft = colors.primarySoft;
  const totals = computeTotals(q);
  const revisionDates = computeRevisionDates(q.startDate, q.endDate, q.revisionsCount);

  const events: { date?: string; label: string; type: "deposit" | "start" | "revision" | "end" }[] =
    [];
  if (q.depositDueDate) {
    events.push({
      date: q.depositDueDate,
      label: `ชำระมัดจำ ${q.depositPreset}% (฿${formatBaht(totals.depositAmount)})`,
      type: "deposit",
    });
  }
  if (q.startDate) events.push({ date: q.startDate, label: "เริ่มงาน", type: "start" });
  revisionDates.forEach((d, i) =>
    events.push({ date: d, label: `ส่งแก้ไขครั้งที่ ${i + 1}`, type: "revision" }),
  );
  if (q.endDate) events.push({ date: q.endDate, label: "ส่งมอบ / จบงาน", type: "end" });
  events.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));

  return (
    <div
      className="quotation-timeline-appendix"
      style={{
        fontFamily: '"Inter", "IBM Plex Sans Thai", system-ui, sans-serif',
        color: "#1a1a1a",
        background: "#fff",
        padding: "32px 36px",
        fontSize: 11,
        lineHeight: 1.55,
      }}
    >
      <header
        style={{
          borderBottom: `2px solid ${accent}`,
          paddingBottom: 10,
          marginBottom: 18,
        }}
      >
        <p
          style={{
            fontSize: 9,
            letterSpacing: "0.18em",
            color: accent,
            margin: 0,
            fontWeight: 600,
          }}
        >
          APPENDIX · TIMELINE
        </p>
        <h1 style={{ fontSize: 22, margin: "4px 0 2px", fontWeight: 600 }}>ไทม์ไลน์โครงการ</h1>
        <p style={{ fontSize: 10, color: "#666", margin: 0 }}>
          {q.projectName || "—"} · {q.clientName || "ลูกค้า"} · {q.number}
        </p>
      </header>

      {/* Summary */}
      <section style={{ marginBottom: 18 }}>
        {q.depositDueDate && (
          <SummaryRow label="วันครบกำหนดชำระมัดจำ" value={fmt(q.depositDueDate)} />
        )}
        <SummaryRow label="วันที่เริ่มงาน" value={fmt(q.startDate)} />
        <SummaryRow label="วันที่จบงาน" value={fmt(q.endDate)} />
        <SummaryRow label="จำนวนแก้ไขฟรี" value={`${q.revisionsCount || 0} ครั้ง`} />
      </section>

      {/* Schedule */}
      {events.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <SectionTitle color={accent}>ตารางส่งงาน</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: accentSoft }}>
                <th style={th_}>วันที่</th>
                <th style={th_}>กิจกรรม</th>
                <th style={th_}>ประเภท</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i}>
                  <td style={td_}>{fmt(e.date)}</td>
                  <td style={td_}>{e.label}</td>
                  <td style={{ ...td_, color: "#666" }}>
                    {e.type === "deposit" && "มัดจำ"}
                    {e.type === "start" && "เริ่มต้น"}
                    {e.type === "revision" && "รอบแก้ไข"}
                    {e.type === "end" && "ส่งมอบ"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Milestones */}
      {q.milestones && q.milestones.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <SectionTitle color={accent}>งวดการชำระเงิน</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: accentSoft }}>
                <th style={th_}>งวด</th>
                <th style={th_}>วันที่กำหนด</th>
                <th style={{ ...th_, textAlign: "right" }}>สัดส่วน</th>
                <th style={{ ...th_, textAlign: "right" }}>จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {q.milestones.map((m) => {
                const amount = totals.grandTotal * ((m.percent || 0) / 100);
                return (
                  <tr key={m.id}>
                    <td style={td_}>{m.label}</td>
                    <td style={td_}>{fmt(m.date)}</td>
                    <td style={{ ...td_, textAlign: "right" }}>{m.percent || 0}%</td>
                    <td style={{ ...td_, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      ฿{formatBaht(amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {q.notes && (
        <section>
          <SectionTitle>หมายเหตุ</SectionTitle>
          <p style={{ fontSize: 10.5, color: "#333", whiteSpace: "pre-wrap" }}>{q.notes}</p>
        </section>
      )}
    </div>
  );
}

const th_: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  fontSize: 10,
  fontWeight: 600,
  color: "#444",
  borderBottom: "1px solid #e5e5e5",
};

const td_: React.CSSProperties = {
  padding: "6px 8px",
  fontSize: 10.5,
  borderBottom: "1px solid #f0f0f0",
};

function SectionTitle({
  children,
  color = "#F37021",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <h2
      style={{
        fontSize: 11,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color,
        margin: "0 0 8px",
        fontWeight: 600,
      }}
    >
      {children}
    </h2>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "4px 0", borderBottom: "1px solid #f5f5f5" }}>
      <div style={{ width: 130, color: "#666", fontSize: 10.5 }}>{label}</div>
      <div style={{ flex: 1, fontSize: 11 }}>{value}</div>
    </div>
  );
}
