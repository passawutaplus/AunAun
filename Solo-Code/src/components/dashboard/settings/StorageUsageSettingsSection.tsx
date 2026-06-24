import * as React from "react";
import { Link } from "@tanstack/react-router";
import { HardDrive, Loader2, Crown, ChevronDown, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSubscription } from "@/hooks/useSubscription";
import { useStorageUsage } from "@/hooks/useStorageUsage";
import {
  formatStorageBytes,
  storageUsagePercent,
  describeStoragePlan,
  storageWarningLevel,
  STORAGE_CATEGORY_LABELS,
  type StorageCategoryKey,
} from "@/lib/storageQuota";
import { cn } from "@/lib/utils";

const TIER_LABEL = {
  free: "Free",
  pro: "Pro",
  pro_plus: "Pro+",
  inhouse: "In-House",
} as const;

const MANAGE_LINKS: Partial<Record<StorageCategoryKey, string>> = {
  documents: "/dashboard?tab=finance&sub=quotations",
  suppliers: "/dashboard?tab=mydata&sub=suppliers",
  jobs: "/dashboard?tab=finance&sub=jobs",
  finance: "/dashboard?tab=finance&sub=tax",
  brand_assets: "/dashboard?tab=mydata&sub=assets",
  portfolio: "/dashboard?tab=mydata&sub=portfolio",
  planner: "/dashboard?tab=planner",
};

export function StorageUsageSettingsSection() {
  const { tier, isPro, isLoading: subLoading } = useSubscription();
  const {
    total_bytes,
    limit_bytes,
    db_bytes,
    file_bytes,
    remaining_bytes,
    categories,
    isLoading: usageLoading,
    limitReached,
  } = useStorageUsage();
  const [open, setOpen] = React.useState(false);

  const isLoading = subLoading || usageLoading;
  const percent = storageUsagePercent(total_bytes, limit_bytes);
  const level = storageWarningLevel(percent);
  const planHint = describeStoragePlan(tier, limit_bytes);
  const sortedCategories = [...categories].sort((a, b) => b.bytes - a.bytes);

  return (
    <Card className="border-border/60 overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardContent className="p-0">
          <div className="p-5 space-y-3">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-start justify-between gap-3 text-left group"
              >
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-sky-500 shrink-0" />
                    พื้นที่เก็บข้อมูล
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {open
                      ? planHint
                      : `ใช้ไป ${formatStorageBytes(total_bytes)} จาก ${formatStorageBytes(limit_bytes)}`}
                  </p>
                </div>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                ) : (
                  <Badge
                    variant="secondary"
                    className={cn("shrink-0", isPro && "bg-primary/15 text-primary border-primary/20")}
                  >
                    {isPro ? <Crown className="h-3 w-3 mr-1" /> : null}
                    {TIER_LABEL[tier]}
                  </Badge>
                )}
              </button>
            </CollapsibleTrigger>

            <div className="space-y-1.5">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    level === "full" || level === "critical"
                      ? "bg-destructive"
                      : level === "warn"
                        ? "bg-amber-500"
                        : "bg-primary",
                  )}
                  style={{ width: `${isLoading ? 0 : percent}%` }}
                />
              </div>
              {!open && !isLoading && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                  <span>
                    {formatStorageBytes(total_bytes)} / {formatStorageBytes(limit_bytes)}
                  </span>
                  <span>เหลือ {formatStorageBytes(remaining_bytes)}</span>
                </div>
              )}
            </div>

            {limitReached && !isLoading && (
              <p className="text-xs text-destructive">
                พื้นที่เต็มแล้ว — ลบไฟล์เก่าหรืออัพเกรด Pro เพื่ออัปโหลดต่อ
              </p>
            )}
          </div>

          <CollapsibleContent>
            <div className="px-5 pb-4 space-y-3 border-t border-border/40 pt-4">
              <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">ฐานข้อมูล</span>
                  <span className="tabular-nums text-muted-foreground">{formatStorageBytes(db_bytes)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">ไฟล์แนบ</span>
                  <span className="tabular-nums text-muted-foreground">{formatStorageBytes(file_bytes)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/40">
                  <span className="font-medium">รวมใช้ไป</span>
                  <span className="tabular-nums font-bold text-primary">
                    {formatStorageBytes(total_bytes)}
                  </span>
                </div>
              </div>

              {sortedCategories.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground">ตามฟีเจอร์</p>
                  {sortedCategories.map((cat) => {
                    if (cat.bytes <= 0) return null;
                    const catPct =
                      total_bytes > 0 ? Math.max(4, Math.round((cat.bytes / total_bytes) * 100)) : 0;
                    const label = STORAGE_CATEGORY_LABELS[cat.key as StorageCategoryKey] ?? cat.key;
                    const manageHref = MANAGE_LINKS[cat.key as StorageCategoryKey];
                    return (
                      <div key={cat.key} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate">{label}</span>
                          <span className="tabular-nums text-muted-foreground shrink-0">
                            {formatStorageBytes(cat.bytes)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-500/80"
                            style={{ width: `${catPct}%` }}
                          />
                        </div>
                        {manageHref && (
                          <a href={manageHref} className="text-[10px] text-primary hover:underline">
                            จัดการ
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-border/60 bg-muted/20 px-5 py-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <a href="/dashboard?tab=mydata&sub=suppliers">
                    <Trash2 className="h-3.5 w-3.5" />
                    จัดการข้อมูล
                  </a>
                </Button>
                {!isPro ? (
                  <Button asChild size="sm" className="gap-1.5">
                    <Link to="/pricing">
                      <Sparkles className="h-3.5 w-3.5" />
                      อัพเกรด Pro
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <Link to="/pricing">
                      <HardDrive className="h-3.5 w-3.5" />
                      ดูแพ็กเกจ
                    </Link>
                  </Button>
                )}
              </div>
              {!isPro && (
                <p className="text-[10px] text-muted-foreground">
                  Pro ได้พื้นที่ {formatStorageBytes(5 * 1024 * 1024 * 1024)} — เก็บไฟล์งานและเอกสารได้เต็มที่
                </p>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
