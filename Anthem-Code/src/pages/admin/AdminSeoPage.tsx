import { CheckCircle2, CircleAlert, CircleDashed, ExternalLink } from "lucide-react";
import SectionHeader from "@/components/admin/SectionHeader";
import { cn } from "@/lib/utils";

type Status = "done" | "partial" | "missing" | "manual";

type Row = {
  area: string;
  status: Status;
  detail: string;
  href?: string;
};

const ROWS: Row[] = [
  { area: "Sitemap (+ index / ตามประเภท)", status: "done", detail: "sitemap.xml + sitemap-index.xml + sitemap-*.xml", href: "/sitemap-index.xml" },
  { area: "robots.txt", status: "done", detail: "Disallow private + Sitemap links", href: "/robots.txt" },
  { area: "Indexing / noindex", status: "done", detail: "SeoHead noindex สำหรับ private, search, thin profile, closed jobs" },
  { area: "Canonical", status: "done", detail: "absolute + strip query ผ่าน SeoHead" },
  { area: "Open Graph / Twitter", status: "done", detail: "og:* + twitter:card ทุกหน้าที่มี SeoHead" },
  { area: "Structured data", status: "done", detail: "WebSite, Organization, Person, ProfilePage, CreativeWork, JobPosting, BreadcrumbList" },
  { area: "Breadcrumb UI + schema", status: "done", detail: "SeoBreadcrumb บนโปรเจกต์ / งาน / โปรไฟล์ / สำรวจ / สตูดิโอ" },
  { area: "Job SEO", status: "done", detail: "JobDetail SeoHead + JobPosting; noindex เมื่อปิดรับ" },
  { area: "Bot meta (JS SEO)", status: "partial", detail: "middleware + /api/seo-preview สำหรับ crawler/social bots" },
  { area: "Image sitemap", status: "partial", detail: "image:image ใน sitemap เมื่อมี cover จาก live catalog" },
  { area: "GA4", status: "partial", detail: "โหลดเมื่อมี VITE_GA_MEASUREMENT_ID + consent analytics" },
  { area: "Search Console", status: "manual", detail: "Submit sitemap ใน GSC ด้วยมือ", href: "https://search.google.com/search-console" },
  { area: "hreflang / EN", status: "missing", detail: "Thai-first — ยังไม่แยกภาษา" },
  { area: "Crawlable pagination", status: "partial", detail: "explore/category landings มี; feed ยังเป็น infinite scroll" },
  { area: "SEO monitoring", status: "manual", detail: "ใช้ GSC + Lighthouse script (run-performance.mjs)" },
];

function StatusIcon({ status }: { status: Status }) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
  if (status === "partial") return <CircleDashed className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
  if (status === "manual") return <ExternalLink className="h-4 w-4 text-sky-600 dark:text-sky-400" />;
  return <CircleAlert className="h-4 w-4 text-destructive" />;
}

function label(status: Status) {
  if (status === "done") return "พร้อม";
  if (status === "partial") return "บางส่วน";
  if (status === "manual") return "ทำมือ";
  return "ยังขาด";
}

const AdminSeoPage = () => {
  const done = ROWS.filter((r) => r.status === "done").length;
  const partial = ROWS.filter((r) => r.status === "partial" || r.status === "manual").length;
  const missing = ROWS.filter((r) => r.status === "missing").length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="SEO"
        description="สถานะ SEO ของ Aplus1 — checklist สำหรับ ops / ก่อน deploy"
      />

      <div className="grid grid-cols-3 gap-3 max-w-lg">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-2xl font-semibold tabular-nums">{done}</p>
          <p className="text-xs text-muted-foreground">พร้อม</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-2xl font-semibold tabular-nums">{partial}</p>
          <p className="text-xs text-muted-foreground">บางส่วน / ทำมือ</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-2xl font-semibold tabular-nums">{missing}</p>
          <p className="text-xs text-muted-foreground">ยังขาด</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-2.5 font-medium">หมวด</th>
              <th className="px-4 py-2.5 font-medium w-28">สถานะ</th>
              <th className="px-4 py-2.5 font-medium">รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.area} className="border-t border-border/70">
                <td className="px-4 py-3 font-medium align-top">{row.area}</td>
                <td className="px-4 py-3 align-top">
                  <span className={cn("inline-flex items-center gap-1.5 text-xs")}>
                    <StatusIcon status={row.status} />
                    {label(row.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground align-top">
                  {row.href ? (
                    <a
                      href={row.href}
                      {...(row.href.startsWith("http")
                        ? { target: "_blank", rel: "noreferrer" }
                        : {})}
                      className="text-primary hover:underline"
                    >
                      {row.detail}
                    </a>
                  ) : (
                    row.detail
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        เอกสาร: <code className="text-[11px]">Anthem-Code/docs/seo-deploy.md</code> · ทดสอบ:{" "}
        <code className="text-[11px]">npm run e2e:seo</code> / <code className="text-[11px]">npm run smoke:public</code>
      </p>
    </div>
  );
};

export default AdminSeoPage;
