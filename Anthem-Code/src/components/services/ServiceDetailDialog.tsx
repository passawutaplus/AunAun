import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import type { CreatorService } from "@/hooks/useCreatorServices";
import { recordCreatorServiceView } from "@/hooks/usePackageOverviewSeries";
import ServiceDetailView from "@/components/services/ServiceDetailView";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: CreatorService | null;
  creatorName?: string | null;
  creatorUsername?: string | null;
  creatorAvatarUrl?: string | null;
  creatorRole?: string | null;
  creatorId?: string | null;
  referrerProjectId?: string | null;
  busy?: boolean;
  previewOnly?: boolean;
  onRequest: (service: CreatorService) => void;
};

/**
 * Package detail modal.
 * Mobile: stacked + sticky CTA; tablet (md): 2-col; desktop (lg): wider shell.
 */
export default function ServiceDetailDialog({
  open,
  onOpenChange,
  service,
  creatorName,
  creatorUsername,
  creatorAvatarUrl,
  creatorRole,
  creatorId,
  referrerProjectId,
  busy,
  previewOnly,
  onRequest,
}: Props) {
  const { user } = useAuth();

  useEffect(() => {
    if (!open || previewOnly || !service?.id || !user?.id) return;
    void recordCreatorServiceView({
      viewerId: user.id,
      serviceId: service.id,
      ownerId: service.owner_id,
      referrerProjectId,
    });
  }, [open, previewOnly, service?.id, service?.owner_id, user?.id, referrerProjectId]);

  if (!service) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className={[
          "w-[calc(100vw-1rem)] max-w-lg",
          "md:max-w-3xl lg:max-w-4xl",
          "max-h-[min(92dvh,92vh)]",
          "overflow-y-auto overscroll-contain p-0 gap-0",
          "rounded-2xl sm:rounded-lg",
        ].join(" ")}
      >
        <DialogHeader className="space-y-0 px-4 pt-4 pb-0 text-left md:px-5 md:pt-5 lg:px-6 sticky top-0 z-[1] bg-card/95 backdrop-blur">
          <DialogTitle className="text-lg md:text-xl leading-tight tracking-tight pr-10">
            {service.title}
          </DialogTitle>
        </DialogHeader>

        <ServiceDetailView
          service={service}
          creatorName={creatorName}
          creatorUsername={creatorUsername}
          creatorAvatarUrl={creatorAvatarUrl}
          creatorRole={creatorRole}
          creatorId={creatorId}
          busy={busy}
          previewOnly={previewOnly}
          variant="dialog"
          onRequest={onRequest}
          onClosePreview={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
