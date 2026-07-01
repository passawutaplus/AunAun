import * as React from "react";
import type { DesignBrief } from "@/lib/briefSchema";
import {
  docAccentForKind,
  resolveDocumentTheme,
  type ResolvedDocumentTheme,
} from "@/lib/documentTheme";
import type { Tier } from "@/hooks/useSubscription";

interface Props {
  brief: DesignBrief;
  theme?: ResolvedDocumentTheme;
  tier?: Tier;
}

function fmtDate(s?: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return s;
  }
}

/* ---------- Layout primitives (sidebar-style like the reference) ---------- */

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value?: React.ReactNode;
  valueClassName?: string;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="brief-pdf-row">
      <div className="brief-pdf-row-label">{label}</div>
      <div className={`brief-pdf-row-value ${valueClassName ?? ""}`}>{value}</div>
    </div>
  );
}

function Section({
  numberLabel,
  title,
  subtitle,
  children,
}: {
  numberLabel: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="brief-pdf-section-v2">
      <aside className="brief-pdf-aside">
        <div className="brief-pdf-aside-num">{numberLabel}</div>
        <h2 className="brief-pdf-aside-title">{title}</h2>
        {subtitle && <p className="brief-pdf-aside-sub">{subtitle}</p>}
      </aside>
      <div className="brief-pdf-content">{children}</div>
    </section>
  );
}

function SwatchList({ colors }: { colors: string[] }) {
  if (!colors?.length) return null;
  return (
    <div className="brief-pdf-swatches">
      {colors.map((c, i) => (
        <div key={`${c}-${i}`} className="brief-pdf-swatch">
          <div className="brief-pdf-swatch-chip" style={{ background: c }} />
          <code className="brief-pdf-swatch-code">{c.toUpperCase()}</code>
        </div>
      ))}
    </div>
  );
}

/* ---------- Template ---------- */

export const BriefPdfTemplate = React.forwardRef<HTMLDivElement, Props>(function BriefPdfTemplate(
  { brief, theme: themeOverride, tier = "free" },
  ref,
) {
  const o = brief.owner ?? {};
  const docTheme = themeOverride ?? resolveDocumentTheme(tier, null);
  const briefAccent = docAccentForKind(docTheme.colors, "brief");
  const ci = brief.client_info;
  const po = brief.project_overview;
  const au = brief.audience;
  const dd = brief.design_direction;
  const ts = brief.tech_specs;
  const tb = brief.timeline_budget;

  const brandName = o.brand_name || o.display_name || "So1o Freelancer";

  const hasBrandCi = !!(
    ci.logo_url ||
    ci.ci_image_url ||
    (ci.ci_palette && ci.ci_palette.length > 0)
  );

  return (
    <div
      ref={ref}
      className="brief-pdf-root"
      style={{ "--doc-accent": briefAccent } as React.CSSProperties}
    >
      {/* ============= COVER ============= */}
      <header className="brief-pdf-cover-v2">
        <div className="brief-pdf-cover-brand">
          {o.logo_url && <img src={o.logo_url} alt="" className="brief-pdf-cover-logo" />}
          <div>
            <div className="brief-pdf-cover-brandname">{brandName}</div>
            {o.tagline && <div className="brief-pdf-cover-tagline">{o.tagline}</div>}
            {(o.email || o.phone) && (
              <div className="brief-pdf-cover-tagline" style={{ marginTop: 2 }}>
                {[o.email, o.phone].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
        </div>

        <div className="brief-pdf-cover-titleblock">
          <div className="brief-pdf-cover-eyebrow">THE</div>
          <h1 className="brief-pdf-cover-title">
            DESIGN <span className="brief-pdf-cover-title-thin">BRIEF</span>
          </h1>
        </div>

        <div className="brief-pdf-cover-rule" />

        <p className="brief-pdf-cover-intro">
          เอกสารฉบับนี้สรุปข้อตกลงระหว่างฟรีแลนซ์และลูกค้า เพื่อให้งานออกแบบเดินหน้าได้อย่างชัดเจน
          ตรงโจทย์ และอยู่ในขอบเขตที่ตกลงกันไว้ตั้งแต่ต้น
          โปรดอ่านและตรวจสอบรายละเอียดทุกหัวข้อก่อนยืนยัน
        </p>

        <div className="brief-pdf-cover-meta">
          <div>
            <span>โปรเจกต์</span>
            <strong>{brief.title}</strong>
          </div>
          <div>
            <span>ลูกค้า</span>
            <strong>{ci.client_name || "—"}</strong>
          </div>
          <div>
            <span>แบรนด์</span>
            <strong>{ci.brand_name || "—"}</strong>
          </div>
          <div>
            <span>วันที่</span>
            <strong>{fmtDate(brief.created_at)}</strong>
          </div>
        </div>
      </header>

      {/* ============= 1. CLIENT INFO ============= */}
      <Section numberLabel="01" title="CLIENT" subtitle="INFO">
        <Row label="ชื่อลูกค้า" value={ci.client_name} />
        <Row label="ชื่อแบรนด์" value={ci.brand_name} />
        <Row label="อีเมล" value={ci.contact_email} />
        <Row label="โทรศัพท์" value={ci.contact_phone} />
        <Row label="LINE" value={ci.contact_line} />
      </Section>

      {/* ============= 2. PROJECT INFO ============= */}
      <Section numberLabel="02" title="PROJECT" subtitle="INFO">
        <Row label="ชื่อโปรเจกต์" value={po.project_name} />
        <Row label="ประเภทงาน" value={po.project_type} />
        <Row label="เกี่ยวกับธุรกิจ" value={po.about_business} />
        <Row label="เป้าหมาย" value={po.goal} />
        <Row label="ปัญหาที่อยากแก้" value={po.problem} />
        {po.style_name && <Row label="สไตล์งาน" value={po.style_name} />}
      </Section>

      {/* ============= 3. SCOPE ============= */}
      {(po.scope_items ?? []).length > 0 && (
        <Section numberLabel="03" title="SCOPE" subtitle="& DELIVERABLES">
          <ul className="brief-pdf-scope-list">
            {(po.scope_items ?? []).map((it, i) => (
              <li key={i}>
                <span className="brief-pdf-scope-name">{it.name || "—"}</span>
                <span className="brief-pdf-scope-qty">x{it.quantity}</span>
                {it.note && <span className="brief-pdf-scope-note"> · {it.note}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ============= 4. BRAND CI REFERENCE (NEW) ============= */}
      {hasBrandCi && (
        <Section numberLabel="04" title="BRAND" subtitle="CI REFERENCE">
          <div className="brief-pdf-ci-grid">
            {ci.logo_url && (
              <div className="brief-pdf-ci-block">
                <div className="brief-pdf-ci-caption">โลโก้ลูกค้า</div>
                <div className="brief-pdf-ci-imgwrap brief-pdf-ci-imgwrap--logo">
                  <img src={ci.logo_url} alt="client logo" />
                </div>
              </div>
            )}
            {ci.ci_image_url && (
              <div className="brief-pdf-ci-block">
                <div className="brief-pdf-ci-caption">ภาพแบรนด์ปัจจุบัน</div>
                <div className="brief-pdf-ci-imgwrap">
                  <img src={ci.ci_image_url} alt="brand reference" />
                </div>
              </div>
            )}
          </div>
          {ci.ci_palette && ci.ci_palette.length > 0 && (
            <>
              <div className="brief-pdf-ci-caption" style={{ marginTop: 10 }}>
                พาเลตต์สีหลัก (ยึดเป็น CI)
              </div>
              <SwatchList colors={ci.ci_palette} />
            </>
          )}
        </Section>
      )}

      {/* ============= 5. AUDIENCE ============= */}
      <Section numberLabel="05" title="TARGET" subtitle="AUDIENCE">
        <Row label="เพศ" value={au.gender} />
        <Row label="ช่วงอายุ" value={au.age_range} />
        <Row label="ไลฟ์สไตล์" value={au.lifestyle} />
        <Row label="ความสนใจ" value={au.interests} />
      </Section>

      {/* ============= 6. DESIGN DIRECTION ============= */}
      <Section numberLabel="06" title="DESIGN" subtitle="DIRECTION">
        <Row label="Mood & Tone" value={dd.moods?.join(" · ")} />
        <Row
          label="สีที่ชอบ"
          value={
            (dd.liked_color_chips ?? []).length > 0 ? (
              <SwatchList colors={dd.liked_color_chips!} />
            ) : (
              dd.liked_colors
            )
          }
        />
        <Row
          label="สีต้องห้าม"
          value={
            (dd.forbidden_color_chips ?? []).length > 0 ? (
              <SwatchList colors={dd.forbidden_color_chips!} />
            ) : (
              dd.forbidden_colors
            )
          }
        />
        <Row label="ฟอนต์ที่ชอบ" value={dd.liked_fonts} />
        {(brief.design_links?.length ?? 0) > 0 && (
          <Row
            label="ลิงก์ไฟล์งาน"
            value={brief.design_links!.map((l) => `${l.label}: ${l.url}`).join("\n")}
          />
        )}
        <Row label="แรงบันดาลใจ" value={dd.inspiration} />
      </Section>

      {/* ============= 7. TECH SPECS ============= */}
      <Section numberLabel="07" title="TECHNICAL" subtitle="SPECIFICATIONS">
        <Row label="นามสกุลไฟล์" value={ts.formats?.join(", ")} />
        <Row label="ขนาด / สเปก" value={ts.size} />
        <Row label="การนำไปใช้" value={ts.usage} />
      </Section>

      {/* ============= 8. TIMELINE & BUDGET ============= */}
      <Section numberLabel="08" title="TIMELINE" subtitle="& BUDGET">
        <Row label="วันส่งร่างแรก" value={fmtDate(tb.draft_date)} />
        <Row label="วันปิดงาน" value={fmtDate(tb.deadline)} />
        <Row label="จำนวนรอบแก้" value={tb.revisions} />
        <Row label="งบประมาณ" value={tb.budget} />
      </Section>

      {/* ============= 9a. CLIENT OWNED ASSETS ============= */}
      {(brief.client_info.past_works?.length ?? 0) > 0 && (
        <Section numberLabel="09" title="CLIENT" subtitle="OWNED ASSETS">
          <p style={{ fontSize: 9, color: "#9CA3AF", marginBottom: 6, fontStyle: "italic" }}>
            ผลงาน/กราฟิกเดิมของลูกค้า — ใช้เพื่อรักษาทิศทางแบรนด์
          </p>
          <div className="brief-pdf-refs">
            {brief.client_info.past_works!.map((r, i) => (
              <img key={`pw-${i}`} src={r.url} alt={r.name ?? `past-${i}`} />
            ))}
          </div>
        </Section>
      )}

      {/* ============= 9b. EXTERNAL INSPIRATION ============= */}
      {brief.references.length > 0 && (
        <Section numberLabel="10" title="INSPIRATION" subtitle="MOOD BOARD">
          <p style={{ fontSize: 9, color: "#9CA3AF", marginBottom: 6, fontStyle: "italic" }}>
            รูปอ้างอิงภายนอกที่ลูกค้าชอบ (ไม่ใช่งานเดิมของลูกค้า)
          </p>
          <div className="brief-pdf-refs">
            {brief.references.map((r, i) => (
              <img key={i} src={r.url} alt={r.name ?? `ref-${i}`} />
            ))}
          </div>
        </Section>
      )}

      {/* ============= 10. FREELANCER PRIVATE NOTES ============= */}
      {brief.notes && (
        <Section numberLabel="10" title="FREELANCER" subtitle="PRIVATE NOTES">
          <p style={{ fontSize: 9, color: "#9CA3AF", marginBottom: 6, fontStyle: "italic" }}>
            * โน้ตส่วนตัวของฟรีแลนซ์ ไม่ใช่ส่วนหนึ่งของบรีฟที่ลูกค้ายืนยัน
          </p>
          <p className="brief-pdf-notes">{brief.notes}</p>
        </Section>
      )}

      {/* ============= SIGN-OFF ============= */}
      <section className="brief-pdf-signoff">
        <div className="brief-pdf-aside-num">SIGN</div>
        <h2 className="brief-pdf-aside-title" style={{ marginBottom: 12 }}>
          OFF
        </h2>
        {brief.status === "confirmed" ? (
          <div className="brief-pdf-confirmed">
            <div className="brief-pdf-stamp">BRIEF CONFIRMED ✓</div>
            <div className="brief-pdf-sig">
              <div className="brief-pdf-sig-line">
                {brief.confirmed_signature || brief.confirmed_by_name}
              </div>
              <div className="brief-pdf-sig-meta">
                {brief.confirmed_by_name} · ยืนยันเมื่อ {fmtDate(brief.confirmed_at)}
              </div>
            </div>
          </div>
        ) : (
          <div className="brief-pdf-unsigned">
            <div className="brief-pdf-sig-box">ลายเซ็นลูกค้า</div>
            <div className="brief-pdf-sig-box">ลายเซ็นฟรีแลนซ์</div>
          </div>
        )}
      </section>

      <footer className="brief-pdf-footer">
        <span>{brandName}</span>
        <span className="brief-pdf-footer-rule" />
        <span>
          {[o.email, o.phone, o.social_link].filter(Boolean).join(" · ") || "Project Brief"}
        </span>
      </footer>

      {docTheme.showSo1oBadge && (
        <p className="brief-pdf-powered">สร้างด้วย So1o Freelancer · solofreelancer.com</p>
      )}
    </div>
  );
});
