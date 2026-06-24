import { Globe, Smartphone } from "lucide-react";
import { HOW_IT_WORKS_STEPS } from "@/data/landingContent";
import { FadeUp } from "@/components/motion/FadeUp";

export function LandingHowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
      <FadeUp className="text-center max-w-2xl mx-auto">
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">เริ่มใน 3 ขั้นตอน</h3>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground">
          ใช้เวลาไม่ถึง 10 นาทีก็พร้อมรับงานแล้ว
        </p>
      </FadeUp>

      <FadeUp delay={0.06} className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        {HOW_IT_WORKS_STEPS.map((s) => (
          <div
            key={s.n}
            className="rounded-2xl border border-border bg-card/70 backdrop-blur p-6 shadow-soft"
          >
            <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {s.n}
            </div>
            <h4 className="mt-3 text-lg font-semibold">{s.t}</h4>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
          </div>
        ))}
      </FadeUp>

      <FadeUp delay={0.1} className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-5 shadow-soft flex items-start gap-3">
          <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-soft">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-base font-semibold">Responsive ทุกหน้าจอ</h4>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              ใช้งานได้ลื่นทั้งบนมือถือ แท็บเล็ต iPad และจอคอมพิวเตอร์
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-5 shadow-soft flex items-start gap-3">
          <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-soft">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-base font-semibold">ทำงานที่ไหนก็ได้</h4>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              เป็นโปรแกรมออนไลน์ ไม่ต้องติดตั้ง เปิดเว็บก็ใช้งานได้ทันที
            </p>
          </div>
        </div>
      </FadeUp>
    </section>
  );
}
