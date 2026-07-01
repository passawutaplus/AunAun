import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FlaskConical, Palette, FileText, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { helpGuideHead } from "@/lib/helpSeo";

export const Route = createFileRoute("/help/labs")({
  head: () => helpGuideHead("/help/labs"),
  component: LabsHelpPage,
});

const SECTIONS = [
  {
    icon: Palette,
    title: "ครีเอทีฟ (Creative Labs)",
    body: "ทดลองสี ฟอนต์ พาเลท — ส่งเข้า Smart Brief หรือส่งออกเป็น ASE / Design Tokens ไป Figma และ Adobe",
    tips: [
      "ใช้ก่อนเริ่มงานกับลูกค้า ไม่แทน Figma/Canva",
      "กด「ส่งเข้าบรีฟ」เพื่อรวมสี/ฟอนต์ใน design direction",
      "ลิงก์ไฟล์ต้นฉบับเก็บในบรีฟที่「ลิงก์ไฟล์งาน」",
    ],
  },
  {
    icon: FileText,
    title: "เอกสาร (Doc Lab)",
    body: "รวม/แยก PDF ใส่ watermark ตั้งชื่อไฟล์ — ส่งต่อชุดส่งลูกค้าจากใบเสนอราคา",
    tips: [
      "Recipe「จาก Figma/Canva」เปิด watermark + ตั้งชื่อไฟล์ให้อัตโนมัติ",
      "ประมวลผลบนเครื่องคุณ ไม่เก็บไฟล์บนเซิร์ฟเวอร์",
      "ใบ 50ทวิ ไม่ทำที่นี่ — ไปแท็บภาษี",
    ],
  },
  {
    icon: Receipt,
    title: "ภาษี (แยกจาก Labs)",
    body: "ใบ 50ทวิ ชุดนักบัญชี และเครื่องมือแยกหน้า PDF อยู่ Dashboard → ภาษี เท่านั้น",
    tips: [
      "อัปโหลด 50ทวิ ในรายได้แต่ละรายการ",
      "ชุดนักบัญชีรวม CSV สรุป + ใบ 50ทวิ เป็น ZIP",
      "เอกสารเก่าที่ไม่มีไฟล์แนบ — อัปโหลดใหม่ในหน้ารายได้",
    ],
  },
];

function LabsHelpPage() {
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
            <h1 className="text-sm font-semibold truncate flex items-center gap-1.5">
              <FlaskConical className="h-4 w-4 text-primary" /> So1o Labs
            </h1>
            <p className="text-[11px] text-muted-foreground">ครีเอทีฟ · เอกสาร · ภาษีแยกหมวด</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-4">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-relaxed">
          Labs เป็น<strong> เครื่องมือเสริมหลังบ้าน</strong> — ทุกอย่างลงท้ายที่บรีฟ ใบเสนอราคา
          หรือชุดส่งลูกค้า ไม่ใช่โปรแกรมออกแบบแทน Figma
        </div>

        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.title}>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">{s.title}</h2>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.body}</p>
                  </div>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 pl-12">
                  {s.tips.map((t) => (
                    <li key={t}>• {t}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/labs">เปิด Labs</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/help/tax">คู่มือภาษี</Link>
          </Button>
        </div>
      </main>

      <SiteFooter variant="minimal" />
    </div>
  );
}
