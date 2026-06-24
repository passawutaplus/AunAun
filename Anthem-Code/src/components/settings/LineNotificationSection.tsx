import { Link } from "react-router-dom";
import { Crown } from "lucide-react";
import { useSubscription } from "@/core/subscription";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { LineNotificationPrefsPanel } from "@/components/settings/LineNotificationPrefsPanel";
import { pickLocale, type UserLocale } from "@/lib/lineNotificationKinds";

const TIER_LABEL: Record<string, Record<UserLocale, string>> = {
  pro: { th: "โปร", en: "Pro" },
  pro_plus: { th: "โปร+", en: "Pro+" },
  inhouse: { th: "อินฮาวส์", en: "In-House" },
};

export function LineNotificationSection() {
  const { user } = useAuth();
  const { isPro, tier } = useSubscription();
  const { data: profile } = useProfile(user?.id);
  const locale = pickLocale((profile as { locale?: string } | undefined)?.locale);

  const t = (th: string, en: string) => (locale === "en" ? en : th);
  const tierLabel =
    TIER_LABEL[tier]?.[locale as UserLocale] ?? (locale === "en" ? "Pro" : "โปร");

  // In-House group visibility is managed on So1o desk; Anthem shows anthem + portal + system only.
  const showInhouseGroup = tier === "inhouse";

  if (!isPro) {
    return (
      <section className="rounded-2xl glass-panel p-6 space-y-3">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#06C755]/20 text-[#06C755]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .628.285.628.63 0 .349-.282.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
          </span>
          {t("แจ้งเตือนผ่านไลน์", "LINE notifications")}
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t(
            "รับแจ้งเตือนทันทีเมื่อมีคำขอจ้าง แชท หรือเหตุการณ์จากหน้าที่แชร์ — สำหรับสมาชิกโปรและอินฮาวส์",
            "Get instant alerts for hire, chat, and portal events — Pro / In-House only",
          )}
        </p>
        <Link
          to="/upgrade"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
        >
          <Crown className="h-3.5 w-3.5" />
          {t("อัปเกรดแพ็กเกจ", "Upgrade plan")}
        </Link>
      </section>
    );
  }

  return (
    <LineNotificationPrefsPanel
      showLinkStatus
      showInhouseGroup={showInhouseGroup}
      tierLabel={tierLabel}
    />
  );
}
