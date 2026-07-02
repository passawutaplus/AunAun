import { useState } from "react";
import { HandHeart, Eye, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import { useCreatorEligibility } from "@/hooks/useCreatorEligibility";
import { useSupportSlots } from "@/hooks/useSupportSlots";
import { SUPPORT_SLOT_MAX } from "@/lib/supportSlots";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DonationModal from "./DonationModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const VISITOR_PREVIEW_TOAST = "นี่คือมุมมองผู้เยี่ยมชม — ปุ่มนี้ใช้งานได้จริงเมื่อคนอื่นเปิดโปรไฟล์ของคุณ";

interface Props {
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  projectId?: string | null;
  variant?: "default" | "outline" | "compact";
  hideSubtext?: boolean;
  className?: string;
  visitorPreview?: boolean;
}

const SupportButton = ({
  recipientId, recipientName, recipientAvatar, projectId, variant = "outline", hideSubtext = false, className,
  visitorPreview = false,
}: Props) => {
  const { user } = useAuth();
  const openAuth = useAuthDialog((s) => s.openLogin);
  const [open, setOpen] = useState(false);
  const isOwn = !!user && user.id === recipientId && !visitorPreview;
  const { data: eligibility } = useCreatorEligibility(isOwn ? undefined : recipientId);
  const { data: slots } = useSupportSlots(isOwn ? undefined : recipientId);
  const canReceive = isOwn || eligibility?.canReceiveGifts === true;
  const slotsFull = !isOwn && slots?.isFull === true;

  const handleOpen = () => {
    if (visitorPreview) {
      toast.message(VISITOR_PREVIEW_TOAST);
      return;
    }
    if (!user) { openAuth(); return; }
    if (!canReceive || slotsFull) return;
    setOpen(true);
  };

  const remaining = slots?.remaining ?? SUPPORT_SLOT_MAX;

  const tooltipText = isOwn
    ? "นี่คือผลงานของคุณเอง — กดเพื่อพรีวิวการส่งของขวัญ"
    : slotsFull
      ? `${recipientName} รับการสนับสนุนครบ ${SUPPORT_SLOT_MAX} ช่องแล้ว`
      : !canReceive
        ? `เตรียมรับสนับสนุน — ลงผลงานแรกเพื่อเปิด ${SUPPORT_SLOT_MAX} ช่อง`
        : `ส่ง Pixel เป็นกำลังใจให้ ${recipientName} · เหลือ ${remaining}/${SUPPORT_SLOT_MAX} ช่อง`;

  const wrapTooltip = (node: React.ReactNode) => (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{node}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  if (variant === "compact") {
    const chipClass = cn(
      "inline-flex items-center justify-center gap-1.5 rounded-full glass-chip w-full",
      hideSubtext ? "h-10 px-3 text-sm font-medium" : "px-3 py-2 text-xs sm:text-sm",
    );
    if (!isOwn && !canReceive) {
      return wrapTooltip(
        <span className={cn("inline-flex flex-col items-stretch gap-0.5 w-full", className)}>
          <span className={cn(chipClass, "text-muted-foreground")}>
            <Lock className="w-4 h-4 shrink-0" />
            <span className="truncate">เตรียมรับสนับสนุน</span>
          </span>
          {!hideSubtext && (
            <span className="text-[10px] text-muted-foreground px-1">ลงผลงานแรกเพื่อเปิด {SUPPORT_SLOT_MAX} ช่อง</span>
          )}
        </span>,
      );
    }
    if (!isOwn && slotsFull) {
      return wrapTooltip(
        <span className={cn(chipClass, "text-muted-foreground", className)}>
          <Lock className="w-4 h-4 shrink-0" />
          <span className="truncate">รับครบ {SUPPORT_SLOT_MAX} ช่อง</span>
        </span>,
      );
    }
    return (
      <>
        {wrapTooltip(
          <button
            onClick={handleOpen}
            aria-label={tooltipText}
            className={cn("inline-flex flex-col items-stretch gap-0.5 w-full", className)}
          >
            <span className={cn(chipClass, "text-primary hover:shadow-md hover:shadow-primary/20 transition")}>
              {isOwn ? <Eye className="w-4 h-4 shrink-0" /> : <HandHeart className="w-4 h-4 shrink-0" />}
              <span className="truncate">{isOwn ? "พรีวิว" : "สนับสนุน"}</span>
            </span>
            {!hideSubtext && !isOwn && canReceive && (
              <span className="text-[10px] text-muted-foreground px-1">
                เหลือ {remaining}/{SUPPORT_SLOT_MAX} ช่อง · มาเป็นกำลังใจ
              </span>
            )}
          </button>
        )}
        <DonationModal
          open={open}
          onOpenChange={setOpen}
          recipientId={recipientId}
          recipientName={recipientName}
          recipientAvatar={recipientAvatar}
          projectId={projectId}
          previewOnly={isOwn}
        />
      </>
    );
  }

  if (!isOwn && !canReceive) {
    return wrapTooltip(
      <div className="space-y-1">
        <Button
          disabled
          size="lg"
          variant="outline"
          className={`w-full rounded-full border-border text-muted-foreground ${className ?? ""}`}
        >
          <Lock className="w-4 h-4 mr-1.5" /> กำลังเตรียมรับการสนับสนุน
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          ลงผลงานแรกเพื่อเปิดรับสนับสนุน {SUPPORT_SLOT_MAX} ช่อง
        </p>
      </div>,
    );
  }

  if (!isOwn && slotsFull) {
    return wrapTooltip(
      <Button
        disabled
        size="lg"
        variant="outline"
        className={`w-full rounded-full border-border text-muted-foreground ${className ?? ""}`}
      >
        <Lock className="w-4 h-4 mr-1.5" /> รับครบ {SUPPORT_SLOT_MAX} ช่องแล้ว
      </Button>,
    );
  }

  return (
    <>
      {wrapTooltip(
        <div className="space-y-1">
          <Button
            onClick={handleOpen}
            size="lg"
            variant={variant === "outline" ? "outline" : "default"}
            aria-label={tooltipText}
            className={
              variant === "outline"
                ? `w-full rounded-full border-primary/30 text-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/50 ${className ?? ""}`
                : `w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90 ${className ?? ""}`
            }
          >
            {isOwn ? (
              <><Eye className="w-4 h-4 mr-1.5 text-primary" /> พรีวิวการส่งของขวัญ</>
            ) : (
              <><HandHeart className="w-4 h-4 mr-1.5 text-primary" /> สนับสนุน · เหลือ {remaining}/{SUPPORT_SLOT_MAX}</>
            )}
          </Button>
          {!isOwn && canReceive && (
            <p className="text-[11px] text-muted-foreground text-center">
              ช่วยให้ครีเอเตอร์มีกำลังใจต่อ — ช่องว่างเหลือ {remaining} ที่
            </p>
          )}
        </div>
      )}
      <DonationModal
        open={open}
        onOpenChange={setOpen}
        recipientId={recipientId}
        recipientName={recipientName}
        recipientAvatar={recipientAvatar}
        projectId={projectId}
        previewOnly={isOwn}
      />
    </>
  );
};

export default SupportButton;
