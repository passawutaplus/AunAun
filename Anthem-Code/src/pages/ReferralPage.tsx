import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Copy, Gift, Share2, Sparkles, UserPlus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useReferralDashboard } from "@/hooks/useReferral";
import { formatThaiDate } from "@/lib/format";
import SeoHead from "@/components/SeoHead";

export default function ReferralPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useReferralDashboard();
  const referralLink = useMemo(
    () => data?.code && typeof window !== "undefined" ? `${window.location.origin}/?ref=${data.code}` : "",
    [data?.code],
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("คัดลอกลิงก์ชวนเพื่อนแล้ว");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ กรุณาเลือกและคัดลอกลิงก์ด้วยตนเอง");
    }
  };

  const shareLink = async () => {
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({
        title: "มาสร้างผลงานบน Pixel100",
        text: `สมัครผ่านลิงก์นี้ รับ ${data?.signup_reward_px ?? 20} px เริ่มต้น`,
        url: referralLink,
      });
    } catch {
      /* User cancelled the native share sheet. */
    }
  };

  return (
    <div className="min-h-screen bg-app-ambient">
      <SeoHead title="ชวนเพื่อนรับ Pixel" path="/referrals" noindex />
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <button type="button" onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> กลับ
          </button>
          <h1 className="text-sm font-semibold">ชวนเพื่อนรับ Pixel</h1>
          <span className="w-12" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 pb-24">
        <section className="border-b border-border pb-7">
          <p className="text-xs font-semibold uppercase text-primary">รับรางวัลตามผลงาน</p>
          <h2 className="mt-2 text-3xl font-semibold">ชวนเพื่อนมาสร้างผลงาน รับ 50 px</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            คุณจะได้รับรางวัลเมื่อเพื่อนสมัครผ่านลิงก์และเผยแพร่ผลงานหรือโพสต์ Community ครั้งแรกสำเร็จ
          </p>
        </section>

        {isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">กำลังเตรียมลิงก์ของคุณ...</p>
        ) : error || !data ? (
          <p className="py-12 text-center text-sm text-destructive">โหลดข้อมูลชวนเพื่อนไม่สำเร็จ — ลองรีเฟรชหรือเข้าสู่ระบบใหม่</p>
        ) : (
          <>
            <section className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Share2 className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">ลิงก์ชวนเพื่อนของคุณ</p>
                  <p className="mt-1 break-all text-xs text-muted-foreground">{referralLink}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" onClick={copyLink} variant="outline" className="gap-2">
                      <Copy className="h-4 w-4" /> คัดลอก
                    </Button>
                    <Button type="button" onClick={shareLink} className="gap-2">
                      <Share2 className="h-4 w-4" /> แชร์ลิงก์
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat icon={UserPlus} label="สมัครผ่านลิงก์" value={data.invited_count} unit="คน" />
              <Stat icon={CheckCircle2} label="ทำภารกิจสำเร็จ" value={data.qualified_count} unit="คน" />
              <Stat icon={Wallet} label="รายได้จากการชวน" value={data.earned_px} unit="px" />
            </section>

            <section className="rounded-lg border border-border p-5">
              <h3 className="text-base font-semibold">รางวัลทำงานอย่างไร</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <RewardStep icon={Gift} title={`เพื่อนรับ ${data.signup_reward_px} px`}
                  description="ได้รับเป็น Welcome Pixel หลังยืนยันบัญชีและสมัครผ่านลิงก์" />
                <RewardStep icon={Sparkles} title={`เพื่อนรับอีก ${data.activation_reward_px} px`}
                  description="เมื่อเผยแพร่ผลงานหรือโพสต์ Community ครั้งแรก" />
                <RewardStep icon={Wallet} title={`คุณรับ ${data.referrer_reward_px} px`}
                  description="เป็น earned Pixel ที่รวมถอนได้เมื่อยอดถึง 1,000 px" />
              </div>
            </section>

            {data.my_referral_status && (
              <section className="rounded-lg border border-primary/25 bg-primary/5 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">ภารกิจจากคำเชิญของคุณ</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      สมัครแล้วรับ {data.my_signup_reward_px} px และรับเพิ่มเมื่อเผยแพร่ครั้งแรก
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {data.my_referral_status === "qualified" ? "สำเร็จแล้ว" : "กำลังทำ"}
                  </span>
                </div>
                <Progress value={data.my_referral_status === "qualified" ? 100 : 50} className="mt-4 h-2" />
                {data.my_referral_status !== "qualified" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" onClick={() => navigate("/portfolio/new")}>ลงผลงานครั้งแรก</Button>
                    <Button type="button" variant="outline" onClick={() => navigate("/community/new")}>
                      เขียนโพสต์ Community
                    </Button>
                  </div>
                )}
              </section>
            )}

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">เพื่อนที่คุณชวน</h3>
                <span className="text-xs text-muted-foreground">ล่าสุด 20 คน</span>
              </div>
              {data.recent.length === 0 ? (
                <div className="border-y border-border py-10 text-center text-sm text-muted-foreground">
                  ยังไม่มีผู้สมัครผ่านลิงก์ของคุณ
                </div>
              ) : (
                <div className="divide-y divide-border border-y border-border">
                  {data.recent.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.display_name}</p>
                        <p className="text-xs text-muted-foreground">สมัคร {formatThaiDate(item.registered_at)}</p>
                      </div>
                      <span className={item.status === "qualified" ? "text-sm text-primary" : "text-sm text-muted-foreground"}>
                        {item.status === "qualified" ? `รับแล้ว +${data.referrer_reward_px} px` : "รอภารกิจแรก"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <p className="text-xs leading-relaxed text-muted-foreground">
              รางวัลสมาชิกใหม่เป็น Welcome Pixel ใช้ภายในระบบและถอนไม่ได้
              รางวัลคนชวนเป็น earned Pixel ถอนรวมได้เมื่อยอด earned ถึงขั้นต่ำ 1,000 px
              บัญชีซ้ำ การชวนตัวเอง หรือกิจกรรมที่เข้าข่ายทุจริตอาจถูกระงับรางวัล
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, unit }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {value.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}

function RewardStep({ icon: Icon, title, description }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div>
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-2 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
