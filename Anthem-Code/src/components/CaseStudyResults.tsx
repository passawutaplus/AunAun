import { TrendingUp, Clock, Star, CheckCircle2 } from "lucide-react";

const metrics = [
  { icon: TrendingUp, label: "Conversion เพิ่ม", value: "+28%", color: "text-success" },
  { icon: Clock, label: "ส่งมอบภายใน", value: "14 วัน", color: "text-primary" },
  { icon: Star, label: "รีวิวจากลูกค้า", value: "5.0 ★", color: "text-yellow-500" },
  { icon: CheckCircle2, label: "ผ่าน QA", value: "100%", color: "text-primary" },
];

const steps = [
  { title: "Brief", desc: "เข้าใจโจทย์ลูกค้า + กลุ่มเป้าหมาย" },
  { title: "Research", desc: "วิเคราะห์คู่แข่ง + เทรนด์ตลาดไทย" },
  { title: "Design", desc: "ทำ moodboard, wireframe, hi-fi" },
  { title: "Delivery", desc: "ส่งไฟล์ + design system + handoff" },
];

const CaseStudyResults = () => (
  <div className="space-y-6">
    <section className="space-y-3">
      <h2 className="text-xl font-medium text-foreground">ผลลัพธ์ที่ส่งมอบ</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl glass-panel p-4">
            <m.icon className={`w-5 h-5 ${m.color}`} />
            <p className="text-2xl font-medium text-foreground mt-2">{m.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="space-y-3">
      <h2 className="text-xl font-medium text-foreground">กระบวนการทำงาน</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {steps.map((s, i) => (
          <div key={s.title} className="rounded-2xl glass-panel p-4 relative">
            <div className="w-8 h-8 rounded-full bg-primary/15 text-primary font-medium flex items-center justify-center text-sm">
              {i + 1}
            </div>
            <p className="font-semibold text-foreground mt-3">{s.title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-5">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  </div>
);

export default CaseStudyResults;
