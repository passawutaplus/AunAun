import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Coins,
  FileText,
  Receipt,
  Calculator,
  Send,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { DISCLAIMER_TAX_ACCOUNTING } from "@/lib/copyConstants";
import { helpGuideHead } from "@/lib/helpSeo";

export const Route = createFileRoute("/help/tax")({
  head: () => helpGuideHead("/help/tax"),
  component: TaxHelpPage,
});

const STEPS = [
  {
    icon: Coins,
    title: "ขั้นที่ 1 — บันทึกรายได้ทุกครั้งที่ได้เงิน",
    body: "เมื่อลูกค้าโอนเงิน ให้บันทึกยอด gross (ก่อนหัก) และอัตราหัก ณ ที่จ่าย เช่น 3% สำหรับงานบริการทั่วไป ถ้าปิด Quotation ใน So1o แล้ว สามารถซิงค์รายได้มาได้โดยไม่ต้องพิมพ์ซ้ำ",
    example: "ลูกค้า A โอน 50,000 บาท หัก 3% = 1,500 → บันทึก gross 50,000 และ WHT 1,500",
  },
  {
    icon: FileText,
    title: "ขั้นที่ 2 — เก็บใบ 50 ทวิ (หัก ณ ที่จ่าย)",
    body: "ขอใบ 50 ทวิ จากลูกค้าทุกครั้งที่มีการหัก ณ ที่จ่าย แล้วอัปโหลดใน So1o — ระบบช่วยสแกนอ่านตัวเลขให้ ใบนี้เป็นเครดิตภาษีตอนยื่นปี",
    example: "ถ่ายรูปให้เห็นเลขที่ใบ ชื่อผู้จ่าย ยอดเงินได้ และยอดภาษีชัดๆ",
  },
  {
    icon: Receipt,
    title: "ขั้นที่ 3 — บันทึกรายจ่าย / เลือกวิธีหัก",
    body: "เลือกได้ 2 แบบ: (ก) หักเหมา — ใช้สูตรกฎหมาย เช่น 40(2) 50% สูงสุด 100,000 บาท (ก) หักจริง — เก็บบิลค่าใช้จ่ายจริง เช่น ซอฟต์แวร์ อุปกรณ์ ค่าเดินทาง",
    example: "ฟรีแลนซ์ดีไซน์ส่วนใหญ่เริ่มจากหักเหมา 40(2) ก่อน แล้วค่อยเปรียบกับหักจริง",
  },
  {
    icon: Calculator,
    title: "ขั้นที่ 4 — ดูประมาณการภาษี",
    body: "So1o คำนวณเงินได้สุทธิ ภาษีประมาณการ และยอดต้องจ่าย/ขอคืนให้อัตโนมัติ ลอง «โหมดจำลอง» ถ้าอยากเทียบหลายสcenari ก่อนซื้อ RMF/SSF",
    example: "ถ้าเครดิต WHT มากกว่าภาษีที่คำนวณได้ อาจขอคืนได้",
  },
  {
    icon: Send,
    title: "ขั้นที่ 5 — ส่งชุดข้อมูลให้นักบัญชี",
    body: "กด «ส่งนักบัญชี» ในแท็บภาษี เพื่อดาวน์โหลดไฟล์สรุป + CSV รายได้ แนบใบ 50ทวิ ที่เก็บไว้ แล้วให้นักบัญชีช่วยยื่น ภงด.90/91",
    example: "Export ต้นเดือน 3–4 ของปีถัดไป ก่อนกำหนดยื่นภาษี",
  },
];

function TaxHelpPage() {
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
            <h1 className="text-sm font-semibold truncate">คู่มือภาษีฟรีแลนซ์</h1>
            <p className="text-[11px] text-muted-foreground">ทำทีละขั้น อ่านง่าย ไม่ต้องเป็น CPA</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <p className="text-sm leading-relaxed">
            คู่มือสำหรับ<strong> ฟรีแลนซ์คนเดียว</strong> — ทำตามลำดับด้านล่าง แล้วใช้ My Desk
            เก็บข้อมูลส่งนักบัญชี
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{DISCLAIMER_TAX_ACCOUNTING}</p>
        </div>

        <div className="space-y-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Card key={step.title} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex gap-0">
                    <div className="hidden sm:flex w-12 shrink-0 items-start justify-center pt-5 bg-primary/5">
                      <span className="text-lg font-bold text-primary/40">{i + 1}</span>
                    </div>
                    <div className="p-5 flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-base font-semibold leading-snug">{step.title}</h2>
                          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                            {step.body}
                          </p>
                          <div className="mt-3 rounded-lg bg-muted/50 border border-border/60 px-3 py-2">
                            <p className="text-[11px] font-medium text-foreground">ตัวอย่าง</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {step.example}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-border/60">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">กำหนดยื่นที่ควรรู้ (โดยทั่วไป)</h2>
            </div>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
              <li>
                <strong className="text-foreground">ภงด.90</strong> —
                ฟรีแลนซ์มีเงินได้จากการประกอบอาชีพ (ยื่นปีละครั้ง)
              </li>
              <li>
                <strong className="text-foreground">ภงด.91</strong> — เงินได้อื่นๆ
                นอกเหนือจากเงินเดือน (ถ้ามี)
              </li>
              <li>เก็บใบ 50ทวิ และบิลค่าใช้จ่ายตลอดปี — จะได้ไม่รีบตอนสิ้นปี</li>
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button asChild className="flex-1">
            <Link to="/dashboard" search={{ tab: "finance", sub: "tax" }}>
              เปิดแท็บภาษีใน My Desk
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to="/pricing">ดูแพ็ก Pro</Link>
          </Button>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
