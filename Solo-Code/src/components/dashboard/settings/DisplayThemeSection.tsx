import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { pickLocale, type UserLocale } from "@/lib/lineNotificationKinds";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { isPaidTier } from "@/lib/subscriptionTiers";
import { SubscriptionUpgradeBlock } from "@/components/dashboard/settings/SubscriptionUpgradeBlock";
import { SubscriptionDowngradeBlock } from "@/components/dashboard/settings/SubscriptionDowngradeBlock";

export function DisplayThemeSection() {
  const { theme, setTheme } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const { tier, isPro, isActive } = useSubscription();
  const locale = pickLocale(profile?.locale);
  const [savingLocale, setSavingLocale] = React.useState(false);

  const paidTier = isPaidTier(tier) ? tier : null;
  const showPlanChange = isPro && isActive && !!paidTier;

  async function setLocale(next: UserLocale) {
    if (!profile?.user_id || next === locale) return;
    setSavingLocale(true);
    const { error } = await supabase
      .from("profiles")
      .update({ locale: next })
      .eq("user_id", profile.user_id);
    setSavingLocale(false);
    if (error) {
      toast.error(locale === "en" ? "Could not save language" : "บันทึกภาษาไม่สำเร็จ");
      return;
    }
    await refreshProfile();
    toast.success(locale === "en" ? "Language updated" : "อัปเดตภาษาแล้ว");
  }

  return (
    <Card className="glass border-border shadow-soft">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              {locale === "en" ? "Display mode" : "ปรับโหมด"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {locale === "en"
                ? "Theme and notification language (LINE, etc.)"
                : "โหมดแสดงผลและภาษาข้อความแจ้งเตือน (LINE ฯลฯ)"}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 shrink-0">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> กลับหน้าฟีด
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-end gap-2 flex-wrap">
          <div className="inline-flex rounded-xl border border-border/60 bg-muted/40 p-1">
            <Button
              type="button"
              size="sm"
              variant={theme === "light" ? "default" : "ghost"}
              onClick={() => setTheme("light")}
              className="h-8 gap-1.5 rounded-lg"
            >
              <Sun className="h-4 w-4" /> Light
            </Button>
            <Button
              type="button"
              size="sm"
              variant={theme === "dark" ? "default" : "ghost"}
              onClick={() => setTheme("dark")}
              className="h-8 gap-1.5 rounded-lg"
            >
              <Moon className="h-4 w-4" /> Dark
            </Button>
          </div>

          <div className="inline-flex rounded-xl border border-border/60 bg-muted/40 p-1">
            <Button
              type="button"
              size="sm"
              variant={locale === "th" ? "default" : "ghost"}
              onClick={() => setLocale("th")}
              disabled={savingLocale}
              className="h-8 rounded-lg text-xs"
            >
              ไทย
            </Button>
            <Button
              type="button"
              size="sm"
              variant={locale === "en" ? "default" : "ghost"}
              onClick={() => setLocale("en")}
              disabled={savingLocale}
              className="h-8 rounded-lg text-xs"
            >
              English
            </Button>
          </div>

          {savingLocale && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>

        {showPlanChange && (
          <div className="border-t border-border/40 pt-3 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
            <SubscriptionUpgradeBlock embedded className="sm:flex-1 min-w-0" />
            <SubscriptionDowngradeBlock embedded className="sm:flex-1 min-w-0" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
