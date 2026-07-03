import { useNavigate, Link } from "react-router-dom";
import { Clock, Crown, Sparkles } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/core/subscription";
import Footer from "@/components/Footer";
import { BRAND_NAME } from "@/lib/brandConfig";
import { UPGRADE_COMING_SOON_TH } from "@/lib/aplus1Launch";
import { tierLabel, normalizePlanId } from "@/lib/tierMembership";

export function UpgradeComingSoonPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier: rawTier } = useSubscription();
  const tier = normalizePlanId(rawTier);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <BackButton
            onClick={() => navigate(user ? "/settings" : "/")}
            label={user ? "กลับตั้งค่า" : "กลับหน้าหลัก"}
          />
          <span className="text-xs text-muted-foreground">{tierLabel(tier)} Member</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-12 sm:py-16 pb-24 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6">
          <Crown className="w-8 h-8" />
        </div>
        <Badge variant="outline" className="mb-4 gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-400">
          <Clock className="w-3.5 h-3.5" />
          Coming soon
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          แพ็ก Pro บน {BRAND_NAME}
        </h1>
        <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
          {UPGRADE_COMING_SOON_TH}
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-5 text-left space-y-3 max-w-md mx-auto">
          <p className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            ตอนนี้ใช้งานได้ตามปกติ
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
            <li>โพสต์ผลงานและเปิดรับโอกาส</li>
            <li>รับ 1 px ฟรีทุกวันที่หน้าเติม Pixel</li>
            <li>ส่งและรับของขวัญด้วย Pixel</li>
            <li>เติม Pixel และถอนรายได้ตามเงื่อนไข</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-2 justify-center">
          <Button className="rounded-full" onClick={() => navigate(user ? "/portfolio" : "/")}>
            กลับไปใช้งาน
          </Button>
          <Button variant="outline" className="rounded-full" asChild>
            <Link to="/earnings">ดูรายได้ &amp; Pixel</Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default UpgradeComingSoonPage;
