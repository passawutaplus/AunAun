import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BOOST_PACKAGES, useCreateAndPayBoost, type BoostTargetType } from "@/hooks/useBoost";
import {
  BOOST_CUSTOM_MAX_DAYS,
  BOOST_CUSTOM_MAX_THB,
  BOOST_CUSTOM_MIN_DAYS,
  BOOST_CUSTOM_MIN_THB,
  estimateBoostStats,
  formatBoostEstimateRange,
} from "@/lib/boostEstimate";
import { Eye, Loader2, MousePointerClick, SlidersHorizontal, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: BoostTargetType;
  targetId: string;
  targetTitle: string;
};

type BoostMode = "preset" | "custom";

const BoostDialog = ({ open, onOpenChange, targetType, targetId, targetTitle }: Props) => {
  const pay = useCreateAndPayBoost();
  const [mode, setMode] = useState<BoostMode>("preset");
  const [pkg, setPkg] = useState<(typeof BOOST_PACKAGES)[number]["id"]>("micro_7");
  const [customDays, setCustomDays] = useState("3");
  const [customAmount, setCustomAmount] = useState("150");

  const customDaysNum = Math.min(
    BOOST_CUSTOM_MAX_DAYS,
    Math.max(BOOST_CUSTOM_MIN_DAYS, parseInt(customDays, 10) || BOOST_CUSTOM_MIN_DAYS),
  );
  const customAmountNum = Math.min(
    BOOST_CUSTOM_MAX_THB,
    Math.max(BOOST_CUSTOM_MIN_THB, parseInt(customAmount, 10) || BOOST_CUSTOM_MIN_THB),
  );

  const estimate = useMemo(
    () => estimateBoostStats(customAmountNum, customDaysNum),
    [customAmountNum, customDaysNum],
  );

  const selectedPreset = BOOST_PACKAGES.find((p) => p.id === pkg) ?? BOOST_PACKAGES[1];
  const payLabel =
    mode === "preset"
      ? `ชำระและเริ่ม Boost ฿${selectedPreset.priceTHB.toLocaleString("th-TH")}`
      : `ชำระและเริ่ม Boost ฿${customAmountNum.toLocaleString("th-TH")} · ${customDaysNum} วัน`;

  const handlePay = async () => {
    try {
      const base =
        targetType === "project"
          ? `/project/${targetId}?boost=success`
          : `/community/${targetId}?boost=success`;
      const cancel = targetType === "project" ? `/project/${targetId}` : `/community/${targetId}`;

      if (mode === "preset") {
        await pay.mutateAsync({
          targetType,
          targetId,
          package: pkg,
          successPath: base,
          cancelPath: cancel,
        });
      } else {
        if (customAmountNum < BOOST_CUSTOM_MIN_THB) {
          toast.error(`งบขั้นต่ำ ฿${BOOST_CUSTOM_MIN_THB}`);
          return;
        }
        if (customDaysNum < BOOST_CUSTOM_MIN_DAYS) {
          toast.error(`ระยะเวลาขั้นต่ำ ${BOOST_CUSTOM_MIN_DAYS} วัน`);
          return;
        }
        await pay.mutateAsync({
          targetType,
          targetId,
          custom: { amountThb: customAmountNum, durationDays: customDaysNum },
          successPath: base,
          cancelPath: cancel,
        });
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Boost โพสต์
          </DialogTitle>
          <DialogDescription>
            ดัน &ldquo;{targetTitle}&rdquo; ให้เห็นมากขึ้นในฟีด — จ่ายแล้ว active ทันที
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-1">
          {BOOST_PACKAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setMode("preset");
                setPkg(p.id);
              }}
              className={cn(
                "flex items-center justify-between rounded-lg border p-3 text-left transition-colors",
                mode === "preset" && pkg === p.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.perk}</p>
              </div>
              <p className="font-semibold">฿{p.priceTHB.toLocaleString("th-TH")}</p>
            </button>
          ))}
        </div>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">หรือกำหนดเอง</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMode("custom")}
          className={cn(
            "w-full rounded-xl border p-4 text-left transition-colors space-y-3",
            mode === "custom" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
          )}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            กำหนดจำนวนวันและงบเอง
          </div>

          <div className="grid grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-1.5">
              <Label htmlFor="boost-days" className="text-xs text-muted-foreground">
                จำนวนวัน (ขั้นต่ำ {BOOST_CUSTOM_MIN_DAYS})
              </Label>
              <Input
                id="boost-days"
                type="number"
                min={BOOST_CUSTOM_MIN_DAYS}
                max={BOOST_CUSTOM_MAX_DAYS}
                value={customDays}
                onChange={(e) => {
                  setMode("custom");
                  setCustomDays(e.target.value);
                }}
                onFocus={() => setMode("custom")}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="boost-amount" className="text-xs text-muted-foreground">
                งบ (฿) ขั้นต่ำ {BOOST_CUSTOM_MIN_THB}
              </Label>
              <Input
                id="boost-amount"
                type="number"
                min={BOOST_CUSTOM_MIN_THB}
                max={BOOST_CUSTOM_MAX_THB}
                step={10}
                value={customAmount}
                onChange={(e) => {
                  setMode("custom");
                  setCustomAmount(e.target.value);
                }}
                onFocus={() => setMode("custom")}
                className="h-9"
              />
            </div>
          </div>

          {mode === "custom" && (
            <div className="rounded-lg bg-muted/40 p-3 space-y-2 text-xs">
              <p className="font-medium text-foreground">คาดการณ์ (โดยประมาณ ไม่ใช่การันตี)</p>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  แสดง{" "}
                  <span className="text-foreground font-medium tabular-nums">
                    {formatBoostEstimateRange(estimate.impressions.low, estimate.impressions.high)}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MousePointerClick className="w-3.5 h-3.5" />
                  คลิก{" "}
                  <span className="text-foreground font-medium tabular-nums">
                    {formatBoostEstimateRange(estimate.clicks.low, estimate.clicks.high)}
                  </span>
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                CTR คาดการณ์ ~{estimate.ctrLabel} · สถิติจริงดูได้หลังเริ่ม Boost
              </p>
            </div>
          )}
        </button>

        <p className="text-xs text-muted-foreground">
          ต่างจากโฆษณาแบรนด์ที่{" "}
          <a href="/advertise" className="underline">
            /advertise
          </a>{" "}
          — Boost สำหรับดันโพสต์ของคุณเอง
        </p>

        <Button className="w-full" onClick={handlePay} disabled={pay.isPending}>
          {pay.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {payLabel}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default BoostDialog;
