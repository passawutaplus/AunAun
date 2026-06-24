import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  HelpCircle,
  QrCode,
  Upload,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { cn } from "@/lib/utils";
import { helpGuideHead } from "@/lib/helpSeo";

export const Route = createFileRoute("/help/payments")({
  head: () => helpGuideHead("/help/payments"),
  component: PaymentsHelpPage,
});

const COMPARE = [
  {
    label: "ใช้เมื่อ",
    qr: "ลูกค้าโอน/สแกน QR ตามเดิม",
    online: "ลูกค้าอยากจ่ายบัตรบนหน้า Track",
  },
  {
    label: "ตั้งค่าที่",
    qr: "Settings → การเงิน",
    online: "Settings → การเงิน → Stripe Connect",
  },
  {
    label: "ค่าธรรมเนียม",
    qr: "ตามธนาคาร/PromptPay ของคุณ",
    online: "ลูกค้ารับค่าธรรมเนียม card เอง",
  },
  {
    label: "ยืนยันการชำระ",
    qr: "ลูกค้าอัปสลิป → คุณตรวจ/อนุมัติ",
    online: "Stripe ยืนยันอัตโนมัติ",
  },
  {
    label: "แพ็กเกจ",
    qr: "ทุกแผน (Free ขึ้นไป)",
    online: "ทุกแผน + เชื่อม Stripe Connect",
  },
] as const;

const FAQ = [
  {
    q: "ใช้ทั้ง QR และชำระออนไลน์พร้อมกันได้ไหม?",
    a: "ได้ — บนหน้าติดตามงานลูกค้าเห็นทั้งสองช่องทาง ปิดชำระออนไลน์ชั่วคราวได้จากสวิตช์ใน Settings โดย QR/สลิปยังใช้ได้",
  },
  {
    q: "QR ต้องเป็น PromptPay เท่านั้นหรือเปล่า?",
    a: "แนะนำ QR PromptPay จากแอปธนาคาร — แต่คุณอัปโหลดรูป QR อะไรก็ได้ (เช่น QR บัญชีธนาคาร) ระบบแค่แสดงรูปให้ลูกค้าสแกน",
  },
  {
    q: "เงินเข้าบัญชีไหน?",
    a: "QR/โอน → เข้าบัญชีธนาคารที่คุณใส่ใน Settings · ชำระออนไลน์ → เข้าบัญชีที่ผูก Stripe Connect ของคุณ",
  },
  {
    q: "ลูกค้าได้ยอดงานเต็มไหม (ชำระออนไลน์)?",
    a: "ใช่ — คุณได้รับยอดมัดจำ/งวดสุดท้ายตามใบเสนอราคา ค่าธรรมเนียม card คิดเพิ่มจากลูกค้าแยกต่างหาก",
  },
] as const;

function SectionAnchor({ id, className }: { id: string; className?: string }) {
  return <div id={id} className={cn("scroll-mt-20", className)} />;
}

function PaymentsHelpPage() {
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
            <h1 className="text-sm font-semibold truncate">รับชำระจากลูกค้า</h1>
            <p className="text-[11px] text-muted-foreground">QR PromptPay vs ชำระออนไลน์</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-8">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3">
          <p className="text-sm leading-relaxed">
            So1o มี<strong> สองช่องทาง</strong> ให้ลูกค้าชำระมัดจำหรืองวดสุดท้ายบนหน้า{" "}
            <strong>Track / ติดตามงาน</strong> — ใช้แบบเดิม (QR + สลิป) หรือเพิ่มชำระบัตรออนไลน์ได้
            ไม่ต้องเลือกอย่างใดอย่างหนึ่ง
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" asChild>
              <a href="#qr">
                <QrCode className="h-3.5 w-3.5 mr-1.5" /> QR & โอน
              </a>
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <a href="#online">
                <CreditCard className="h-3.5 w-3.5 mr-1.5" /> ชำระออนไลน์
              </a>
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0 overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_1fr_1fr] text-[11px] sm:text-xs border-b bg-muted/40">
              <div className="p-3 font-semibold text-muted-foreground" />
              <div className="p-3 font-semibold text-center border-l">QR / โอน</div>
              <div className="p-3 font-semibold text-center border-l">ชำระออนไลน์</div>
            </div>
            {COMPARE.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[minmax(0,1fr)_1fr_1fr] text-[11px] sm:text-xs border-b last:border-0"
              >
                <div className="p-3 font-medium text-muted-foreground">{row.label}</div>
                <div className="p-3 text-center border-l leading-relaxed">{row.qr}</div>
                <div className="p-3 text-center border-l leading-relaxed">{row.online}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <SectionAnchor id="qr" />
        <Card className="border-emerald-500/20">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-500/10 p-2.5 shrink-0">
                <QrCode className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold">QR PromptPay & โอนเงิน (แบบเดิม)</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  วิธีที่ฟรีแลนซ์ไทยใช้กันทั่วไป — ลูกค้าโอนหรือสแกน QR แล้วส่งสลิปกลับมา
                </p>
              </div>
            </div>

            <ol className="space-y-3 text-sm">
              {[
                "ไปที่ Settings → หมวด «การเงิน» → ช่องทางการชำระเงิน (QR / โอน)",
                "ใส่ชื่อธนาคาร ชื่อบัญชี เลขบัญชี (แสดงบนใบเสนอราคา PDF ด้วย)",
                "อัปโหลดรูป QR PromptPay จากแอปธนาคาร (แนะนำ PNG ชัด ๆ)",
                "บันทึก — เมื่อสร้าง Job Tracker ลูกค้าเห็น QR + ข้อมูลโอนบนแท็บ «การเงิน»",
                "ลูกค้าอัปโหลดสลิป → คุณตรวจใน My Desk แล้วกดยืนยันมัดจำ/งวดสุดท้าย",
              ].map((step, i) => (
                <li key={step} className="flex gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-700">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>

            <div className="rounded-xl bg-muted/40 p-3 text-xs space-y-1.5">
              <p className="font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> ข้อดี
              </p>
              <ul className="text-muted-foreground space-y-1 list-disc pl-4">
                <li>ไม่ต้องสมัคร Stripe — ใช้ได้ตั้งแต่แผน Free</li>
                <li>ลูกค้าคุ้นเคย PromptPay / โอนธนาคาร</li>
                <li>เงินเข้าบัญชีคุณโดยตรง ไม่ผ่านแพลตฟอร์ม</li>
              </ul>
            </div>

            <Button asChild size="sm">
              <Link to="/dashboard" search={{ tab: "settings" }} hash="payment-settings">
                เปิด Settings — ตั้ง QR & บัญชี
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <SectionAnchor id="online" />
        <Card className="border-primary/25">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">ชำระออนไลน์ (Stripe Connect)</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  ลูกค้าจ่ายบัตรบนหน้า Track — ระบบยืนยันอัตโนมัติ คุณได้ยอดงานเต็ม
                </p>
              </div>
            </div>

            <ol className="space-y-3 text-sm">
              {[
                "Settings → หมวด «การเงิน» → «รับชำระออนไลน์จากลูกค้า» → กดเชื่อม Stripe Connect (ครั้งแรก)",
                "กรอกข้อมูล KYC ตาม Stripe — รอสถานะ «พร้อมรับชำระออนไลน์»",
                "เปิดสวิตช์ «แสดงช่องทางชำระออนไลน์ให้ลูกค้า»",
                "ลูกค้าเปิดลิงก์ Track → แท็บการเงิน → «ดูรายละเอียดและชำระ» ด้วยบัตร",
                "ชำระสำเร็จ → มัดจำ/งวดสุดท้ายอัปเดตอัตโนมัติ (ไม่ต้องตรวจสลิป)",
              ].map((step, i) => (
                <li key={step} className="flex gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>

            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border p-3 space-y-1">
                <p className="font-medium flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-primary" /> เงินเข้าไหน
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  เข้าบัญชีที่ผูก Stripe Connect ของคุณ — แยกจากบัญชี QR ใน Settings ได้
                </p>
              </div>
              <div className="rounded-xl border p-3 space-y-1">
                <p className="font-medium flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-primary" /> ค่าธรรมเนียม
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  ลูกค้าเห็นยอดงาน + ค่าธรรมเนียม card แยกก่อนจ่าย — คุณได้ยอดตามใบเสนอราคา
                </p>
              </div>
            </div>

            <Button asChild size="sm">
              <Link to="/dashboard" search={{ tab: "settings" }} hash="stripe-connect">
                เปิด Settings — เชื่อม Stripe
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            คำถามที่พบบ่อย
          </h2>
          <div className="space-y-2">
            {FAQ.map((item) => (
              <Card key={item.q}>
                <CardContent className="p-4">
                  <p className="text-sm font-medium">{item.q}</p>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button asChild className="flex-1">
            <Link to="/dashboard" search={{ tab: "settings" }}>
              <Upload className="h-4 w-4 mr-1.5" />
              ไปตั้งค่าใน My Desk
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to="/help/getting-started">คู่มือเริ่มต้นใช้งาน</Link>
          </Button>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
