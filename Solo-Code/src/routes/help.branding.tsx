import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Eye, Palette, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HelpLayout } from "@/components/help/HelpLayout";
import { helpGuideHead } from "@/lib/helpSeo";

export const Route = createFileRoute("/help/branding")({
  head: () => helpGuideHead("/help/branding"),
  component: BrandingHelpPage,
});

const SECTIONS = [
  {
    icon: Palette,
    title: "ธีมเอกสาร (PDF)",
    body: "Settings → ธีมเอกสาร & Portal — เลือกสีหลัก/รอง ฟอนต์ และโลโก้บน QT/INV/RC ที่ส่งให้ลูกค้า",
    tip: "Preview ด้านล่างฟอร์มแสดงตัวอย่าง PDF ก่อนบันทึก",
  },
  {
    icon: Eye,
    title: "Portal ลูกค้า (Track / Brief)",
    body: "หน้า `/track/:token` และ `/brief/:token` ใช้สีแบรนด์ของคุณ — เปิด «ใช้สีเดียวกับเอกสาร» หรือกำหนดสี Portal แยก",
    tip: "ลูกค้าเห็นแบรนด์คุณ ไม่ใช่หน้า generic",
  },
  {
    icon: Sparkles,
    title: "White-label (Pro)",
    body: "แพ็ก Pro ขึ้นไป — ปิด badge So1o และ «Powered by» บนเอกสาร/Portal ได้จากสวิตช์ใน Settings",
    tip: "Free ยังมี badge เล็ก ๆ — อัพเกรด Pro ถ้าต้องการแบรนด์เต็มรูปแบบ",
  },
] as const;

function BrandingHelpPage() {
  return (
    <HelpLayout
      route="/help/branding"
      title="ธีมเอกสาร & Portal"
      subtitle="PDF · หน้า Track/Brief · white-label"
      actions={
        <>
          <Button asChild className="flex-1">
            <Link to="/dashboard" search={{ tab: "settings" }}>
              เปิด Settings
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to="/help/plans">แพ็ก Pro</Link>
          </Button>
        </>
      }
    >
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-relaxed">
        ตั้งค่าใน <strong>Settings → ธีมเอกสาร & Portal</strong> (section หุบได้ใต้โปรไฟล์ร้าน)
        โลโก้และชื่อร้านมาจากโปรไฟล์ร้านด้านบน
      </div>

      {SECTIONS.map((section) => {
        const Icon = section.icon;
        return (
          <Card key={section.title}>
            <CardContent className="p-5 flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold">{section.title}</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{section.body}</p>
                <p className="text-[11px] text-muted-foreground mt-2 flex items-start gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600" />
                  {section.tip}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </HelpLayout>
  );
}
