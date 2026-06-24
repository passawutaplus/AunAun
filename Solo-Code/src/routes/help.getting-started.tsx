import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, Users, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { helpGuideHead } from "@/lib/helpSeo";

export const Route = createFileRoute("/help/getting-started")({
  head: () => helpGuideHead("/help/getting-started"),
  component: GettingStartedPage,
});

const STEPS = [
  {
    icon: Building2,
    title: "ขั้นที่ 1 — ตั้งค่าโปรไฟล์ร้าน",
    body: "ใส่โลโก้และชื่อแบรนด์ใน Settings — ตั้งช่องทางชำระเงิน (QR/โอน) ในหมวด «การเงิน» ด้านล่าง",
    cta: { label: "เปิด Settings", tab: "settings" as const },
    tip: "โลโก้ควรเป็น PNG พื้นโปร่งใส ขนาดประมาณ 512×512 px",
  },
  {
    icon: Users,
    title: "ขั้นที่ 2 — เพิ่มลูกค้าคนแรก",
    body: "บันทึกชื่อ อีเมล และเบอร์โทรลูกค้าใน CRM — จะช่วย prefill ใบเสนอราคาและส่งอีเมลให้ลูกค้าได้โดยไม่ต้องพิมพ์ซ้ำ",
    cta: { label: "เปิด Clients", tab: "mydata" as const, sub: "clients" },
    tip: "ใส่อีเมลลูกค้าให้ครบ ถึงจะส่งใบเสนอราคาทางอีเมลได้",
  },
  {
    icon: FileText,
    title: "ขั้นที่ 3 — สร้างใบเสนอราคา / ดีล",
    body: "เริ่มจาก Pipeline หรือ Quotation — ใส่รายการงาน ราคา มัดจำ แล้วสร้าง Job Tracker เพื่อส่งลิงก์ติดตามให้ลูกค้า",
    cta: { label: "เปิด Pipeline", tab: "finance" as const, sub: "pipeline" },
    tip: "กด «ส่งอีเมลใบเสนอราคาให้ลูกค้า» หลังสร้างลิงก์ติดตาม — ลูกค้ากดยอมรับได้จากลิงก์เดียว",
  },
];

function GettingStartedPage() {
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
            <h1 className="text-sm font-semibold truncate">เริ่มต้นใช้งาน</h1>
            <p className="text-[11px] text-muted-foreground">3 ขั้นแรกหลังสมัคร</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-4">
        <div className="space-y-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Card key={step.title}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1">
                        ขั้นที่ {i + 1}
                      </p>
                      <h2 className="text-base font-semibold">{step.title}</h2>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        {step.body}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-2 flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600" />
                        {step.tip}
                      </p>
                      <Button asChild size="sm" className="mt-3">
                        <Link
                          to="/dashboard"
                          search={
                            step.cta.sub
                              ? { tab: step.cta.tab, sub: step.cta.sub }
                              : { tab: step.cta.tab }
                          }
                        >
                          {step.cta.label}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link to="/help/brief">ถัดไป: คู่มือ Smart Brief →</Link>
        </Button>
      </main>

      <SiteFooter />
    </div>
  );
}
