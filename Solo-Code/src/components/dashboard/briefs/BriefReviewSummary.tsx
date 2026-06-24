import * as React from "react";
import type { DesignBrief } from "@/lib/briefSchema";
import { ShieldCheck, Sparkles } from "lucide-react";

interface Props {
  brief: DesignBrief;
}

/** Read-only summary in receipt style — used for client review and confirmed pages */
export function BriefReviewSummary({ brief }: Props) {
  const o = brief.owner ?? {};
  const ci = brief.client_info;
  const po = brief.project_overview;
  const au = brief.audience;
  const dd = brief.design_direction;
  const ts = brief.tech_specs;
  const tb = brief.timeline_budget;

  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-card p-5 sm:p-7 space-y-5 font-sans">
      {/* Header */}
      <div className="text-center border-b border-dashed border-border pb-4 space-y-1">
        <div className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] text-muted-foreground font-mono">
          <Sparkles className="h-3 w-3" /> SO1O · DESIGN BRIEF
        </div>
        <h2 className="text-xl font-bold tracking-tight">{brief.title}</h2>
        <p className="text-[11px] text-muted-foreground">
          จัดทำโดย {o.brand_name || o.display_name || "Freelancer"} · อัปเดต{" "}
          {new Date(brief.updated_at).toLocaleString("th-TH")}
        </p>
      </div>

      {/* Sections */}
      <Row
        label="ลูกค้า / แบรนด์"
        value={[ci.client_name, ci.brand_name].filter(Boolean).join(" · ")}
      />
      <Row
        label="ติดต่อ"
        value={[ci.contact_email, ci.contact_phone, ci.contact_line].filter(Boolean).join(" · ")}
      />
      <Divider />
      <Row label="ประเภทงาน" value={po.project_type} />
      <Row label="ชื่อโปรเจกต์" value={po.project_name} />
      <Row label="เป้าหมาย" value={po.goal} />
      <Row label="เกี่ยวกับธุรกิจ" value={po.about_business} multiline />
      <Row label="ปัญหา/ความต้องการ" value={po.problem} multiline />
      {(po.scope_items ?? []).length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            เนื้องาน & สโคป
          </div>
          <div className="rounded-xl border border-dashed border-border overflow-hidden">
            <table className="w-full text-xs">
              <tbody>
                {(po.scope_items ?? []).map((it, i) => (
                  <tr key={i} className="border-b last:border-b-0">
                    <td className="px-2.5 py-1.5 text-muted-foreground w-8">{i + 1}.</td>
                    <td className="px-2.5 py-1.5 font-medium">{it.name || "—"}</td>
                    <td className="px-2.5 py-1.5 font-mono text-right w-12">x{it.quantity}</td>
                    <td className="px-2.5 py-1.5 text-muted-foreground hidden sm:table-cell">
                      {it.note ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Divider />
      <Row
        label="กลุ่มเป้าหมาย"
        value={[au.gender, au.age_range, au.lifestyle, au.interests].filter(Boolean).join(" · ")}
      />
      <Divider />
      <Row label="Mood & Tone" value={(dd.moods ?? []).join(", ")} />
      <SwatchRow
        label="🎨 สีที่ชอบ"
        colors={dd.liked_color_chips ?? []}
        fallback={dd.liked_colors}
      />
      <SwatchRow
        label="🚫 สีต้องห้าม"
        colors={dd.forbidden_color_chips ?? []}
        fallback={dd.forbidden_colors}
      />
      <Row label="ฟอนต์" value={dd.liked_fonts} />
      <Row label="แรงบันดาลใจ" value={dd.inspiration} />
      {brief.references.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            รูปอ้างอิง ({brief.references.length})
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {brief.references.map((r, i) => (
              <img
                key={i}
                src={r.url}
                alt=""
                className="aspect-square w-full object-cover rounded-lg border border-border"
              />
            ))}
          </div>
        </div>
      )}
      <Divider />
      <Row label="ไฟล์ที่ต้องส่ง" value={(ts.formats ?? []).join(", ")} />
      <Row label="ขนาด/สเปก" value={ts.size} />
      <Row label="การใช้งาน" value={ts.usage} />
      <Divider />
      <Row label="วันร่างแรก" value={tb.draft_date} />
      <Row label="ดีดไลน์" value={tb.deadline} />
      <Row label="รอบแก้" value={tb.revisions != null ? `${tb.revisions} รอบ` : ""} />
      <Row label="งบประมาณ" value={tb.budget} />
      {brief.notes && (
        <>
          <Divider />
          <Row label="หมายเหตุ" value={brief.notes} multiline />
        </>
      )}

      {/* Confirmed stamp */}
      {brief.status === "confirmed" && brief.confirmed_at && (
        <div className="border-t-2 border-dashed border-emerald-500/40 pt-4 mt-4">
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/30 p-4 flex items-start gap-3">
            <div className="rounded-full bg-emerald-500/15 p-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                ✓ BRIEF CONFIRMED
              </div>
              <div className="font-semibold text-sm mt-0.5">{brief.confirmed_by_name}</div>
              {brief.confirmed_signature && (
                <div className="text-2xl italic font-[cursive] text-foreground/80 mt-1">
                  {brief.confirmed_signature}
                </div>
              )}
              <div className="text-[11px] text-muted-foreground mt-1">
                ยืนยันเมื่อ{" "}
                {new Date(brief.confirmed_at).toLocaleString("th-TH", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  multiline,
}: {
  label: string;
  value?: string | null;
  multiline?: boolean;
}) {
  const v = value && value.trim() ? value : "—";
  const isEmpty = v === "—";
  return (
    <div
      className={`grid grid-cols-[110px_1fr] gap-3 text-sm ${multiline ? "items-start" : "items-baseline"}`}
    >
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground pt-0.5">
        {label}
      </div>
      <div
        className={`${isEmpty ? "text-muted-foreground/80 italic" : "text-foreground"} ${multiline ? "whitespace-pre-wrap" : "truncate"}`}
      >
        {v}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-dashed border-border" />;
}

function SwatchRow({
  label,
  colors,
  fallback,
}: {
  label: string;
  colors: string[];
  fallback?: string;
}) {
  if (colors.length === 0 && !fallback) {
    return <Row label={label} value="" />;
  }
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 text-sm items-start">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground pt-0.5">
        {label}
      </div>
      <div className="space-y-1.5">
        {colors.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {colors.map((c) => (
              <div
                key={c}
                className="flex items-center gap-1 rounded-md border border-border bg-card px-1.5 py-1"
              >
                <span
                  className="w-4 h-4 rounded border border-border"
                  style={{ backgroundColor: c }}
                />
                <code className="text-[10px] font-mono">{c}</code>
              </div>
            ))}
          </div>
        )}
        {fallback && <div className="text-xs text-muted-foreground">{fallback}</div>}
      </div>
    </div>
  );
}
