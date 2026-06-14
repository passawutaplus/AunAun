import { RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useHubView } from "@/contexts/HubViewContext";
import { useHubMetrics, filterAlerts } from "@/hooks/useHubMetrics";
import { PageHeader } from "@/components/PageHeader";
import { AlertQueue } from "@/components/AlertQueue";
import { FlywheelStrip } from "@/components/FlywheelStrip";
import { KpiCard } from "@/components/KpiCard";
import { DeepLinks } from "@/components/DeepLinks";
import { InfraSummaryStrip } from "@/components/infra/InfraSummaryStrip";
import { FlywheelHealthScore } from "@/components/FlywheelHealthScore";
import { CrossAppSmokeSection } from "@/components/CrossAppSmokeSection";
import { anthemAdmin, so1oAdmin } from "@/lib/links";
import {
  Users,
  Crown,
  UserPlus,
  Ticket,
  Rocket,
  FileText,
  FolderKanban,
  Briefcase,
  Handshake,
  Flag,
  Wallet,
  ShieldCheck,
  Shield,
  MessageSquare,
} from "lucide-react";

type KpiDef = {
  label: string;
  hint: string;
  value: string | number;
  icon: LucideIcon;
  href: string;
  accent?: boolean;
  external?: boolean;
};

function KpiSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: KpiDef[];
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-xs text-muted">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            hint={kpi.hint}
            value={kpi.value}
            icon={kpi.icon}
            href={kpi.href}
            external={kpi.external ?? true}
            accent={kpi.accent}
          />
        ))}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { view } = useHubView();
  const { data, isLoading, isFetching, refetch, error } = useHubMetrics();
  const alerts = filterAlerts(data?.alerts ?? [], view);
  const showSo1o = view === "all" || view === "so1o";
  const showAn1hem = view === "all" || view === "an1hem";

  const so1oMembers: KpiDef[] = showSo1o
    ? [
        {
          label: "สมาชิกทั้งหมด",
          hint: "จำนวนบัญชีที่สมัครใช้ So1o — กดเพื่อเปิดหน้าจัดการสมาชิก",
          value: data?.so1o.totalUsers ?? "—",
          icon: Users,
          href: so1oAdmin("users"),
        },
        {
          label: "สมาชิก Pro",
          hint: "ผู้ใช้ที่สมัครแพ็กเกจ Pro — กดเพื่อดูรายชื่อและสถานะการชำระ",
          value: data?.so1o.proUsers ?? "—",
          icon: Crown,
          href: so1oAdmin("users"),
          accent: !!data?.so1o.proUsers,
        },
        {
          label: "สมัครใหม่ 24 ชม.",
          hint: "สมาชิกที่เพิ่งสมัครในวันนี้ — กดเพื่อตรวจสอบบัญชีใหม่",
          value: data?.so1o.newUsers24h ?? "—",
          icon: UserPlus,
          href: so1oAdmin("users"),
          accent: !!data?.so1o.newUsers24h,
        },
      ]
    : [];

  const so1oOps: KpiDef[] = showSo1o
    ? [
        {
          label: "ตั๋วซัพพอร์ตค้าง",
          hint: "คำขอความช่วยเหลือจากผู้ใช้ที่ยังไม่ปิด — กดเพื่อไปจัดการตั๋ว",
          value: data?.so1o.openTickets ?? "—",
          icon: Ticket,
          href: so1oAdmin("tickets"),
          accent: !!data?.so1o.openTickets,
        },
        {
          label: "Early Access รออนุมัติ",
          hint: "ผู้สมัครทดลองใช้ก่อนเปิดตัวที่รอการอนุมัติ",
          value: data?.so1o.earlyAccessPending ?? "—",
          icon: Rocket,
          href: so1oAdmin("early_access"),
          accent: !!data?.so1o.earlyAccessPending,
        },
        {
          label: "ใบเสนอราคา 7 วัน",
          hint: "ใบเสนอราคาที่สร้างในสัปดาห์นี้ — กดเพื่อดูรายละเอียดใน So1o Admin",
          value: data?.so1o.quotations7d ?? "—",
          icon: FileText,
          href: so1oAdmin("overview"),
        },
      ]
    : [];

  const an1hemContent: KpiDef[] = showAn1hem
    ? [
        {
          label: "ผลงานเผยแพร่แล้ว",
          hint: "โปรเจกต์บน an1hem ที่สถานะ Published — กดเพื่อดูและจัดการ",
          value: data?.an1hem.publishedProjects ?? "—",
          icon: FolderKanban,
          href: anthemAdmin("/projects"),
        },
        {
          label: "ประกาศงานเปิดรับ",
          hint: "โพสต์จ้างงานที่ยังเปิดรับสมัครอยู่",
          value: data?.an1hem.openJobs ?? "—",
          icon: Briefcase,
          href: anthemAdmin("/jobs"),
        },
        {
          label: "คำขอจ้างใหม่",
          hint: "คำขอจ้างจากลูกค้าที่ยังไม่ได้ตอบ — กดเพื่อตรวจสอบ",
          value: data?.an1hem.pendingHiring ?? "—",
          icon: Handshake,
          href: anthemAdmin("/hiring"),
          accent: !!data?.an1hem.pendingHiring,
        },
      ]
    : [];

  const an1hemSafety: KpiDef[] = showAn1hem
    ? [
        {
          label: "รายงานเนื้อหา",
          hint: "รายงานเนื้อหาที่ไม่เหมาะสมที่ยังเปิดอยู่ — กดเพื่อตรวจสอบ",
          value: data?.an1hem.openReports ?? "—",
          icon: Flag,
          href: anthemAdmin("/reports"),
          accent: !!data?.an1hem.openReports,
        },
        {
          label: "คำขอถอน Pixel",
          hint: "คำขอถอนเหรียญ Pixel ที่รออนุมัติ",
          value: data?.an1hem.pendingCashouts ?? "—",
          icon: Wallet,
          href: anthemAdmin("/gifts"),
          accent: !!data?.an1hem.pendingCashouts,
        },
        {
          label: "KYC รอตรวจ",
          hint: "เอกสารยืนยันตัวตนที่รอการตรวจสอบ",
          value: data?.an1hem.pendingKyc ?? "—",
          icon: ShieldCheck,
          href: anthemAdmin("/kyc"),
          accent: !!data?.an1hem.pendingKyc,
        },
        {
          label: "AML ที่ต้องดู",
          hint: "รายการที่ถูก flag ด้านป้องกันฟอกเงิน",
          value: data?.an1hem.openAml ?? "—",
          icon: Shield,
          href: anthemAdmin("/aml"),
          accent: !!data?.an1hem.openAml,
        },
      ]
    : [];

  const an1hemFeedback: KpiDef[] = showAn1hem
    ? [
        {
          label: "ฟีดแบ็กใหม่",
          hint: "ความคิดเห็นจากผู้ใช้ an1hem — กดเพื่ออ่านและตอบกลับ",
          value: data?.an1hem.openFeedback ?? "—",
          icon: MessageSquare,
          href: anthemAdmin("/feedback"),
          accent: !!data?.an1hem.openFeedback,
        },
        {
          label: "ดูในกล่องขาเข้า",
          hint: "รวมรายการใหม่จากทุกแอปที่ต้องจัดการใน Hub",
          value: "→",
          icon: Ticket,
          href: "/inbox",
          external: false,
        },
      ]
    : [];

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="ภาพรวม"
        subtitle="ดูสถิติสำคัญของ So1o และ an1hem ในที่เดียว — กดที่กล่องตัวเลขเพื่อเปิดหน้าจัดการ"
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg border border-border p-2 text-muted hover:text-ink"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        }
      />

      <main className="space-y-8 p-6">
        <div className="rounded-xl border border-border bg-surface/50 px-4 py-3 text-sm leading-relaxed text-muted">
          <strong className="text-ink">Ops Hub คืออะไร?</strong>{" "}
          ศูนย์รวมงานสำหรับทีมดูแลระบบ — ดูว่ามีอะไรค้างอยู่บ้าง กดไปจัดการได้ทันที
          ข้อมูลอัปเดตอัตโนมัติทุก 30 วินาที
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            โหลดข้อมูลไม่สำเร็จ ลองกดรีเฟรชอีกครั้ง
          </div>
        ) : null}

        <InfraSummaryStrip />

        <FlywheelHealthScore />

        <FlywheelStrip />

        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-ink">รายการที่ต้องดูแลด่วน</h2>
            <p className="mt-0.5 text-xs text-muted">
              สิ่งที่ควรจัดการก่อน — กดเพื่อเปิดหน้า Admin ของแอปนั้นๆ
            </p>
          </div>
          <AlertQueue alerts={alerts} />
        </section>

        {isLoading ? (
          <p className="text-sm text-muted">กำลังโหลดตัวเลข...</p>
        ) : (
          <>
            {showSo1o ? (
              <div className="space-y-6">
                <KpiSection
                  title="So1o — สมาชิก"
                  description="จำนวนผู้ใช้และการเติบโตของแพลตฟอร์ม So1o"
                  items={so1oMembers}
                />
                <KpiSection
                  title="So1o — งานค้าง & ธุรกิจ"
                  description="ตั๋วช่วยเหลือ ผู้ทดลองใช้ และใบเสนอราคา"
                  items={so1oOps}
                />
              </div>
            ) : null}

            {showAn1hem ? (
              <div className="space-y-6">
                <KpiSection
                  title="an1hem — ผลงาน & งาน"
                  description="ผลงานที่เผยแพร่ ประกาศจ้าง และคำขอจ้าง"
                  items={an1hemContent}
                />
                <KpiSection
                  title="an1hem — ความปลอดภัย & การเงิน"
                  description="รายงานเนื้อหา การถอนเงิน ยืนยันตัวตน และ AML"
                  items={an1hemSafety}
                />
                <KpiSection
                  title="an1hem — ความคิดเห็น & คิวงาน"
                  description="ฟีดแบ็กจากผู้ใช้และทางลัดไปกล่องขาเข้า"
                  items={an1hemFeedback}
                />
              </div>
            ) : null}
          </>
        )}

        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-ink">เปิดหน้า Admin แต่ละแอป</h2>
            <p className="mt-0.5 text-xs text-muted">
              ลิงก์ไปยังหน้าจัดการลึกของ So1o และ an1hem
            </p>
          </div>
          <DeepLinks view={view} />
        </section>

        <CrossAppSmokeSection />
      </main>
    </div>
  );
}
