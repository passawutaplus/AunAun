import { useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import BoostDialog from "@/components/boost/BoostDialog";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import type { BoostTargetType } from "@/hooks/useBoost";
import { cn } from "@/lib/utils";

type Props = {
  targetType: BoostTargetType;
  targetId: string;
  targetTitle: string;
  ownerId: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "icon";
  className?: string;
};

const BoostButton = ({
  targetType,
  targetId,
  targetTitle,
  ownerId,
  variant = "outline",
  size = "sm",
  className,
}: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user || user.id !== ownerId) return null;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn("gap-1", className)}
        onClick={(e) => {
          e.stopPropagation();
          if (!user) {
            useAuthDialog.getState().openLogin();
            return;
          }
          setOpen(true);
        }}
      >
        <Zap className="h-3.5 w-3.5 text-amber-500" />
        Boost
      </Button>
      <BoostDialog
        open={open}
        onOpenChange={setOpen}
        targetType={targetType}
        targetId={targetId}
        targetTitle={targetTitle}
      />
    </>
  );
};

export default BoostButton;
