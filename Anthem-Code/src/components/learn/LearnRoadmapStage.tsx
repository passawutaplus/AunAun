import { Box, Briefcase, FileText, Gift, MessagesSquare, Wallet, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import PackagesIcon from "@/components/icons/PackagesIcon";
import { useOpenFeedbackTicket } from "@/hooks/useOpenFeedbackTicket";

type RoadmapItem = { en: string; th: string; body: string; icon: LucideIcon | typeof PackagesIcon };

/** Features built but switched off for the free Beta. No dates on purpose — order follows feedback. */
const ROADMAP: RoadmapItem[] = [
  {
    en: "Job Board",
    th: "บอร์ดงาน",
    body: "แบรนด์และทีมประกาศหาครีเอเตอร์ แล้วเลือกคนจากผลงานจริง ไม่ใช่จากเรซูเม่",
    icon: Briefcase,
  },
  {
    en: "Packages",
    th: "แพ็กเกจบริการ",
    body: "ตั้งขอบเขตงาน ระยะเวลา และราคาไว้ล่วงหน้า ให้คนที่สนใจเริ่มคุยได้ทันที",
    icon: PackagesIcon,
  },
  {
    en: "Objects",
    th: "ร้านของครีเอเตอร์",
    body: "ขายงานพิมพ์ สินค้า และงานทำมือ ต่อจากผลงานบนโปรไฟล์ของคุณ",
    icon: Box,
  },
  {
    en: "Wallet & Payouts",
    th: "การเงิน",
    body: "รับค่าจ้างผ่านระบบ ถอนเข้าบัญชี และดูธุรกรรมทั้งหมดในที่เดียว",
    icon: Wallet,
  },
  {
    en: "Contracts & Tax",
    th: "สัญญาและเอกสารภาษี",
    body: "สร้างสัญญาจ้าง ใบเสร็จ และหนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ) จากงานจ้างได้เลย",
    icon: FileText,
  },
  {
    en: "Support",
    th: "ส่งกำลังใจ",
    body: "ส่งของขวัญให้ครีเอเตอร์ที่ชอบ เพื่อบอกว่างานของเขามีคนเห็น",
    icon: Gift,
  },
  {
    en: "Community",
    th: "ชุมชน",
    body: "พื้นที่พูดคุย แลกความรู้ และหาเพื่อนร่วมงานในวงการสร้างสรรค์",
    icon: MessagesSquare,
  },
];

/** Bottom of Get in Touch — what is coming after the Beta. */
export function LearnRoadmapStage() {
  const openFeedback = useOpenFeedbackTicket();

  return (
    <div className="border-t border-border bg-card">
      <div className="mx-auto max-w-[80rem] px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">✱ Coming Next</p>
            <h2 className="mt-3 font-display text-[clamp(2.2rem,5vw,4rem)] font-light leading-[1.05] tracking-[-0.02em] text-foreground">
              What we are building
            </h2>
            <p className="mt-3 text-lg font-medium text-foreground">ฟีเจอร์ที่กำลังจะเปิด</p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              ช่วง Beta เราเปิดเฉพาะการลงผลงาน การค้นพบ และการเชื่อมต่อ ฟีเจอร์ด้านล่างสร้างไว้แล้ว และจะทยอยเปิดหลังทดสอบกับผู้ใช้
              ลำดับอาจเปลี่ยนตามฟีดแบ็กของคุณ
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-5">
            <button
              type="button"
              onClick={() => openFeedback({ kind: "idea" })}
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              เสนอไอเดีย
            </button>
            <Link
              to="/changelog"
              className="inline-flex min-h-11 items-center text-sm font-medium text-foreground underline decoration-brand decoration-2 underline-offset-4 hover:decoration-foreground"
            >
              ดูอัปเดตล่าสุด
            </Link>
          </div>
        </div>

        <ul className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {ROADMAP.map(({ en, th, body, icon: Icon }) => (
            <li key={en} className="flex flex-col bg-card p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand" aria-hidden>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  กำลังพัฒนา
                </span>
              </div>
              <p className="mt-5 font-display text-xl font-light tracking-[-0.01em] text-foreground">{en}</p>
              <p className="mt-1 text-sm font-medium text-foreground">{th}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
