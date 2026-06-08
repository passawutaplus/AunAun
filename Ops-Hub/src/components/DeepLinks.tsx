import { ExternalLink, LayoutGrid, Sparkles } from "lucide-react";
import { ANTHEM_ADMIN, SO1O_ADMIN, anthemAdmin, so1oAdmin } from "@/lib/links";
import type { HubView } from "@/hooks/useHubMetrics";

type LinkItem = { label: string; hint?: string; href: string; app: "so1o" | "an1hem" };

const SO1O_LINKS: LinkItem[] = [
  { label: "ภาพรวม So1o", hint: "หน้าหลักจัดการ So1o", href: so1oAdmin("overview"), app: "so1o" },
  { label: "ตั๋ว & ฟีดแบ็ก", hint: "จัดการคำขอช่วยเหลือ", href: so1oAdmin("tickets"), app: "so1o" },
  { label: "Early Access", hint: "อนุมัติผู้ทดลองใช้", href: so1oAdmin("early_access"), app: "so1o" },
  { label: "สมาชิก", hint: "ดูและจัดการบัญชีผู้ใช้", href: so1oAdmin("users"), app: "so1o" },
  { label: "การชำระเงิน", hint: "Stripe และรายได้", href: so1oAdmin("payments"), app: "so1o" },
  { label: "ศูนย์ AI", hint: "ตั้งค่าและใช้งาน AI", href: so1oAdmin("ai_center"), app: "so1o" },
  { label: "สุขภาพระบบ", hint: "ตรวจสอบว่าระบบทำงานปกติ", href: so1oAdmin("health"), app: "so1o" },
];

const ANTHEM_LINKS: LinkItem[] = [
  { label: "ภาพรวม an1hem", hint: "หน้าหลักจัดการ an1hem", href: ANTHEM_ADMIN, app: "an1hem" },
  { label: "ผู้ใช้", hint: "บัญชีและโปรไฟล์", href: anthemAdmin("/users"), app: "an1hem" },
  { label: "ผลงาน", hint: "โปรเจกต์ที่เผยแพร่", href: anthemAdmin("/projects"), app: "an1hem" },
  { label: "งาน & จ้าง", hint: "ประกาศงานและคำขอจ้าง", href: anthemAdmin("/jobs"), app: "an1hem" },
  { label: "กระเป๋า & ของขวัญ", hint: "Pixel และการถอน", href: anthemAdmin("/gifts"), app: "an1hem" },
  { label: "KYC / AML", hint: "ยืนยันตัวตนและความปลอดภัย", href: anthemAdmin("/kyc"), app: "an1hem" },
  { label: "โฆษณา", hint: "จัดการแคมเปญโฆษณา", href: anthemAdmin("/ads"), app: "an1hem" },
  { label: "สถิติ", hint: "วิเคราะห์การใช้งาน", href: anthemAdmin("/analytics"), app: "an1hem" },
];

function LinkCard({
  title,
  description,
  icon: Icon,
  links,
  accent,
}: {
  title: string;
  description: string;
  icon: typeof LayoutGrid;
  links: LinkItem[];
  accent: "brand" | "an1hem";
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div
          className={`rounded-lg p-2 ${accent === "brand" ? "bg-brand/10 text-brand" : "bg-an1hem/10 text-an1hem"}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-[10px] text-muted">{description}</p>
        </div>
        <a
          href={accent === "brand" ? SO1O_ADMIN : ANTHEM_ADMIN}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted hover:text-ink"
        >
          เปิดทั้งหมด →
        </a>
      </div>
      <ul className="space-y-1.5">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <a
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              title={l.hint}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-surface"
            >
              {l.label}
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DeepLinks({ view }: { view: HubView }) {
  const showSo1o = view === "all" || view === "so1o";
  const showAnthem = view === "all" || view === "an1hem";

  return (
    <div className={`grid gap-4 ${view === "all" ? "md:grid-cols-2" : "grid-cols-1"}`}>
      {showSo1o && (
        <LinkCard
          title="So1o Admin"
          description="จัดการแพลตฟอร์ม So1o โดยตรง"
          icon={LayoutGrid}
          links={SO1O_LINKS}
          accent="brand"
        />
      )}
      {showAnthem && (
        <LinkCard
          title="an1hem Admin"
          description="จัดการแพลตฟอร์ม an1hem โดยตรง"
          icon={Sparkles}
          links={ANTHEM_LINKS}
          accent="an1hem"
        />
      )}
    </div>
  );
}
