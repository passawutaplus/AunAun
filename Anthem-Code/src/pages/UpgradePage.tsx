import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Check,
  ChevronDown,
  ExternalLink,
  LayoutGrid,
  Minus,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/core/subscription";
import { PLANS, type BillingCycle } from "@/data/plans";
import { TierDetailsSection } from "@/components/tier/TierDetailsSection";
import type { PlanId } from "@/data/plans";
import { EcosystemProCard } from "@/components/ecosystem/EcosystemProCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Footer from "@/components/Footer";
import { BRAND_NAME } from "@/lib/brandConfig";
import { SO1O_APP_URL, SO1O_PRICING_URL } from "@/lib/productLinks";
import { cn } from "@/lib/utils";
import { isNativeShell } from "@/lib/nativePlatform";

const UpgradePage = () => {
  const [cycle, setCycle] = useState<BillingCycle>("yearly");
  const [seats, setSeats] = useState(3);
  const { user } = useAuth();
  const { tier, isPro } = useSubscription();
  const navigate = useNavigate();
  const nativeShell = isNativeShell();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <BackButton
            onClick={() => navigate(user ? "/settings" : "/")}
            label={user ? "กลับตั้งค่า" : "กลับหน้าหลัก"}
          />
          {user && (
            <span className="text-xs text-muted-foreground">
              {tier === "inhouse"
                ? "🏢 In-House Member"
                : tier === "pro_plus"
                  ? "✨ Pro+ Member"
                  : tier === "pro"
                    ? "✨ Pro Member"
                    : "แพ็กเกจปัจจุบัน: Free"}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16 pb-24">
        <EcosystemProCard className="mb-10" compact />

        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            แพ็กเกจ & <span className="text-primary">อัพเกรด</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            สมัครและชำระเงินที่ So1o Freelancer — สิทธิ์ใช้ได้ทั้งหลังบ้าน So1o และ {BRAND_NAME} บัญชีเดียวกัน
          </p>
        </div>

        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
            {(["monthly", "yearly"] as const).map((c) => (
              <button
                key={c}
                type="button"
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6 max-w-6xl mx-auto">
          {PLANS.map((plan) => {
            const basePrice = cycle === "monthly" ? plan.monthly : plan.yearly;
            const isInhouse = plan.id === "inhouse";
            const displayPrice = isInhouse ? basePrice * seats : basePrice;
            const isCurrent = user && tier === plan.id;
            const isCurrentFree = user && tier === "free" && plan.id === "free";

            return (
              <div key={plan.id} className="relative">
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <Badge className="bg-gradient-primary text-primary-foreground border-0 shadow-md gap-1 px-3 py-1">
                      <Sparkles className="h-3 w-3" /> แนะนำ
                    </Badge>
                  </div>
                )}
                {isInhouse && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <Badge variant="outline" className="bg-card text-muted-foreground border-border shadow-sm text-[10px]">
                      ทีม · เร็วๆ นี้
                    </Badge>
                  </div>
                )}

                <Card
                  className={cn(
                    "relative h-full p-6 sm:p-7 flex flex-col glass-panel overflow-hidden transition-all",
                    plan.highlighted && "border-primary/40 ring-1 ring-primary/30 md:scale-105",
                    isCurrent && "ring-2 ring-primary/50",
                  )}
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
                        {plan.id === "free"
                          ? ""
                          : cycle === "monthly"
                            ? " / เดือน"
                            : " / ปี"}
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
                      isCurrentFree ? (
                        <Button disabled variant="secondary" className="w-full rounded-full">
                          แพ็กเกจปัจจุบัน
                        </Button>
                      ) : (
                        <Button asChild variant="outline" className="w-full rounded-full">
                          <Link to={user ? "/portfolio" : "/auth"}>{plan.cta}</Link>
                        </Button>
                      )
                    ) : nativeShell ? (
                      <Button disabled variant="secondary" className="w-full rounded-full">
                        Available on the web
                      </Button>
                    ) : isCurrent ? (
                      <Button asChild className="w-full rounded-full">
                        <a href={SO1O_APP_URL} target="_blank" rel="noopener noreferrer">
                          จัดการที่ So1o
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </a>
                      </Button>
                    ) : (
                      <Button asChild className={cn("w-full rounded-full", plan.highlighted && "bg-gradient-primary")}>
                        <a href={SO1O_PRICING_URL} target="_blank" rel="noopener noreferrer">
                          {plan.cta}
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </a>
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>

        <TierDetailsSection
          currentTier={user ? tier : undefined}
          className="mt-16 sm:mt-20"
          showUpgradeRow={!nativeShell}
          onUpgrade={(targetTier: PlanId) => {
            if (!nativeShell && targetTier !== "free") {
              window.open(SO1O_PRICING_URL, "_blank", "noopener,noreferrer");
            }
          }}
        />

        <div className="mt-12 max-w-2xl mx-auto rounded-2xl border border-border glass-panel p-5 text-center">
          <LayoutGrid className="h-8 w-8 text-primary mx-auto mb-3" />
          <h2 className="text-lg font-semibold">ชำระเงินที่ So1o Freelancer</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ระบบ billing รวมศูนย์ที่ So1o — หลังสมัครแล้วสิทธิ์ Pro จะใช้ได้ทั้ง My Desk และ {BRAND_NAME} ทันที
          </p>
          {!isPro && !nativeShell && (
            <Button asChild className="mt-4 rounded-full bg-gradient-primary">
              <a href={SO1O_PRICING_URL} target="_blank" rel="noopener noreferrer">
                ไปหน้าชำระเงิน So1o
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 max-w-md mx-auto">
          ราคารวม VAT แล้ว · ชำระผ่านบัตรเครดิตอย่างปลอดภัย · ยกเลิกได้ทุกเมื่อ
        </p>
      </main>

      <Footer />
    </div>
  );
};

export default UpgradePage;
