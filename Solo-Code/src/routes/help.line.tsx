import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CheckCircle2, Link2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HelpLayout } from "@/components/help/HelpLayout";
import { helpGuideHead } from "@/lib/helpSeo";

export const Route = createFileRoute("/help/line")({
  head: () => helpGuideHead("/help/line"),
  component: LineHelpPage,
});

const STEPS = [
  {
    icon: Settings,
    title: "เปิด Settings → LINE",
    body: "ใน My Desk ไปที่ Settings แล้วเลื่อนถึงหมวด LINE — กดเชื่อมต่อและทำตามขั้นตอน OAuth",
    tip: "ต้องมี LINE Official Account (หรือใช้ช่องทางที่ระบบรองรับ)",
  },
  {
    icon: Link2,
    title: "ผูกบัญชีของคุณ",
    body: "หลัง authorize ระบบจะจำ LINE user — แจ้งเตือนจะส่งมาที่แชท LINE ของคุณ ไม่ใช่ลูกค้า",
    tip: "ลูกค้าไม่เห็น LINE ของคุณ — เป็นแจ้งเตือนส่วนตัวสำหรับฟรีแลนซ์",
  },
  {
    icon: Bell,
    title: "เหตุการการที่แจ้ง",
    body: "เช่น ลูกค้าส่งบรีฟ ยอมรับใบเสนอราคา อัปสลิป ชำระออนไลน์สำเร็จ หรืองานใกล้ครบกำหนด — ขึ้นกับแพ็กและการตั้งค่า",
    tip: "Pro ขึ้นไปมักมี LINE แจ้งเตือน — ดูรายละเอียดที่หน้าราคา",
  },
] as const;

function LineHelpPage() {
  return (
    <HelpLayout
      route="/help/line"
      title="แจ้งเตือน LINE"
      subtitle="เชื่อม OA · รับแจ้งเหตุการณ์งาน"
      actions={
        <>
          <Button asChild className="flex-1">
            <Link to="/dashboard" search={{ tab: "settings" }}>
              เปิด Settings
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to="/help/plans">แพ็กที่รองรับ LINE</Link>
          </Button>
        </>
      }
    >
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-relaxed">
        LINE ใช้<strong> แจ้งคุณ (ฟรีแลนซ์)</strong> เมื่อมีเหตุการณ์สำคัญใน My Desk
        ไม่ใช่ช่องทางส่งใบเสนอราคาให้ลูกค้า — ลูกค้าใช้ลิงก์ Track/Brief และอีเมล
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
    </HelpLayout>
  );
}
