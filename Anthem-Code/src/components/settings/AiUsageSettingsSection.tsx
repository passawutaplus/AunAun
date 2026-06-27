import { Link } from "react-router-dom";
import { Crown, Loader2, RefreshCw, Sparkles, Zap } from "lucide-react";
import { useSubscription } from "@/core/subscription";
import { useAiUsage } from "@/hooks/useAiUsage";
import { normalizePlanId } from "@/lib/tierMembership";
import {
  aiRemainingBarColor,
  aiRemainingPercent,
  describeAiCreditsPlan,
  formatAiPeriodEnd,
} from "@/lib/aiCredits";
import { SO1O_PRICING_URL } from "@/lib/productLinks";
import { cn } from "@/lib/utils";

const TIER_LABEL = {
  free: "Free",
  pro: "Pro",
  pro_plus: "Pro+",
  inhouse: "In-House",
} as const;

export function AiUsageSettingsSection() {
  const { tier: rawTier, isPro } = useSubscription();
  const tier = normalizePlanId(rawTier);
  const {
    included_used,
    included_limit,
    purchased_balance,
    total_remaining,
    period_end,
    period_type,
    isLoading,
    isFetching,
    refetch,
  } = useAiUsage();

  const safeTotal = total_remaining ?? 0;
  const safeUsed = included_used ?? 0;
  const safeLimit = included_limit ?? 0;
  const safePurchased = purchased_balance ?? 0;
  const capacity = Math.max(safeLimit, safeTotal, 1);
  const remainingPercent = aiRemainingPercent(safeTotal, capacity);
  const barColor = aiRemainingBarColor(safeTotal);
  const resetsAt = formatAiPeriodEnd(period_end);
  const planHint = describeAiCreditsPlan({ tier, period_type, included_limit: safeLimit });
  const isFree = tier === "free";
  const creditsEnded = period_type === "free_starter_ended" && isFree;
  const lowCredits = safeTotal < 20;

  return (
    <section className="h-full rounded-2xl glass-panel p-6 space-y-4 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Credit AI
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {isLoading
              ? "กำลังโหลด…"
              : `เหลือ ${safeTotal.toLocaleString("th-TH")} จาก ${capacity.toLocaleString("th-TH")} เครดิต`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium border",
              isPro
                ? "bg-primary/15 text-primary border-primary/20"
                : "bg-secondary text-muted-foreground border-border",
            )}
          >
            {isPro ? <Crown className="h-3 w-3" /> : null}
            {TIER_LABEL[tier] ?? "Free"}
          </span>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
            aria-label="รีเฟรช"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        {isLoading ? (
          <div className="h-full w-full animate-pulse bg-muted-foreground/20" />
        ) : (
          <div
            className={cn("h-full rounded-full transition-all", barColor)}
            style={{ width: `${remainingPercent}%` }}
          />
        )}
      </div>

      <p className="text-[11px] text-muted-foreground tabular-nums">
        {planHint}
        {resetsAt && !isFree ? ` · รีเซ็ต ${resetsAt}` : ""}
      </p>

      {creditsEnded && (
        <p className="text-xs text-destructive">เครดิตหมดแล้ว — อัพเกรดหรือเติมเพื่อใช้ต่อ</p>
      )}

      {!isLoading && (
        <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">
              {isFree ? "เครดิตเริ่มต้น" : "โควต้าแพ็ก"}
            </span>
            <span className="tabular-nums">
              {safeUsed.toLocaleString("th-TH")} / {safeLimit.toLocaleString("th-TH")}
            </span>
          </div>
          {safePurchased > 0 && (
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Sparkles className="h-3 w-3 text-amber-500" />
                เติมเพิ่ม
              </span>
              <span className="tabular-nums font-medium text-amber-600 dark:text-amber-400">
                {safePurchased.toLocaleString("th-TH")}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <a
          href={SO1O_PRICING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 px-3 py-1.5 text-xs font-medium hover:bg-amber-500/10 transition-colors"
        >
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          เติมเครดิต
        </a>
        {!isPro && (
          <Link
            to="/upgrade"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            อัพเกรด Pro
          </Link>
        )}
        {lowCredits && !creditsEnded && (
          <span className="w-full text-[10px] text-amber-600 dark:text-amber-400">
            เครดิตใกล้หมด — พิจารณาเติมหรืออัพเกรด
          </span>
        )}
      </div>
    </section>
  );
}
