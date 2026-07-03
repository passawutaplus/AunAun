import { useMemo } from "react";
import { Copy, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useReferralDashboard } from "@/hooks/useReferral";
import { buildReferralShareUrl } from "@/lib/referralDashboard";

type Props = {
  /** When false, skip fetching until parent is visible (e.g. closed dialog). */
  enabled?: boolean;
};

export function ReferralInlineShare({ enabled = true }: Props) {
  const { data, isLoading, error } = useReferralDashboard({ enabled });

  const referralLink = useMemo(
    () => (data?.code ? buildReferralShareUrl(data.code) : ""),
    [data?.code],
  );

  const shareText = `มาสร้างผลงานบน Aplus1 — สมัครผ่านลิงก์นี้รับ ${data?.signup_reward_px ?? 20} px เริ่มต้น`;

  const copyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("คัดลอกลิงก์ชวนเพื่อนแล้ว");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ — ลองเลือกลิงก์แล้วคัดลอกเอง");
    }
  };

  const share = async () => {
    if (!referralLink) return;
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: "ชวนเพื่อนมา Aplus1",
        text: shareText,
        url: referralLink,
      });
    } catch {
      /* cancelled */
    }
  };

  if (isLoading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        กำลังเตรียมลิงก์…
      </div>
    );
  }

  if (error || !referralLink) {
    return (
      <p className="mt-3 text-xs text-destructive">โหลดลิงก์ไม่สำเร็จ — ลองใหม่จากหน้าชวนเพื่อน</p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">ลิงก์ของคุณ</p>
        <p className="text-xs font-mono text-foreground break-all leading-snug">{referralLink}</p>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 h-8 rounded-full text-xs gap-1.5"
          onClick={() => void copyLink()}
        >
          <Copy className="w-3.5 h-3.5" />
          คัดลอก
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1 h-8 rounded-full text-xs gap-1.5"
          onClick={() => void share()}
        >
          <Share2 className="w-3.5 h-3.5" />
          แชร์
        </Button>
      </div>
    </div>
  );
}
