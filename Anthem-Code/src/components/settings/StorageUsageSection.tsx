import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HardDrive, Crown, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/core/subscription";
import {
  ANTHEM_STORAGE_LABEL,
  formatStorageBytes,
} from "@/lib/storageQuotas";
import {
  getAnthemStorageUsedBytes,
  anthemStorageLimitBytes,
  storageUsagePercent,
} from "@/lib/anthemStorageUsage";
import { normalizePlanId } from "@/lib/tierMembership";
import { BRAND_NAME } from "@/lib/brandConfig";
import { SO1O_APP_URL } from "@/lib/productLinks";
import { UPGRADE_PATH } from "@/lib/aplus1Launch";
import { cn } from "@/lib/utils";

const TIER_LABEL = {
  free: "Free",
  pro: "Pro",
  pro_plus: "Pro+",
  inhouse: "In-House",
} as const;

export function StorageUsageSection() {
  const { user } = useAuth();
  const { tier: rawTier, isPro } = useSubscription();
  const tier = normalizePlanId(rawTier);

  const { data: usedBytes = 0, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["anthem-storage-usage", user?.id],
    enabled: !!user?.id,
    queryFn: () => getAnthemStorageUsedBytes(user!.id),
    staleTime: 60_000,
  });

  const limit = anthemStorageLimitBytes(tier);
  const pct = storageUsagePercent(usedBytes, limit);
  const nearLimit = pct >= 85;
  const overLimit = usedBytes > limit;

  return (
    <section className="h-full rounded-2xl glass-panel p-6 space-y-4 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-sky-500" />
            พื้นที่ {BRAND_NAME} (ผลงาน & แชท)
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {isLoading
              ? "กำลังคำนวณ…"
              : `${formatStorageBytes(usedBytes)} จาก ${formatStorageBytes(limit)} ที่ใช้ได้`}
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
            className="p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground"
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
            className={cn(
              "h-full rounded-full transition-all",
              overLimit ? "bg-destructive" : nearLimit ? "bg-amber-500" : "bg-sky-500",
            )}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>

      <p className="text-[11px] text-muted-foreground tabular-nums">
        {pct}% ของโควต้า {ANTHEM_STORAGE_LABEL[tier] ?? ANTHEM_STORAGE_LABEL.free} — รูป/วิดีโอผลงาน แนบแชท สตูดิโอ
      </p>

      {(nearLimit || overLimit) && !isLoading && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
            overLimit
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            {overLimit
              ? "เต็มโควต้าแล้ว — อัปโหลด/เผยแพร่ใหม่ถูกบล็อก ของเก่ายังดูได้"
              : (
                <>
                  ใกล้เต็มแล้ว — ลบไฟล์เก่าหรือ{" "}
                  <Link to={UPGRADE_PATH} className="font-medium underline underline-offset-2">
                    แพ็ก Pro (เร็ว ๆ นี้)
                  </Link>
                </>
              )}
          </span>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
        กระเป๋า So1o (ใบเสนอราคา, Job Tracker, Brief) แยกต่างหาก — ดูที่{" "}
        <a
          href={`${SO1O_APP_URL.replace(/\/$/, "")}/dashboard?tab=settings`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center min-h-11 py-2 text-primary hover:underline"
        >
          So1o Settings → พื้นที่จัดเก็บ
        </a>
      </p>
    </section>
  );
}
