import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  HardDrive,
  Loader2,
  Trash2,
  Crown,
  RefreshCw,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSubscription } from "@/hooks/useSubscription";
import {
  STORAGE_CATEGORIES,
  STORAGE_QUOTA_LABEL,
  formatStorageBytes,
  storageUsagePercent,
  type StorageCategoryId,
} from "@/lib/storageQuotas";
import { getUserStorageUsage, purgeUserStorageCategory } from "@/lib/storageUsage.functions";
import type { StorageCategoryUsage, UserStorageUsageResponse } from "@/lib/storageUsage.types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TIER_LABEL = { free: "Free", pro: "Pro", pro_plus: "Pro+", inhouse: "In-House" } as const;

const PURGE_WARNINGS: Record<StorageCategoryId, string> = {
  photos:
    "จะลบรูปภาพทั้งหมดของคุณ (โลโก้, QR, Assets, Brief, Job Tracker, รูปแชท) และเคลียร์โลโก้/QR ในโปรไฟล์",
  documents: "จะลบเอกสารและไฟล์แนบทั้งหมด (ใบเสร็จ, 50ทวิ, Supplier, Ticket)",
  videos: "จะลบไฟล์วิดีโอทั้งหมดของคุณ",
  data: "จะลบประวัติแชท AI และการแจ้งเตือนในแอป (ไม่ลบใบเสนอราคา/ลูกค้า)",
  others: "จะลบไฟล์ที่ไม่เข้าหมวดหลักทั้งหมด",
};

const QUERY_KEY = ["user-storage-usage"] as const;

function categoryMap(data: UserStorageUsageResponse | undefined) {
  const map = new Map<StorageCategoryId, StorageCategoryUsage>();
  for (const c of data?.categories ?? []) map.set(c.id, c);
  for (const meta of STORAGE_CATEGORIES) {
    if (!map.has(meta.id)) map.set(meta.id, { id: meta.id, bytes: 0, fileCount: 0 });
  }
  return map;
}

export function StorageUsageSection() {
  const { tier, isPro } = useSubscription();
  const queryClient = useQueryClient();
  const fetchUsage = useServerFn(getUserStorageUsage);
  const purgeFn = useServerFn(purgeUserStorageCategory);

  const [open, setOpen] = React.useState(false);
  const [purgeTarget, setPurgeTarget] = React.useState<StorageCategoryId | null>(null);
  const [purging, setPurging] = React.useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchUsage(),
    staleTime: 60_000,
  });

  const used = data?.usedBytes ?? 0;
  const limit = data?.limitBytes ?? 0;
  const pct = storageUsagePercent(used, limit);
  const catMap = categoryMap(data);
  const nearLimit = pct >= 85;
  const overLimit = used > limit;

  async function confirmPurge() {
    if (!purgeTarget) return;
    setPurging(true);
    try {
      const res = await purgeFn({ data: { category: purgeTarget } });
      toast.success(
        `ลบแล้ว — คืนพื้นที่ประมาณ ${formatStorageBytes(res.freedBytes)}` +
          (res.deletedFiles ? ` (${res.deletedFiles} ไฟล์)` : ""),
      );
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
    } finally {
      setPurging(false);
      setPurgeTarget(null);
    }
  }

  const segments = STORAGE_CATEGORIES.map((meta) => {
    const bytes = catMap.get(meta.id)?.bytes ?? 0;
    const widthPct = used > 0 ? (bytes / used) * 100 : 0;
    return { meta, bytes, widthPct };
  }).filter((s) => s.bytes > 0);

  return (
    <>
      <Card className="border-border/60 overflow-hidden h-full">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CardContent className="p-0">
            <div className="p-5 space-y-4">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-start justify-between gap-3 text-left group"
                >
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-sky-500 shrink-0" />
                      พื้นที่ So1o (หลังบ้าน)
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          open && "rotate-180",
                        )}
                      />
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isLoading
                        ? "กำลังคำนวณ…"
                        : `${formatStorageBytes(used)} จาก ${formatStorageBytes(limit)} ที่ใช้ได้`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Badge
                        variant="secondary"
                        className={cn(isPro && "bg-primary/15 text-primary border-primary/20")}
                      >
                        {isPro ? <Crown className="h-3 w-3 mr-1" /> : null}
                        {TIER_LABEL[data?.tier ?? tier]}
                      </Badge>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={isFetching}
                      onClick={(e) => {
                        e.stopPropagation();
                        void refetch();
                      }}
                      aria-label="รีเฟรช"
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
                    </Button>
                  </div>
                </button>
              </CollapsibleTrigger>

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
                      ? "ใช้พื้นที่เกินโควต้าแล้ว — ลบข้อมูลบางส่วนหรืออัพเกรดเป็น Pro"
                      : "ใกล้เต็มโควต้าแล้ว — พิจารณาลบไฟล์เก่าหรืออัพเกรดแพ็กเกจ"}
                  </span>
                </div>
              )}

              {/* Stacked usage bar (design ref: segmented horizontal bar) */}
              <div className="space-y-2">
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
                  {isLoading ? (
                    <div className="h-full w-full animate-pulse bg-muted-foreground/20" />
                  ) : segments.length === 0 ? (
                    <div className="h-full w-full bg-muted-foreground/10" />
                  ) : (
                    segments.map(({ meta, widthPct }) => (
                      <div
                        key={meta.id}
                        className={cn("h-full min-w-[2px] transition-all", meta.colorClass)}
                        style={{ width: `${widthPct}%` }}
                        title={`${meta.label}: ${formatStorageBytes(catMap.get(meta.id)?.bytes ?? 0)}`}
                      />
                    ))
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {STORAGE_CATEGORIES.map((meta) => (
                    <span
                      key={meta.id}
                      className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
                    >
                      <span className={cn("h-2 w-2 rounded-full shrink-0", meta.colorClass)} />
                      {meta.label}
                    </span>
                  ))}
                </div>
              </div>

              {!open && !isLoading && (
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {pct}% ของโควต้า {STORAGE_QUOTA_LABEL[data?.tier ?? tier]}
                </p>
              )}
            </div>

            <CollapsibleContent>
              <div className="px-5 pb-5 space-y-3 border-t border-border/40 pt-4">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  โควต้า So1o: Free {STORAGE_QUOTA_LABEL.free} · Pro {STORAGE_QUOTA_LABEL.pro} ·
                  Pro+ {STORAGE_QUOTA_LABEL.pro_plus} · In-House {STORAGE_QUOTA_LABEL.inhouse}
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                  กระเป๋า Pixel100 (ผลงาน/แชท) แยกต่างหาก — จัดการที่{" "}
                  <a
                    href={`${(import.meta.env.VITE_ANTHEM_APP_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:8081"}/settings`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Pixel100 Settings → พื้นที่ Pixel100
                  </a>
                </p>

                {STORAGE_CATEGORIES.map((meta) => {
                  const usage = catMap.get(meta.id)!;
                  const catPct = limit > 0 ? Math.min(100, (usage.bytes / limit) * 100) : 0;
                  const isEmpty = usage.bytes === 0;

                  return (
                    <div
                      key={meta.id}
                      className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={cn("h-2.5 w-2.5 rounded-full shrink-0", meta.colorClass)}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-medium">{meta.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {meta.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold tabular-nums">
                            {formatStorageBytes(usage.bytes)}
                          </p>
                          {usage.fileCount > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              {usage.fileCount} ไฟล์
                            </p>
                          )}
                          {meta.id === "data" && usage.bytes > 0 && (
                            <p className="text-[10px] text-muted-foreground">ประมาณการ</p>
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", meta.colorClass)}
                          style={{ width: `${catPct}%` }}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                          disabled={isEmpty || purging}
                          onClick={() => setPurgeTarget(meta.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          ลบ{meta.label}
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  {!isPro && (
                    <Button asChild className="gap-1.5 flex-1">
                      <Link to="/pricing">
                        <Crown className="h-3.5 w-3.5" />
                        อัพเกรด Pro — เพิ่มเป็น {STORAGE_QUOTA_LABEL.pro}
                      </Link>
                    </Button>
                  )}
                  {tier === "pro" && (
                    <Button asChild variant="outline" className="gap-1.5 flex-1">
                      <Link to="/pricing">ดูแพ็ก In-House ({STORAGE_QUOTA_LABEL.inhouse})</Link>
                    </Button>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </CardContent>
        </Collapsible>
      </Card>

      <AlertDialog open={!!purgeTarget} onOpenChange={(v) => !v && setPurgeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบข้อมูล?</AlertDialogTitle>
            <AlertDialogDescription>
              {purgeTarget ? PURGE_WARNINGS[purgeTarget] : ""}
              <br />
              <span className="font-medium text-foreground">การลบนี้ไม่สามารถกู้คืนได้</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={purging}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              disabled={purging}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmPurge();
              }}
            >
              {purging ? <Loader2 className="h-4 w-4 animate-spin" /> : "ลบถาวร"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
