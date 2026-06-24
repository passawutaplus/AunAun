import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Lightbulb,
  Link2,
  MessageSquare,
  CheckCircle2,
  Share2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { helpGuideHead } from "@/lib/helpSeo";

export const Route = createFileRoute("/help/brief")({
  head: () => helpGuideHead("/help/brief"),
  component: BriefHelpPage,
});

const STEPS = [
  {
    icon: Lightbulb,
    title: "สร้าง Smart Brief",
    body: "ไปที่ Planning → Smart Brief แล้วกรอก scope งาน ไทม์ไลน์ และรายละเอียด — AI ช่วยสรุปและจัดรูปแบบให้อ่านง่าย",
    tip: "ใส่ revision rounds ชัดๆ ลดข้อพิพาททีหลัง",
  },
  {
    icon: Link2,
    title: "ส่งลิงก์บรีฟให้ลูกค้า",
    body: "กดแชร์ลิงก์ `/brief/:token` — ลูกค้าเปิดดูได้โดยไม่ต้องล็อกอิน กดยืนยันบรีฟหรือคอมเมนต์เพิ่มได้",
    tip: "ลิงก์บรีฟแยกจาก Job Tracker — ใช้ตอนเริ่มโปรเจกต์",
  },
  {
    icon: Share2,
    title: "สร้าง Job Tracker + ใบเสนอราคา",
    body: "จาก Pipeline หรือ Quotation สร้างงานแล้วได้ลิงก์ `/track/:token` — ลูกค้าเห็นใบเสนอราคา สถานะงาน และอัปโหลดสลิปในที่เดียว",
    tip: "กด «ส่งอีเมลใบเสนอราคาให้ลูกค้า» หลังสร้างลิงก์ — ต้องมีอีเมลลูกค้าในใบเสนอราคา",
  },
  {
    icon: Wallet,
    title: "รับมัดจำและติดตามชำระ",
    body: "ลูกค้าชำระมัดจำผ่านลิงก์ track — คุณบันทึกรายได้ในแท็บ Income เมื่อได้เงินจริง ใช้ Follow-up ตามหนี้ค้างได้",
    tip: "ตั้ง due date ในใบเสนอราคา — ระบบแจ้งเตือนเมื่อใกล้ครบกำหนด",
  },
  {
    icon: MessageSquare,
    title: "Feedback rounds",
    body: "ใน Job Tracker เปิดรอบแก้ไขให้ลูกค้า comment ตรงไฟล์งาน — ลดการคุยกระจัดกระจายใน Line",
    tip: "ปิดรอบเมื่อลูกค้า approve แล้วค่อยส่งงานจริง",
  },
];

function BriefHelpPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 shrink-0">
            <Link to="/help">
              <ArrowLeft className="h-4 w-4" /> ศูนย์ช่วยเหลือ
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">Smart Brief & Job Tracker</h1>
            <p className="text-[11px] text-muted-foreground">ทำงานกับลูกค้าแบบมืออาชีพ</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-4">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-relaxed">
          คู่มือนี้สำหรับ<strong> flow ลูกค้า</strong> — จากบรีฟ → ใบเสนอราคา → ติดตามงาน → เก็บเงิน
        </div>

        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <Card key={step.title}>
              <CardContent className="p-5 flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1">
                    ขั้นที่ {i + 1}
                  </p>
                  <h2 className="text-base font-semibold">{step.title}</h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{step.body}</p>
                  <p className="text-[11px] text-muted-foreground mt-2 flex items-start gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600" />
                    {step.tip}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button asChild className="flex-1">
            <Link to="/dashboard" search={{ tab: "planner", sub: "briefs" }}>
              เปิด Smart Brief
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to="/dashboard" search={{ tab: "finance", sub: "jobs" }}>
              เปิด Job Tracker
            </Link>
          </Button>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
