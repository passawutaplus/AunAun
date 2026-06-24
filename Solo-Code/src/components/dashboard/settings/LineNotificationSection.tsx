import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/auth/AuthProvider";
import { LineGlyph } from "@/components/LineContactButton";
import { LineNotificationPrefsPanel } from "@/components/line/LineNotificationPrefsPanel";
import { useMyInhouseOrgs } from "@/hooks/inhouse/useInhouseOrg";
import { pickLocale, type UserLocale } from "@/lib/lineNotificationKinds";
import { cn } from "@/lib/utils";

const TIER_LABEL: Record<string, Record<UserLocale, string>> = {
  pro: { th: "โปร", en: "Pro" },
  pro_plus: { th: "โปร+", en: "Pro+" },
  inhouse: { th: "อินฮาวส์", en: "In-House" },
};

function LineGlyphBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#06C755] text-white shadow-soft",
        className,
      )}
    >
      <LineGlyph className="h-5 w-5" />
    </span>
  );
}

export function LineNotificationSection() {
  const { isPro, tier } = useSubscription();
  const { profile } = useAuth();
  const locale = pickLocale(profile?.locale);
  const { data: inhouseOrgs = [] } = useMyInhouseOrgs();

  const t = (th: string, en: string) => (locale === "en" ? en : th);
  const tierLabel = TIER_LABEL[tier]?.[locale as UserLocale] ?? (locale === "en" ? "Pro" : "โปร");
  const showInhouseGroup = tier === "inhouse" || inhouseOrgs.length > 0;

  if (!isPro) {
    return (
      <Card className="glass border-border shadow-soft overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <LineGlyphBadge className="opacity-60" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold tracking-tight">
                  {t("แจ้งเตือนผ่านไลน์", "LINE notifications")}
                </h2>
                <Badge variant="secondary" className="text-[10px]">
                  {t("โปร", "Pro")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t(
                  "รับแจ้งเตือนทันทีเมื่อลูกค้าอัปโหลดสลิป ยืนยันบรีฟ หรืออนุมัติคอนเทนต์ — สำหรับสมาชิกโปรและอินฮาวส์",
                  "Get instant alerts when clients upload slips, confirm briefs, or approve content — Pro / In-House only",
                )}
              </p>
              <Button asChild size="sm" className="mt-1">
                <Link to="/pricing">
                  <Crown className="h-3.5 w-3.5 mr-1.5" />
                  {t("อัปเกรดเป็นโปร", "Upgrade to Pro")}
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <LineNotificationPrefsPanel
      variant="settings"
      showLinkStatus
      showTestSamples
      showInhouseGroup={showInhouseGroup}
      tierLabel={tierLabel}
    />
  );
}
