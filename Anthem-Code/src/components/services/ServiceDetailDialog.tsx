import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { CreatorService } from "@/hooks/useCreatorServices";
import { recordCreatorServiceView } from "@/hooks/usePackageOverviewSeries";
import ServiceDetailView from "@/components/services/ServiceDetailView";
import ServiceRelatedPackages from "@/components/services/ServiceRelatedPackages";
import { PACKAGE_INQUIRY_PLATFORM_DISCLAIMER } from "@/lib/legalSignupCopy";

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
  /** Show Publish in preview header (editor flow). */
  onPublish?: () => void;
  publishBusy?: boolean;
  onRequest: (service: CreatorService) => void;
  /** Switch to another package while staying in the modal (show flow). */
  onSelectRelated?: (service: CreatorService) => void;
};

/**
 * Package detail modal.
 * Mobile: stacked + sticky CTA; tablet (md): 2-col; desktop (lg): wider shell.
 * Close via the built-in X (top-right).
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
  onPublish,
  publishBusy,
  onRequest,
  onSelectRelated,
}: Props) {
  const { user } = useAuth();
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!open) setLightboxOpen(false);
  }, [open]);

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

  const profilePackagesHref = `/u/${creatorUsername || service.owner_id}?tab=services`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={[
          "w-[calc(100vw-1rem)] max-w-lg",
          "md:max-w-3xl lg:max-w-5xl",
          "max-h-[min(92dvh,92vh)]",
          "overflow-y-auto overscroll-contain p-0 gap-0",
          "rounded-2xl sm:rounded-lg",
        ].join(" ")}
        onPointerDownOutside={(e) => {
          if (lightboxOpen) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (lightboxOpen) e.preventDefault();
        }}
        onFocusOutside={(e) => {
          if (lightboxOpen) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (lightboxOpen) e.preventDefault();
        }}
      >
        <DialogTitle className="sr-only">{service.title}</DialogTitle>
        {previewOnly && onPublish ? (
          <div className="sticky top-0 z-[1] flex justify-end bg-card/95 px-4 pt-3 pb-0 backdrop-blur md:px-5 md:pt-4 lg:px-6 pr-14">
            <Button
              type="button"
              size="sm"
              className="rounded-full shrink-0"
              disabled={!!publishBusy || !!busy}
              onClick={onPublish}
            >
              {publishBusy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              เผยแพร่
            </Button>
          </div>
        ) : null}

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
          onLightboxOpenChange={setLightboxOpen}
        />

        <div className="border-t border-border/50 px-4 py-5 md:px-5 lg:px-6 space-y-6">
          <ServiceRelatedPackages
            service={service}
            creatorName={creatorName}
            creatorUsername={creatorUsername}
            creatorAvatarUrl={creatorAvatarUrl}
            profilePackagesHref={previewOnly ? null : profilePackagesHref}
            compact
            alwaysShowCreatorSection={previewOnly}
            onSelectService={
              onSelectRelated
                ? (svc) => onSelectRelated(svc)
                : undefined
            }
          />
          {!previewOnly ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground border-t border-border/50 pt-5">
              {PACKAGE_INQUIRY_PLATFORM_DISCLAIMER}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
