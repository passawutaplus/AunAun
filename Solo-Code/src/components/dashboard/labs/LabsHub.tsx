import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Palette, FileText, ArrowRight } from "lucide-react";

const CARDS = [
  {
    to: "/labs/creative" as const,
    title: "ครีเอทีฟ",
    desc: "สี · ฟอนต์ · ส่งเข้า Smart Brief",
    bullets: ["เลือกสีและพาเลท", "ส่งออกไป Figma / Adobe", "ส่งฟอนต์เข้าบรีฟ"],
    icon: Palette,
    accent: "from-primary/15 to-transparent",
  },
  {
    to: "/labs/doc" as const,
    title: "เอกสาร",
    desc: "จัด PDF/รูปก่อนส่งลูกค้า — ไม่เกี่ยวภาษี",
    bullets: ["รวม/แยก PDF", "watermark preview", "ส่งต่อชุดส่งลูกค้า"],
    icon: FileText,
    accent: "from-slate-500/10 to-transparent",
  },
];

export function LabsHub() {
  return (
    <div className="space-y-6">
      <div className="text-center max-w-lg mx-auto space-y-2">
        <h2 className="text-lg font-bold tracking-tight">เลือกหมวด Labs</h2>
        <p className="text-sm text-muted-foreground">
          เครื่องมือเสริมหลังบ้าน — งานหลักอยู่ที่ Dashboard · ภาษีอยู่แท็บภาษี
        </p>
        <Link to="/help/labs" className="text-xs text-primary font-medium hover:underline">
          อ่านคู่มือ Labs
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.to} to={c.to} className="block group">
              <Card
                className={`p-5 sm:p-6 glass h-full hover:border-primary/40 transition-colors relative overflow-hidden`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${c.accent} pointer-events-none`}
                />
                <div className="relative space-y-3">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.desc}</p>
                    <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                      {c.bullets.map((b) => (
                        <li key={b}>• {b}</li>
                      ))}
                    </ul>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                    เข้าใช้งาน{" "}
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
