import { ExternalLink, LayoutGrid, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/core/subscription";
import { BRAND_NAME } from "@/lib/brandConfig";
import { SO1O_APP_URL, SO1O_PRICING_URL } from "@/lib/productLinks";
import { so1oUrl } from "@/lib/crossLink";
import { cn } from "@/lib/utils";
import { isSoloEcosystemEnabled, UPGRADE_PATH } from "@/lib/aplus1Launch";
import { SoloExternalLink } from "@/components/ecosystem/SoloExternalLink";

type Props = {
  className?: string;
  compact?: boolean;
};

/**
 * Explains the So1o ↔ Aplus1 economy and surfaces Pro status from the shared account.
 */
export function EcosystemProCard({ className, compact }: Props) {
  const { tier, isPro, isLoading } = useSubscription();
  const soloEnabled = isSoloEcosystemEnabled();

  const tierLabel =
    tier === "inhouse"
      ? "In-House"
      : tier === "pro_plus"
        ? "Pro+"
        : tier === "pro"
          ? "Pro"
          : isLoading
            ? "…"
            : "Free";

  return (
    <section
      className={cn(
        "rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card p-4 sm:p-5",
        className,
      )}
      aria-labelledby="ecosystem-pro-heading"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-2xl bg-primary/15 p-2.5 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {soloEnabled ? "ระบบเดียวกัน · บัญชีเดียว" : BRAND_NAME}
          </p>
          <h2 id="ecosystem-pro-heading" className="mt-0.5 text-base font-semibold text-foreground">
            {soloEnabled
              ? "So1o Pro ปลดล็อกทั้งหลังบ้านและหน้าร้าน"
              : `โอกาสจากผลงานบน ${BRAND_NAME}`}
          </h2>
          {!compact && (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {soloEnabled ? (
                <>
                  <strong className="text-foreground font-medium">So1o Freelancer</strong> คือหลังบ้าน —
                  ใบเสนอราคา ลูกค้า การเงิน บันทึกงาน ·{" "}
                  <strong className="text-foreground font-medium">{BRAND_NAME}</strong> คือหน้าร้านโชว์ผลงานและรับงาน
                  เมื่อมีคนจ้างจากผลงานที่ลงใน {BRAND_NAME} ไปทำใบเสนอราคาที่ So1o ได้เลย
                </>
              ) : (
                <>
                  โพสต์ผลงาน รับคำขอจ้าง และคุยกับลูกค้าใน {BRAND_NAME} — การเชื่อมหลังบ้าน So1o Freelancer
                  (ใบเสนอราคา การเงิน) จะเปิดเร็ว ๆ นี้
                </>
              )}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {soloEnabled
              ? `สมัคร Pro ที่ So1o ครั้งเดียว → ใช้สิทธิ์ Pro บน ${BRAND_NAME} ด้วยบัญชีเดียวกัน`
              : `แพ็ก Pro บน ${BRAND_NAME} เร็ว ๆ นี้ — สมาชิก Pro จาก So1o ใช้สิทธิ์ได้ตามปกติ`}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium">
            <LayoutGrid className="h-3.5 w-3.5 text-primary" />
            แพ็กเกจปัจจุบัน:{" "}
            <span className={isPro ? "text-primary font-semibold" : "text-foreground"}>{tierLabel}</span>
          </div>
        </div>
      </div>

      <div className={cn("mt-4 flex flex-col sm:flex-row gap-2 flex-wrap", compact && "mt-3")}>
        {!isPro ? (
          <>
            <Link
              to={UPGRADE_PATH}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {soloEnabled ? "ดูแพ็กเกจทั้งหมด" : "แพ็ก Pro — เร็ว ๆ นี้"}
            </Link>
            {soloEnabled && (
              <SoloExternalLink
                href={SO1O_PRICING_URL}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 text-primary px-4 py-2.5 text-sm font-semibold hover:bg-primary/5 transition-colors"
              >
                ชำระเงินที่ So1o
                <ExternalLink className="h-4 w-4" />
              </SoloExternalLink>
            )}
          </>
        ) : (
          <SoloExternalLink
            href={so1oUrl("/dashboard")}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground text-background px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {soloEnabled ? "เปิด So1o My Desk" : "So1o My Desk — เร็ว ๆ นี้"}
            <ExternalLink className="h-4 w-4" />
          </SoloExternalLink>
        )}
        <SoloExternalLink
          href={SO1O_APP_URL}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          {soloEnabled ? "หลังบ้าน So1o" : "หลังบ้าน So1o — เร็ว ๆ นี้"}
          <ExternalLink className="h-3.5 w-3.5" />
        </SoloExternalLink>
        <Link
          to={UPGRADE_PATH}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          {soloEnabled ? "เปรียบเทียบแพ็กเกจ" : "แพ็กเกจ (เร็ว ๆ นี้)"}
        </Link>
        <Link
          to="/portfolio"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors sm:ml-auto"
        >
          จัดการผลงาน {BRAND_NAME}
        </Link>
      </div>
    </section>
  );
}
