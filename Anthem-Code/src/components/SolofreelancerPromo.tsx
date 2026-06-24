import { ArrowUpRight, Users, FileText, Wallet, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoMark from "@/assets/so1o-logo-mark.png";

const SOLO_URL = "https://solofreelancer.com";

const features = [
  { icon: Users, label: "จัดการลูกค้า" },
  { icon: FileText, label: "ใบเสนอราคา & ใบแจ้งหนี้" },
  { icon: BarChart3, label: "แทร็กโปรเจกต์" },
  { icon: Wallet, label: "รับเงินอัตโนมัติ" },
];

const SolofreelancerPromo = () => {
  const open = () => window.open(SOLO_URL, "_blank", "noopener,noreferrer");

  return (
    <section
      aria-label="Solo Freelancer"
      className="relative overflow-hidden rounded-3xl border border-border bg-card/60 backdrop-blur-md shadow-sm"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

      <div className="relative grid md:grid-cols-5 gap-6 p-6 md:p-8">
        <div className="md:col-span-3 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-background border border-border flex items-center justify-center overflow-hidden shadow-sm">
              <img src={logoMark} alt="So1o" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-widest text-primary uppercase">Solo Freelancer</p>
              <p className="text-xs text-muted-foreground">ระบบจัดการงานสำหรับฟรีแลนซ์</p>
            </div>
          </div>

          <div>
            <h2 className="text-xl md:text-2xl font-medium text-foreground leading-snug">
              จัดการงานฟรีแลนซ์ <span className="text-primary">ครบจบที่เดียว</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              ลูกค้า ใบเสนอราคา ใบแจ้งหนี้ แทร็กความคืบหน้า และรับเงิน — ทุกอย่างในแดชบอร์ดเดียว
              ออกแบบมาเพื่อฟรีแลนซ์ไทยโดยเฉพาะ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={open}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full h-10 px-5 gap-1"
            >
              เปิด solofreelancer.com
              <ArrowUpRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={open}
              className="rounded-full h-10 px-5"
            >
              ดูฟีเจอร์ทั้งหมด
            </Button>
          </div>
        </div>

        <div className="md:col-span-2 grid grid-cols-2 gap-2.5 content-center">
          {features.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 rounded-2xl border border-border bg-background/70 backdrop-blur px-3 py-2.5"
            >
              <div className="text-primary flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" strokeWidth={2.25} />
              </div>
              <span className="text-xs font-medium text-foreground leading-tight">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SolofreelancerPromo;
