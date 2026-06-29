import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Copy,
  Facebook,
  Link2,
  MessageCircle,
  Send,
  Share2,
  Twitter,
  UserPlus,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReferralDashboard } from "@/hooks/useReferral";
import { buildReferralShareUrl } from "@/lib/referralDashboard";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SOCIAL_SHARE = [
  {
    key: "facebook",
    label: "Facebook",
    icon: Facebook,
    color: "text-[#1877F2]",
    buildHref: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: "x",
    label: "X",
    icon: Twitter,
    color: "text-foreground",
    buildHref: (url: string, text: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    key: "line",
    label: "LINE",
    icon: MessageCircle,
    color: "text-[#06C755]",
    buildHref: (url: string) => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
  },
] as const;

function ReferralShareBody({ onClose, enabled }: { onClose: () => void; enabled: boolean }) {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch, isFetching } = useReferralDashboard({ enabled });

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

  const nativeShare = async () => {
    if (!referralLink) return;
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title: "ชวนเพื่อนมา Aplus1", text: shareText, url: referralLink });
    } catch {
      /* cancelled */
    }
  };

  if (isLoading || (isFetching && !data)) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">กำลังเตรียมลิงก์ของคุณ…</div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4 py-6 text-center">
        <p className="text-sm text-destructive">โหลดลิงก์ชวนเพื่อนไม่สำเร็จ</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" variant="outline" className="rounded-full" onClick={() => void refetch()}>
            ลองอีกครั้ง
          </Button>
          <Button type="button" variant="ghost" className="rounded-full" onClick={() => navigate("/referrals")}>
            เปิดหน้าชวนเพื่อน
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">ชวนเพื่อนรับ Pixel</p>
        <h2 className="mt-2 text-xl font-semibold text-foreground">แชร์ลิงก์ รับ {data.referrer_reward_px} px</h2>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
          เมื่อเพื่อนสมัครและเผยแพร่ผลงานหรือโพสต์ Area ครั้งแรกสำเร็จ
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-muted/40 p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">ลิงก์ของคุณ</p>
        <p className="break-all text-sm font-mono text-foreground leading-snug">{referralLink}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={copyLink} variant="outline" className="flex-1 rounded-full gap-2 min-w-[8rem]">
          <Copy className="h-4 w-4" /> คัดลอกลิงก์
        </Button>
        <Button type="button" onClick={nativeShare} className="flex-1 rounded-full gap-2 min-w-[8rem]">
          <Share2 className="h-4 w-4" /> แชร์
        </Button>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2.5">แชร์ไปโซเชียล</p>
        <div className="grid grid-cols-3 gap-2">
          {SOCIAL_SHARE.map(({ key, label, icon: Icon, color, buildHref }) => (
            <a
              key={key}
              href={
                key === "x"
                  ? (buildHref as (u: string, t: string) => string)(referralLink, shareText)
                  : (buildHref as (u: string) => string)(referralLink)
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card py-3",
                "hover:border-primary/40 hover:bg-primary/5 transition-colors",
              )}
            >
              <Icon className={cn("h-5 w-5", color)} />
              <span className="text-xs font-medium">{label}</span>
            </a>
          ))}
        </div>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            type="button"
            onClick={nativeShare}
            className="mt-2 w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <Send className="h-4 w-4 text-primary" />
            แชร์ผ่านแอปบนเครื่อง
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/60 bg-card/50 p-3">
        <MiniStat icon={UserPlus} label="สมัครแล้ว" value={data.invited_count} />
        <MiniStat icon={CheckCircle2} label="สำเร็จ" value={data.qualified_count} />
        <MiniStat icon={Wallet} label="ได้รับ" value={data.earned_px} suffix="px" />
      </div>

      <Button
        type="button"
        variant="ghost"
        className="w-full rounded-full text-muted-foreground"
        onClick={() => {
          onClose();
          navigate("/referrals");
        }}
      >
        <Link2 className="h-4 w-4 mr-1.5" /> ดูสถิติและรายละเอียดทั้งหมด
      </Button>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="text-center min-w-0">
      <Icon className="h-4 w-4 text-primary mx-auto" />
      <p className="mt-1 text-[10px] text-muted-foreground truncate">{label}</p>
      <p className="text-sm font-semibold tabular-nums">
        {value.toLocaleString()}
        {suffix && <span className="text-[10px] font-normal text-muted-foreground ml-0.5">{suffix}</span>}
      </p>
    </div>
  );
}

const ReferralShareSheet = ({ open, onOpenChange }: Props) => {
  const isMobile = useIsMobile();
  const close = () => onOpenChange(false);
  const body = <ReferralShareBody onClose={close} enabled={open} />;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="pb-[env(safe-area-inset-bottom)]">
          <div className="px-5 pt-4 pb-8">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-border/60 p-6 sm:p-7" aria-describedby={undefined}>
        <DialogTitle className="sr-only">ชวนเพื่อนรับ Pixel</DialogTitle>
        {body}
      </DialogContent>
    </Dialog>
  );
};

export default ReferralShareSheet;
