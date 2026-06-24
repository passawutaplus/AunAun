import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, LayoutGrid } from "lucide-react";
import { ANTHEM_SHOWCASE_URL } from "@/lib/productLinks";
import { FadeUp } from "@/components/motion/FadeUp";

type Props = { user: boolean };

export function LandingShowcase({ user }: Props) {
  return (
    <section id="showcase" className="mx-auto max-w-6xl px-4 pb-14 sm:pb-20">
      <FadeUp>
        <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-10 shadow-soft">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8">
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                <LayoutGrid className="h-3 w-3" /> ผลิตภัณฑ์แยกในระบบ So1o
              </div>
              <h3 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight">
                ฟีดผลงานชุมชนฟรีแลนซ์
                <span className="text-muted-foreground font-semibold"> สไตล์ Pinterest</span>
              </h3>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
                <strong className="text-foreground font-medium">Pixel100</strong>{" "}
                คือแพลตฟอร์มโชว์เคสและค้นพบผลงานของครีเอทีฟ — ไม่ได้อยู่ใน My Desk แต่เชื่อมกับ
                ecosystem เดียวกัน
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                So1o Freelancer = หลังบ้านงาน · Pixel100 = หน้าร้านโชว์ผลงาน
              </p>
            </div>
            <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3">
              <a
                href={ANTHEM_SHOWCASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-6 py-3 text-sm font-semibold shadow-elevated hover:opacity-90 transition-opacity"
              >
                เปิด Pixel100 Showcase
                <ExternalLink className="h-4 w-4" />
              </a>
              <Link
                to={user ? "/dashboard" : "/apply"}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold hover:bg-muted/50 transition-colors"
              >
                ไปหลังบ้าน My Desk
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </FadeUp>
    </section>
  );
}
