import { Link } from "react-router-dom";
import { Briefcase, Check, Eye, ShieldCheck, Wallet } from "lucide-react";
import Footer from "@/components/Footer";
import SeoHead from "@/components/SeoHead";
import { FadeUp } from "@/components/motion/FadeUp";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyKycRequests } from "@/hooks/useKyc";
import { useAuthDialog } from "@/stores/authDialogStore";
import { BRAND_NAME } from "@/lib/brandConfig";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: Eye,
    title: "สมัครแล้วใช้ได้ทันที",
    body: "ดูผลงาน ลงพอร์ต และคอลแลปได้เลย — ยังไม่ต้องยืนยันตัวตน",
  },
  {
    icon: ShieldCheck,
    title: "เปิดกระเป๋ารับทรัพย์",
    body: "ยืนยันตัวตน + ข้อมูลการเงิน (บัตรประชาชนและบัญชีธนาคาร) ครั้งเดียว เหมือนเปิดกระเป๋ารับเงินค่าจ้าง",
  },
  {
    icon: Wallet,
    title: "รับจ้างและรับเงินได้",
    body: "หลังผ่านการยืนยันแล้ว จึงรับคำขอจ้างจากผลงาน และรับเงินผ่าน Omise ได้ — ค่าจ้างแยกจาก PX",
  },
] as const;

const WITHOUT_VERIFY = ["ดู / สำรวจผลงาน", "ลงผลงานและพอร์ตโฟลิโอ", "คอลแลปและคุยโอกาสทั่วไป"] as const;
const WITH_VERIFY = ["รับคำขอจ้างจากผลงาน", "ยืนยันตัวตนและบัญชีรับเงิน", "รับค่าจ้างผ่าน Omise"] as const;

/**
 * Landing: explain that signup ≠ paid hire — KYC opens the payout wallet.
 */
export default function HireStartPage() {
  const { user } = useAuth();
  const openSignup = useAuthDialog((s) => s.openSignup);
  const { data: profile } = useProfile(user?.id);
  const { data: requests = [] } = useMyKycRequests();

  const isVerified = !!(profile as { is_verified?: boolean } | null)?.is_verified;
  const kycPending = requests.some((r) => r.status === "pending");

  const primaryCta = (() => {
    if (!user) {
      return (
        <Button
          type="button"
          size="lg"
          className="rounded-full bg-gradient-brand px-8 text-white hover:opacity-90"
          onClick={() => openSignup("/hire/start")}
        >
          สมัครแล้วเปิดกระเป๋ารับทรัพย์
        </Button>
      );
    }
    if (isVerified) {
      return (
        <Button asChild size="lg" className="rounded-full bg-gradient-brand px-8 text-white hover:opacity-90">
          <Link to="/portfolio">ไปเปิดรับจ้างบนผลงาน</Link>
        </Button>
      );
    }
    if (kycPending) {
      return (
        <Button asChild size="lg" className="rounded-full bg-gradient-brand px-8 text-white hover:opacity-90">
          <Link to="/verify">ดูสถานะการยืนยันตัวตน</Link>
        </Button>
      );
    }
    return (
      <Button asChild size="lg" className="rounded-full bg-gradient-brand px-8 text-white hover:opacity-90">
        <Link to="/verify">ลงทะเบียน · ยืนยันตัวตน</Link>
      </Button>
    );
  })();

  return (
    <main className={cn("min-h-screen bg-app-ambient", MOBILE_PAGE_BOTTOM_CLASS)}>
      <SeoHead
        path="/hire/start"
        title={`Become a Creator · ${BRAND_NAME}`}
        description="สมัครอย่างเดียวยังรับงานเงินไม่ได้ — ต้องยืนยันตัวตนและข้อมูลการเงินก่อน เหมือนเปิดกระเป๋ารับทรัพย์"
      />

      <section className="relative overflow-hidden border-b border-border/40">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-brand-radial opacity-45"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-4 pb-14 pt-6 sm:px-6 sm:pb-20 sm:pt-8">
          <BackButton className="mb-8" />
          <FadeUp>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Become a Creator
            </p>
            <h1 className="thai-display mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              เปิดกระเป๋ารับทรัพย์
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground thai-body sm:text-lg">
              หน้านี้คือการลงทะเบียนรับจ้าง — ยืนยันตัวตนและข้อมูลการเงินก่อน จึงจะรับงานเงินได้
              สมัครบัญชีอย่างเดียวยังไม่พอ
            </p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              ถ้ายังไม่ลงทะเบียน คุณยังดูงาน ลงผลงาน และคอลแลปได้ตามปกติ — แต่ยังรับคำขอจ้างและรับเงินไม่ได้
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {primaryCta}
              {!isVerified && !kycPending ? (
                <p className="text-xs text-muted-foreground">ใช้เวลาไม่นาน · ไม่บังคับ Welcome Bonus ก่อน</p>
              ) : null}
            </div>
            {isVerified ? (
              <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
                <Check className="h-4 w-4" aria-hidden />
                ยืนยันตัวตนแล้ว — พร้อมเปิดรับจ้างบนผลงาน
              </p>
            ) : null}
            {kycPending && !isVerified ? (
              <p className="mt-4 text-sm text-amber-700">ทีมกำลังตรวจ KYC ของคุณ · รอผล 1–3 วันทำการ</p>
            ) : null}
          </FadeUp>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-14">
        <FadeUp>
          <h2 className="thai-display text-2xl font-semibold tracking-tight sm:text-3xl">
            ต่างกันยังไง
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            สมัคร = ใช้งานชุมชนได้ · ลงทะเบียนยืนยันตัวตน = เปิดรับงานเงิน
          </p>
        </FadeUp>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <FadeUp>
            <div className="h-full rounded-2xl border border-border/60 bg-background/50 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden />
                ยังไม่ยืนยันตัวตน
              </div>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {WITHOUT_VERIFY.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-muted-foreground/60" aria-hidden>
                      ·
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">ยังรับงานจ้างและรับเงินไม่ได้</p>
            </div>
          </FadeUp>
          <FadeUp delay={0.05}>
            <div className="h-full rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Wallet className="h-4 w-4 text-primary" aria-hidden />
                หลังยืนยันตัวตนแล้ว
              </div>
              <ul className="mt-4 space-y-2 text-sm text-foreground/90">
                {WITH_VERIFY.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">เหมือนเปิดกระเป๋ารับทรัพย์บน {BRAND_NAME}</p>
            </div>
          </FadeUp>
        </div>
      </section>

      <section className="border-y border-border/40 bg-background/40">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
          <FadeUp>
            <h2 className="thai-display text-2xl font-semibold tracking-tight sm:text-3xl">
              ขั้นตอนสั้นๆ
            </h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              จากใช้งานทั่วไป → เปิดกระเป๋ารับทรัพย์ → รับจ้างจากผลงานจริง
            </p>
          </FadeUp>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <FadeUp key={step.title} delay={i * 0.06}>
                  <li>
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-brand-soft text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <p className="mt-4 text-xs font-semibold tracking-widest text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-2 text-lg font-medium text-foreground">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  </li>
                </FadeUp>
              );
            })}
          </ol>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-16">
          <FadeUp>
            <h2 className="thai-display text-2xl font-semibold tracking-tight sm:text-3xl">
              พร้อมเปิดกระเป๋ารับทรัพย์?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              ยืนยันตัวตนและข้อมูลการเงินก่อน — แล้วค่อยรับงานจ้างจากผลงานได้
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{primaryCta}</div>
          </FadeUp>
        </div>
      </section>

      <Footer />
    </main>
  );
}
