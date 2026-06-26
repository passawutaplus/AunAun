import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  Flame,
  Sparkles,
  ArrowLeft,
  Loader2,
  Minus,
  Plus,
  Zap,
  Users,
  LayoutGrid,
  ExternalLink,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TierDetailsSection } from "@/components/tier/TierDetailsSection";
import type { PlanId } from "@/data/plans";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/AuthProvider";
import { useSubscription } from "@/hooks/useSubscription";
import {
  createCheckoutSession,
  createPortalSession,
  upgradeSubscriptionTier,
} from "@/utils/payments.functions";
import { buildCheckoutRedirectUrls, currentOriginReturnUrl } from "@/lib/paymentRedirect";
import { getStripeEnvironment, PRICE_IDS, CREDITS_PER_PRICE } from "@/lib/stripe";
import { isPaymentFnError, tierLabel, type UpgradeTargetTier } from "@/lib/subscriptionTiers";
import type { Tier } from "@/hooks/useSubscription";
import { PLANS, type BillingCycle as Cycle } from "@/data/plans";
import { ANTHEM_SHOWCASE_URL } from "@/lib/productLinks";
import {
  TOPUP_PACK_ANALYSIS,
  USAGE_MIX_ASSUMPTION,
  weightedCreditsPerAction,
} from "@/lib/aiCreditWeights";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "ราคา & แพ็กเกจ — So1o Freelancer" },
      {
        name: "description",
        content:
          "เลือกแพ็กเกจที่เหมาะกับคุณ — Free, Pro, Pro+, In-House และ Top-up Credits เริ่มต้น 0 บาท ฟรีตลอดชีพสำหรับ 100 คนแรกด้วยโค้ด SO1OBETA",
      },
      { property: "og:title", content: "ราคา — So1o Freelancer" },
      {
        property: "og:description",
        content:
          "อัพเกรด Pro เริ่มต้น 249฿/เดือน · Pro+ 399฿/เดือน · In-House สำหรับทีม · 100 คนแรกได้ฟรี 1 ปี",
      },
    ],
  }),
  component: PricingPage,
});

interface TopupPack {
  id: keyof typeof CREDITS_PER_PRICE;
  name: string;
  amount: number;
  credits: number;
  perUnit: string;
  badge?: string;
}

const TOPUPS: TopupPack[] = [
  {
    id: "credits_100",
    name: "Starter",
    amount: 99,
    credits: 100,
    perUnit: "≈ 0.99฿/เครดิต",
  },
  {
    id: "credits_500",
    name: "Boost",
    amount: 399,
    credits: 500,
    perUnit: "≈ 0.80฿/เครดิต",
    badge: "ยอดนิยม",
  },
  {
    id: "credits_2000",
    name: "Pro Pack",
    amount: 1290,
    credits: 2000,
    perUnit: "≈ 0.65฿/เครดิต",
    badge: "คุ้มสุด",
  },
];

const PLAN_RANK: Record<Tier | "free", number> = {
  free: 0,
  pro: 1,
  pro_plus: 2,
  inhouse: 3,
};

function isHigherPlan(current: Tier, planId: string): planId is UpgradeTargetTier {
  return PLAN_RANK[planId as Tier] > PLAN_RANK[current];
}

function formatCheckoutError(e: unknown, fallback: string): string {
  if (e instanceof Response) {
    if (e.status === 401) return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่";
    return `เกิดข้อผิดพลาด (${e.status}) — ลองใหม่อีกครั้ง`;
  }
  if (e && typeof e === "object" && "message" in e) {
    const msg = String((e as { message: unknown }).message);
    if (/unauthorized|401/i.test(msg)) return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่";
    if (msg && msg !== "[object Object]") return msg;
  }
  return fallback;
}

function PricingPage() {
  const [cycle, setCycle] = React.useState<Cycle>("yearly");
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null);
  const [seats, setSeats] = React.useState<number>(3);
  const { user } = useAuth();
  const { tier, subscription, isPro, isActive, refetch } = useSubscription();
  const navigate = useNavigate();

  const checkout = useServerFn(createCheckoutSession);
  const portal = useServerFn(createPortalSession);
  const upgradeTier = useServerFn(upgradeSubscriptionTier);

  const ensureAuth = (returnTo: string) => {
    if (user) return true;
    toast.info("กรุณาเข้าสู่ระบบก่อนสั่งซื้อ");
    navigate({ to: "/auth", search: { redirect: returnTo } as any });
    return false;
  };

  const checkoutFail = (result: unknown, fallback: string) => {
    if (isPaymentFnError(result)) return result.error;
    if (!result || typeof result !== "object" || !("url" in result)) return fallback;
    return null;
  };

  const failCheckout = (message: string) => {
    setCheckoutError(message);
    toast.error(message);
  };

  const handleCheckoutPlan = async (planId: "pro" | "pro_plus" | "inhouse") => {
    if (!ensureAuth("/pricing")) return;
    setCheckoutError(null);
    setLoadingId(planId);
    try {
      let priceId: string;
      let quantity: number | undefined;
      if (planId === "pro") {
        priceId = cycle === "monthly" ? PRICE_IDS.pro_monthly : PRICE_IDS.pro_yearly;
      } else if (planId === "pro_plus") {
        priceId = cycle === "monthly" ? PRICE_IDS.pro_plus_monthly : PRICE_IDS.pro_plus_yearly;
      } else {
        priceId = cycle === "monthly" ? PRICE_IDS.inhouse_monthly : PRICE_IDS.inhouse_yearly;
        quantity = seats;
      }
      const origin = window.location.origin;
      const result = await checkout({
        data: {
          priceId,
          quantity,
          environment: getStripeEnvironment(),
          successUrl: `${origin}/dashboard?upgrade=success`,
          cancelUrl: `${origin}/pricing?canceled=1`,
        },
      });
      const err = checkoutFail(result, "ไม่สามารถเริ่ม checkout ได้");
      if (err) throw new Error(err);
      window.location.href = (result as { url: string }).url;
    } catch (e: unknown) {
      failCheckout(formatCheckoutError(e, "ไม่สามารถเริ่ม checkout ได้"));
    } finally {
      setLoadingId(null);
    }
  };

  const handleUpgradePlan = async (targetTier: UpgradeTargetTier) => {
    if (!ensureAuth("/pricing")) return;
    setCheckoutError(null);
    setLoadingId(targetTier);
    try {
      const result = await upgradeTier({
        data: {
          environment: getStripeEnvironment(),
          targetTier,
          quantity: targetTier === "inhouse" ? seats : undefined,
        },
      });
      if (isPaymentFnError(result)) throw new Error(result.error);
      if (!result || typeof result !== "object" || !("ok" in result)) {
        throw new Error("ไม่สามารถอัปเกรดได้");
      }
      await refetch();
      toast.success(`อัปเกรดเป็น ${tierLabel(targetTier)} สำเร็จ`);
      navigate({ to: "/dashboard" });
    } catch (e: unknown) {
      failCheckout(formatCheckoutError(e, "ไม่สามารถอัปเกรดได้"));
    } finally {
      setLoadingId(null);
    }
  };

  const handleTopup = async (pack: TopupPack) => {
    if (!ensureAuth("/pricing")) return;
    setCheckoutError(null);
    setLoadingId(pack.id);
    try {
      const origin = window.location.origin;
      const params = new URLSearchParams(window.location.search);
      const { successUrl, cancelUrl } = buildCheckoutRedirectUrls({
        origin,
        returnParam: params.get("return"),
        defaultSuccessPath: "/dashboard",
        defaultCancelPath: "/pricing",
        successQuery: "topup=success",
        cancelQuery: "canceled=1",
      });
      const result = await checkout({
        data: {
          priceId: pack.id,
          environment: getStripeEnvironment(),
          successUrl,
          cancelUrl,
        },
      });
      const err = checkoutFail(result, "ไม่สามารถเริ่ม checkout ได้");
      if (err) throw new Error(err);
      window.location.href = (result as { url: string }).url;
    } catch (e: unknown) {
      failCheckout(formatCheckoutError(e, "ไม่สามารถเริ่ม checkout ได้"));
    } finally {
      setLoadingId(null);
    }
  };

  const handleManage = async () => {
    setLoadingId("manage");
    try {
      const result = await portal({
        data: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/pricing`,
        },
      });
      if (isPaymentFnError(result)) throw new Error(result.error);
      if (!result || typeof result !== "object" || !("url" in result)) {
        throw new Error("ไม่สามารถเปิดหน้าจัดการได้");
      }
      window.open((result as { url: string }).url, "_blank");
    } catch (e: unknown) {
      toast.error(formatCheckoutError(e, "ไม่สามารถเปิดหน้าจัดการได้"));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Top bar */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            to={user ? "/dashboard" : "/"}
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <ArrowLeft className="h-4 w-4" /> {user ? "กลับ Dashboard" : "กลับหน้าหลัก"}
          </Link>
          {user && (
            <span className="text-xs text-muted-foreground">
              {tier === "inhouse"
                ? "🏢 คุณคือ In-House Member"
                : tier === "pro_plus"
                  ? "✨ คุณคือ Pro+ Member"
                  : tier === "pro"
                    ? "✨ คุณคือ Pro Member"
                    : "แพ็กเกจปัจจุบัน: Free"}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16">
        {/* Beta banner */}
        <div className="mb-10 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 flex items-start gap-3 shadow-sm">
          <div className="shrink-0 rounded-xl bg-primary/15 p-2.5">
            <Flame className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-semibold tracking-tight">
              Beta Launch Special: 100 คนแรกได้ Pro ฟรี 1 ปีเต็ม! 🎉
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              ใช้โค้ด{" "}
              <code className="px-1.5 py-0.5 rounded bg-primary/15 text-primary font-mono text-[11px] sm:text-xs font-semibold">
                SO1OBETA
              </code>{" "}
              ตอน checkout (ต้องใส่บัตรเครดิตเพื่อยืนยันตัวตน · ยกเลิกได้ทุกเมื่อ)
            </p>
          </div>
        </div>

        {checkoutError && (
          <Alert variant="destructive" className="mb-8 max-w-3xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>ไม่สามารถเปิด Stripe Checkout ได้</AlertTitle>
            <AlertDescription>{checkoutError}</AlertDescription>
          </Alert>
        )}

        {/* Ecosystem — one subscription, two apps */}
        <div className="mb-10 max-w-3xl mx-auto rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-xl bg-primary/15 p-2.5">
              <LayoutGrid className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-primary">
                บัญชีเดียว · สมัครครั้งเดียว
              </p>
              <h2 className="mt-1 text-lg sm:text-xl font-bold tracking-tight">
                So1o Pro ปลดล็อกทั้งหลังบ้านและ Aplus1
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground font-medium">So1o Freelancer (My Desk)</strong>{" "}
                คือหลังบ้านสำหรับฟรีแลนซ์ — ออกใบเสนอราคา จัดการลูกค้า การเงิน บันทึกงาน Brief และ
                Labs · <strong className="text-foreground font-medium">Aplus1</strong>{" "}
                คือหน้าร้องโชว์ผลงานและรับงานจากชุมชน ลงผลงานใน Aplus1 มีคนติดต่อจ้าง →
                ไปทำใบเสนอราคาที่ So1o · งานลูกค้าเสร็จที่หลังบ้าน → นำผลงานมาโพสต์ใน Aplus1 ต่อ
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                เมื่อคุณสมัคร Pro ที่หน้านี้ สิทธิ์จะผูกกับบัญชีของคุณและใช้ได้ทั้งสองแอป
                (อนาคตจะเชื่อมข้อมูล การเงิน และฟีเจอร์ร่วมกันเพิ่มเติม)
              </p>
              <a
                href={ANTHEM_SHOWCASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                เปิด Aplus1 Showcase
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
            ราคาที่<span className="text-primary">โปร่งใส</span> ใช้งานได้จริง
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            เริ่มต้นฟรี อัพเกรดเมื่อพร้อม ยกเลิกได้ทุกเมื่อ ไม่มีค่าธรรมเนียมแฝง
          </p>
        </div>

        {/* Cycle toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
            {(["monthly", "yearly"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={cn(
                  "relative px-5 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all",
                  cycle === c
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c === "monthly" ? "รายเดือน" : "รายปี"}
                {c === "yearly" && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-primary/20 text-primary px-2 py-0.5 text-[10px] font-semibold">
                    ประหยัด ~20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Subscription cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6 max-w-6xl mx-auto">
          {PLANS.map((plan) => {
            const basePrice = cycle === "monthly" ? plan.monthly : plan.yearly;
            const isInhouse = plan.id === "inhouse";
            const displayPrice = isInhouse ? basePrice * seats : basePrice;
            const isCurrent = tier === "free" && plan.id === "free";
            const isCurrentPaid =
              (tier === "pro" && plan.id === "pro") ||
              (tier === "pro_plus" && plan.id === "pro_plus") ||
              (tier === "inhouse" && plan.id === "inhouse");

            return (
              <div key={plan.id} className="relative">
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <Badge className="bg-gradient-to-r from-primary to-orange-400 text-white border-0 shadow-md gap-1 px-3 py-1">
                      <Sparkles className="h-3 w-3" /> แนะนำ
                    </Badge>
                  </div>
                )}
                {isInhouse && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <Badge
                      variant="outline"
                      className="bg-card text-muted-foreground border-border shadow-sm text-[10px]"
                    >
                      ทีม · เร็วๆ นี้
                    </Badge>
                  </div>
                )}

                <Card
                  className={cn(
                    "relative h-full p-6 sm:p-7 flex flex-col bg-card overflow-hidden transition-all",
                    plan.highlighted
                      ? "border-2 border-transparent bg-gradient-to-br from-primary/5 to-transparent shadow-xl ring-1 ring-primary/30 scale-100 md:scale-105"
                      : "border border-border shadow-sm hover:shadow-md",
                  )}
                  style={
                    plan.highlighted
                      ? {
                          backgroundImage:
                            "linear-gradient(white, white), linear-gradient(135deg, #FF5F05, #FF9F67)",
                          backgroundOrigin: "border-box",
                          backgroundClip: "padding-box, border-box",
                        }
                      : undefined
                  }
                >
                  <div>
                    <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                      {isInhouse && <Users className="h-4 w-4 text-primary" />}
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl sm:text-5xl font-bold tracking-tight">
                        {displayPrice === 0 ? "0" : displayPrice.toLocaleString("th-TH")}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        THB
                        {plan.id === "free" ? "" : cycle === "monthly" ? " / เดือน" : " / ปี"}
                      </span>
                    </div>
                    {isInhouse && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {basePrice.toLocaleString("th-TH")} ฿
                        {cycle === "monthly" ? "/เดือน" : "/ปี"} × {seats} ที่นั่ง
                      </p>
                    )}
                    {plan.id === "pro" && cycle === "yearly" && (
                      <p className="mt-1 text-xs text-primary font-medium">
                        เฉลี่ย 199฿/เดือน · ประหยัด 600฿/ปี
                      </p>
                    )}
                  </div>

                  {/* Seat picker for In-House */}
                  {isInhouse && (
                    <div className="mt-5 rounded-xl border border-border bg-muted/30 p-3">
                      <p className="text-xs font-medium mb-2">จำนวนที่นั่ง (Seats)</p>
                      <div className="flex items-center justify-between gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => setSeats((s) => Math.max(2, s - 1))}
                          disabled={seats <= 2}
                          aria-label="ลดที่นั่ง"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <input
                          type="number"
                          min={2}
                          max={50}
                          value={seats}
                          onChange={(e) => {
                            const n = Math.max(2, Math.min(50, Number(e.target.value) || 2));
                            setSeats(n);
                          }}
                          className="flex-1 text-center font-bold text-lg bg-transparent outline-none"
                          aria-label="จำนวนที่นั่ง"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => setSeats((s) => Math.min(50, s + 1))}
                          disabled={seats >= 50}
                          aria-label="เพิ่มที่นั่ง"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="mt-2 text-[10px] text-muted-foreground text-center">
                        ขั้นต่ำ 2 ที่นั่ง · สูงสุด 50 ที่นั่ง
                      </p>
                    </div>
                  )}

                  <ul className="mt-6 space-y-2.5 flex-1">
                    {plan.highlights.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.details.length > 0 && (
                    <Collapsible className="mt-4">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-primary hover:underline group"
                        >
                          ดูรายละเอียดเพิ่มเติม
                          <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <ul className="mt-3 space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                          {plan.details.map((d) => (
                            <li key={d} className="text-xs text-muted-foreground leading-relaxed">
                              {d}
                            </li>
                          ))}
                        </ul>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  <div className="mt-7">
                    {plan.id === "free" ? (
                      <Button
                        asChild={!isCurrent}
                        disabled={isCurrent}
                        variant={isCurrent ? "secondary" : "outline"}
                        className="w-full"
                      >
                        {isCurrent ? (
                          <span>แพ็กเกจปัจจุบัน</span>
                        ) : (
                          <Link to={user ? "/dashboard" : "/auth"}>{plan.cta}</Link>
                        )}
                      </Button>
                    ) : isCurrentPaid ? (
                      <Button
                        onClick={handleManage}
                        disabled={loadingId === "manage"}
                        className="w-full bg-foreground text-background hover:bg-foreground/90"
                      >
                        {loadingId === "manage" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "แพ็กเกจปัจจุบัน"
                        )}
                      </Button>
                    ) : user && isPro && isActive && isHigherPlan(tier, plan.id) ? (
                      <Button
                        onClick={() => handleUpgradePlan(plan.id as UpgradeTargetTier)}
                        disabled={loadingId === plan.id}
                        className={cn(
                          "w-full",
                          plan.highlighted &&
                            "bg-gradient-to-r from-primary to-orange-400 text-white hover:opacity-90 border-0",
                        )}
                      >
                        {loadingId === plan.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          `อัปเกรด ${tierLabel(plan.id as UpgradeTargetTier)}`
                        )}
                      </Button>
                    ) : plan.id === "pro" || plan.id === "pro_plus" ? (
                      <Button
                        onClick={() => handleCheckoutPlan(plan.id as "pro" | "pro_plus")}
                        disabled={loadingId === plan.id}
                        className={cn(
                          "w-full",
                          plan.highlighted &&
                            "bg-gradient-to-r from-primary to-orange-400 text-white hover:opacity-90 border-0",
                        )}
                      >
                        {loadingId === plan.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          plan.cta
                        )}
                      </Button>
                    ) : plan.id === "inhouse" ? (
                      user && isPro && isActive && tier !== "inhouse" ? (
                        <Button
                          onClick={() => handleUpgradePlan("inhouse")}
                          disabled={loadingId === "inhouse"}
                          className="w-full"
                        >
                          {loadingId === "inhouse" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "อัปเกรด In-House"
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleCheckoutPlan("inhouse")}
                          disabled={loadingId === "inhouse"}
                          className="w-full"
                        >
                          {loadingId === "inhouse" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            plan.cta
                          )}
                        </Button>
                      )
                    ) : null}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>

        <TierDetailsSection
          currentTier={user ? tier : undefined}
          className="mt-16 sm:mt-20"
          showUpgradeRow
          loadingTier={loadingId as PlanId | null}
          onUpgrade={(targetTier) => {
            if (targetTier === "free") return;
            if (user && isPro && isActive && tier !== "free" && isHigherPlan(tier, targetTier)) {
              void handleUpgradePlan(targetTier);
            } else {
              void handleCheckoutPlan(targetTier);
            }
          }}
        />

        {/* Top-up Credits */}
        <section className="mt-16 sm:mt-20">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-3 py-1 text-xs font-semibold mb-3">
              <Zap className="h-3.5 w-3.5" /> Top-up Credits
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              เติมเครดิต AI ตามต้องการ
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              สำหรับใช้กับ AI Mentor, Creative Agent และฟีเจอร์ AI อื่นๆ · เครดิตไม่หมดอายุ ·
              ซื้อครั้งเดียวจ่ายครั้งเดียว
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5 max-w-4xl mx-auto">
            {TOPUPS.map((pack) => {
              const analysis = TOPUP_PACK_ANALYSIS.find((p) => p.id === pack.id);
              return (
                <Card
                  key={pack.id}
                  className={cn(
                    "relative p-5 sm:p-6 flex flex-col bg-card border transition-all hover:shadow-md",
                    pack.badge ? "border-primary/40 ring-1 ring-primary/20" : "border-border",
                  )}
                >
                  {pack.badge && (
                    <div className="absolute -top-2.5 right-4">
                      <Badge className="bg-primary text-primary-foreground border-0 text-[10px] px-2 py-0.5">
                        {pack.badge}
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-base">{pack.name}</h3>
                    <Zap className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold tracking-tight">
                      {pack.amount.toLocaleString("th-TH")}
                    </span>
                    <span className="text-xs text-muted-foreground">THB</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground/90">
                    +{pack.credits.toLocaleString("th-TH")} เครดิต
                  </p>
                  <p className="text-[11px] text-muted-foreground">{pack.perUnit}</p>
                  {analysis && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      ≈ {analysis.estActions.toLocaleString("th-TH")} ครั้งใช้งานเฉลี่ย
                    </p>
                  )}

                  <Button
                    onClick={() => handleTopup(pack)}
                    disabled={loadingId === pack.id}
                    variant="outline"
                    className="mt-4 w-full"
                  >
                    {loadingId === pack.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "ซื้อเครดิต"
                    )}
                  </Button>
                </Card>
              );
            })}
          </div>

          <p className="mt-4 text-center text-[11px] text-muted-foreground max-w-xl mx-auto">
            ประมาณการครั้งใช้งานจาก mix สมมติฐาน: Mentor{" "}
            {Math.round((USAGE_MIX_ASSUMPTION.ai_assistant_mentor ?? 0) * 100)}% · ธุรกิจ{" "}
            {Math.round((USAGE_MIX_ASSUMPTION.ai_assistant_business ?? 0) * 100)}% · Planner{" "}
            {Math.round((USAGE_MIX_ASSUMPTION.planner_ai_assist ?? 0) * 100)}% · Smart Brief{" "}
            {Math.round((USAGE_MIX_ASSUMPTION.ai_brief_extract ?? 0) * 100)}% (เฉลี่ย{" "}
            {weightedCreditsPerAction().toFixed(2)} เครดิต/ครั้ง)
          </p>
        </section>

        {/* Trust note */}
        <p className="text-center text-xs text-muted-foreground mt-12 max-w-md mx-auto">
          ราคารวม VAT แล้ว · ชำระผ่านบัตรเครดิตอย่างปลอดภัย · ยกเลิกได้ทุกเมื่อจากหน้าจัดการ
        </p>

        {subscription?.status === "past_due" && (
          <div className="mt-8 mx-auto max-w-2xl rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            ⚠️ การชำระเงินล่าสุดของคุณไม่สำเร็จ — กรุณาอัปเดตช่องทางการชำระเงินในหน้าจัดการ
          </div>
        )}
      </main>
    </div>
  );
}
