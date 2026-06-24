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

interface Props {
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  projectId?: string | null;
  variant?: "default" | "outline" | "compact";
  className?: string;
}

const SupportButton = ({
  recipientId, recipientName, recipientAvatar, projectId, variant = "outline", className,
}: Props) => {
  const { user } = useAuth();
  const openAuth = useAuthDialog((s) => s.openLogin);
  const [open, setOpen] = useState(false);
  const isOwn = !!user && user.id === recipientId;
  const { data: eligibility } = useCreatorEligibility(isOwn ? undefined : recipientId);
  const { data: slots } = useSupportSlots(isOwn ? undefined : recipientId);
  const canReceive = isOwn || eligibility?.canReceiveGifts === true;
  const slotsFull = !isOwn && slots?.isFull === true;

  const handleOpen = () => {
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
    if (!isOwn && !canReceive) {
      return wrapTooltip(
        <span className="inline-flex flex-col items-start gap-0.5">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full glass-chip text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5" /> เตรียมรับสนับสนุน
          </span>
          <span className="text-[10px] text-muted-foreground px-1">ลงผลงานแรกเพื่อเปิด {SUPPORT_SLOT_MAX} ช่อง</span>
        </span>,
      );
    }
    if (!isOwn && slotsFull) {
      return wrapTooltip(
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full glass-chip text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5" /> รับครบ {SUPPORT_SLOT_MAX} ช่องแล้ว
        </span>,
      );
    }
    return (
      <>
        {wrapTooltip(
          <button
            onClick={handleOpen}
            aria-label={tooltipText}
            className={`inline-flex flex-col items-start gap-0.5 ${className ?? ""}`}
          >
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full glass-chip text-xs font-medium text-primary hover:shadow-md hover:shadow-primary/20 transition">
              {isOwn ? <Eye className="w-3.5 h-3.5" /> : <HandHeart className="w-3.5 h-3.5" />}
              {isOwn ? "พรีวิว" : "สนับสนุน"}
            </span>
            {!isOwn && canReceive && (
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
