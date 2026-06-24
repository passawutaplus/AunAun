import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BOOST_PACKAGES, useCreateAndPayBoost, type BoostTargetType } from "@/hooks/useBoost";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: BoostTargetType;
  targetId: string;
  targetTitle: string;
};

const BoostDialog = ({ open, onOpenChange, targetType, targetId, targetTitle }: Props) => {
  const pay = useCreateAndPayBoost();
  const [pkg, setPkg] = useState<(typeof BOOST_PACKAGES)[number]["id"]>("micro_7");

  const handlePay = async () => {
    try {
      const base =
        targetType === "project"
          ? `/project/${targetId}?boost=success`
          : `/community/${targetId}?boost=success`;
      const cancel =
        targetType === "project" ? `/project/${targetId}` : `/community/${targetId}`;
      await pay.mutateAsync({
        targetType,
        targetId,
        package: pkg,
        successPath: base,
        cancelPath: cancel,
      });
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

        <div className="grid gap-2 py-2">
          {BOOST_PACKAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPkg(p.id)}
              className={cn(
                "flex items-center justify-between rounded-lg border p-3 text-left transition-colors",
                pkg === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
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

        <p className="text-xs text-muted-foreground">
          ต่างจากโฆษณาแบรนด์ที่{" "}
          <a href="/advertise" className="underline">
            /advertise
          </a>{" "}
          — Boost สำหรับดันโพสต์ของคุณเอง
        </p>

        <Button className="w-full" onClick={handlePay} disabled={pay.isPending}>
          {pay.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          ชำระและเริ่ม Boost
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default BoostDialog;
