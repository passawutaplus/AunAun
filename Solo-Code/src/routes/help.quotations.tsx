import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, FileText, Mail, Receipt, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HelpLayout } from "@/components/help/HelpLayout";
import { helpGuideHead } from "@/lib/helpSeo";

export const Route = createFileRoute("/help/quotations")({
  head: () => helpGuideHead("/help/quotations"),
  component: QuotationsHelpPage,
});

const STEPS = [
  {
    icon: FileText,
    title: "สร้างใบเสนอราคา (QT)",
    body: "จาก Pipeline หรือ Quotation — ใส่รายการงาน ราคา มัดจำ VAT/WHT แล้วบันทึก ระบบสร้างเลขที่เอกสารอัตโนมัติ",
    tip: "เลือกลูกค้าจาก CRM ก่อน — อีเมลและชื่อจะ prefill ให้",
  },
  {
    icon: Send,
    title: "ส่งให้ลูกค้า",
    body: "สร้าง Job Tracker แล้วกด «ส่งอีเมลใบเสนอราคา» — ลูกค้าได้ลิงก์ `/track/:token` พร้อม PDF และปุ่มยอมรับ",
    tip: "ลูกค้ายอมรับจากลิงก์เดียว ไม่ต้องพิมพ์ตอบกลับ",
  },
  {
    icon: Receipt,
    title: "ใบแจ้งหนี้ & ใบเสร็จ (INV / RC)",
    body: "หลังงานเสร็จหรือรับชำระครบ — ออก INV จาก QT ที่ยอมรับแล้ว และ RC เมื่อบันทึกรายได้",
    tip: "เอกสารใช้ธีมสีจาก Settings → ธีมเอกสาร & Portal",
  },
  {
    icon: Mail,
    title: "ส่งอีเมลเอกสาร",
    body: "ส่ง QT/INV/RC เป็น PDF แนบอีเมลได้จากหน้าเอกสารหรือ Job Tracker — หัวอีเมลใช้ชื่อแบรนด์ของคุณ",
    tip: "ตรวจอีเมลลูกค้าใน CRM ให้ถูกต้องก่อนส่ง",
  },
] as const;

function QuotationsHelpPage() {
  return (
    <HelpLayout
      route="/help/quotations"
      title="ใบเสนอราคา & เอกสาร"
      subtitle="QT · INV · RC · ส่งอีเมลลูกค้า"
      actions={
        <>
          <Button asChild className="flex-1">
            <Link to="/dashboard" search={{ tab: "finance", sub: "pipeline" }}>
              เปิด Pipeline
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to="/help/branding">ธีมเอกสาร</Link>
          </Button>
        </>
      }
    >
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-relaxed">
        คู่มือนี้ครอบคลุม<strong> เอกสารทางการเงิน</strong> — จากใบเสนอราคาจนถึงใบเสร็จ
        สำหรับรับชำระดู{" "}
        <Link to="/help/payments" className="text-primary hover:underline">
          คู่มือการเงิน
        </Link>
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

      <Card id="invoice">
        <CardContent className="p-5 space-y-2">
          <h2 className="text-base font-semibold">INV / RC คืออะไร?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong>INV (Invoice)</strong> — ใบแจ้งหนี้หลังลูกค้ายอมรับ QT หรืองานถึงรอบเก็บเงิน ·{" "}
            <strong>RC (Receipt)</strong> — ใบเสร็จรับเงินหลังบันทึกว่ารับชำระแล้ว
            ทั้งคู่ดึงข้อมูลจาก QT เดิม ไม่ต้องพิมพ์ซ้ำ
          </p>
        </CardContent>
      </Card>
    </HelpLayout>
  );
}
