import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Cpu, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HelpLayout } from "@/components/help/HelpLayout";
import { ANTHEM_SHOWCASE_URL } from "@/lib/productLinks";
import { helpGuideHead } from "@/lib/helpSeo";

export const Route = createFileRoute("/help/plans")({
  head: () => helpGuideHead("/help/plans"),
  component: PlansHelpPage,
});

const PLAN_POINTS = [
  {
    title: "Free",
    body: "เริ่มใช้ได้ทันที — Pipeline CRM ใบเสนอราคา Job Tracker QR/โอน และ Credit AI 5/วัน × 14 วัน",
  },
  {
    title: "Pro / Pro+",
    body: "white-label เอกสาร & Portal · Credit AI 5/วัน + โควต้าแพ็กมากขึ้น · storage · LINE แจ้งเตือน",
  },
  {
    title: "In-House",
    body: "สำหรับทีมหรือสตูดิโอ — โควต้าและสิทธิ์ขยายตามแพ็ก ติดต่อทีมงานสำหรับรายละเอียด",
  },
] as const;

function PlansHelpPage() {
  return (
    <HelpLayout
      route="/help/plans"
      title="แพ็กเกจ & Credit AI"
      subtitle="Free · Pro · ecosystem"
      actions={
        <>
          <Button asChild className="flex-1">
            <Link to="/pricing">ดูราคา & ตารางเปรียบเทียบ</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to="/dashboard" search={{ tab: "settings" }}>
              ดูแพ็กปัจจุบัน
            </Link>
          </Button>
        </>
      }
    >
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-relaxed">
        รายละเอียดราคาและตารางเปรียบเทียบเต็มอยู่ที่{" "}
        <Link to="/pricing" className="text-primary hover:underline">
          หน้าราคา
        </Link>{" "}
        — หน้านี้สรุปสิ่งที่ควรรู้ก่อนอัพเกรด
      </div>

      <div className="grid gap-3">
        {PLAN_POINTS.map((p) => (
          <Card key={p.title}>
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold">{p.title}</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{p.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card id="ai">
        <CardContent className="p-5 flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
            <Cpu className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Credit AI</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              ใช้กับฟีเจอร์ AI ใน My Desk — Free ได้ Credit AI 5/วัน × 14 วัน · Pro+ ได้ 5/วัน + โควต้าแพ็กต่อรอบบิล
              (ไม่ทบวันก่อน) ดูยอดคงเหลือใน Settings
            </p>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-start gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600" />
              อัพเกรด Pro ได้เครดิตและ storage เพิ่มทันทีหลังชำระ
            </p>
          </div>
        </CardContent>
      </Card>

      <Card id="ecosystem">
        <CardContent className="p-5 flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">So1o + Aplus1</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              <strong>So1o</strong> = หลังบ้านฟรีแลนซ์ (ใบเสนอราคา งาน การเงิน) ·{" "}
              <strong>Aplus1</strong> = โชว์เคสผลงานหน้าบ้าน — บัญชีเดียว สมัครครั้งเดียว
            </p>
            <p className="text-sm mt-2">
              <a
                href={ANTHEM_SHOWCASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                <Sparkles className="h-3.5 w-3.5" /> ดู Aplus1 Showcase
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </HelpLayout>
  );
}
