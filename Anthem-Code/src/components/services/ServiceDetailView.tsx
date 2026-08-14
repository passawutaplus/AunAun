import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Expand, Loader2, MessageCircle, X } from "lucide-react";
import {
  formatServiceDurationDays,
  formatServicePriceRange,
  formatServiceRevisions,
  servicePreviewUrls,
  type CreatorService,
} from "@/hooks/useCreatorServices";
import { formatCategoryBreadcrumb } from "@/data/categoryTaxonomy";
import { isVideoUrl } from "@/lib/videoAccept";
import HireTargetProfilePreview from "@/components/opportunity/HireTargetProfilePreview";
import ServicePackageWorksSection from "@/components/services/ServicePackageWorksSection";
import ImageLightbox from "@/components/project/ImageLightbox";
import { cn } from "@/lib/utils";

type Props = {
  service: CreatorService;
  creatorName?: string | null;
  creatorUsername?: string | null;
  creatorAvatarUrl?: string | null;
  creatorRole?: string | null;
  creatorId?: string | null;
  busy?: boolean;
  previewOnly?: boolean;
  /** dialog = compact modal shell; page = full-page layout */
  variant?: "dialog" | "page";
  /** Hide creator header (e.g. live editor preview) */
  hideCreator?: boolean;
  onRequest: (service: CreatorService) => void;
  /** Parent dialogs can block dismiss while the lightbox is open. */
  onLightboxOpenChange?: (open: boolean) => void;
};

/**
 * Shared package detail body.
 * Breakpoints: mobile (&lt;md) stack + sticky CTA; tablet (md) 2-col; desktop (lg) wider.
 */
export default function ServiceDetailView({
  service,
  creatorName,
  creatorUsername,
  creatorAvatarUrl,
  creatorRole,
  creatorId,
  busy,
  previewOnly,
  variant = "dialog",
  hideCreator,
  onRequest,
  onLightboxOpenChange,
}: Props) {
  const media = servicePreviewUrls(service);
  const imageMedia = useMemo(() => media.filter((u) => !isVideoUrl(u)), [media]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const active = media[Math.min(activeIdx, Math.max(0, media.length - 1))] ?? null;
  const duration = formatServiceDurationDays(service.duration_label);
  const revisions = formatServiceRevisions(service.revisions_label);
  const exclusions = service.exclusions_note?.trim() || "";
  const isPage = variant === "page";

  useEffect(() => {
    onLightboxOpenChange?.(lightboxOpen);
  }, [lightboxOpen, onLightboxOpenChange]);

  const setLightbox = (next: boolean) => {
    setLightboxOpen(next);
    onLightboxOpenChange?.(next);
  };

  const openLightbox = (mediaIndex = activeIdx) => {
    const url = media[mediaIndex];
    if (!url || isVideoUrl(url)) return;
    const imgIdx = imageMedia.indexOf(url);
    if (imgIdx < 0) return;
    setActiveIdx(mediaIndex);
    setLightboxIndex(imgIdx);
    setLightbox(true);
  };

  const requestButton = (
    <Button
      type="button"
      className="w-full rounded-full gap-1.5 min-h-11"
      disabled={previewOnly || busy}
      aria-disabled={previewOnly || busy}
      onClick={() => {
        if (previewOnly) return;
        onRequest(service);
      }}
    >
      {busy && !previewOnly ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <MessageCircle className="w-4 h-4" />
      )}
      {busy && !previewOnly ? "กำลังเปิด..." : "ขอใช้บริการนี้"}
    </Button>
  );

  const priceBlock = (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card/50 p-4 space-y-3",
        isPage && "md:sticky md:top-20",
      )}
    >
      <p className="text-2xl font-semibold text-primary tabular-nums lg:text-[1.75rem]">
        {formatServicePriceRange(service.price_min_thb, service.price_thb)}
      </p>
      {duration || revisions ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {duration ? (
            <span>
              ระยะเวลา: <span className="text-foreground font-medium">{duration}</span>
            </span>
          ) : null}
          {revisions ? (
            <span>
              แก้ไข: <span className="text-foreground font-medium">{revisions}</span>
            </span>
          ) : null}
        </div>
      ) : previewOnly ? (
        <p className="text-sm text-muted-foreground">ระยะเวลา: —</p>
      ) : null}
      {/* Desktop / tablet CTA in sidebar */}
      <div className="hidden md:block">{requestButton}</div>
      {previewOnly ? (
        <p className="hidden md:block text-center text-[11px] text-muted-foreground">
          ตัวอย่าง — ปุ่มขอใช้บริการกดไม่ได้
        </p>
      ) : null}
    </div>
  );

  const aboutBlock = (
    <>
      <h2
        className={cn(
          "font-semibold text-foreground tracking-tight leading-tight",
          isPage ? "text-xl md:text-2xl" : "text-lg md:text-xl",
        )}
      >
        {service.title}
      </h2>

      {service.category?.trim() ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            หมวด{" "}
            <span className="font-medium text-foreground">
              {formatCategoryBreadcrumb(service.category, service.tags)}
            </span>
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">รายละเอียด</h3>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {service.summary}
        </p>
      </div>
    </>
  );

  const sidebarDetailsBlock = (
    <>
      {service.deliverables.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">สิ่งที่คุณจะได้</h3>
          <ul className="space-y-1.5">
            {service.deliverables.map((d, i) => (
              <li
                key={`${d}-${i}`}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {exclusions ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">สิ่งที่ไม่รวม</h3>
          <p className="flex items-start gap-2 text-sm text-muted-foreground whitespace-pre-wrap">
            <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/80" />
            <span>{exclusions}</span>
          </p>
        </div>
      ) : null}

      {(service.reference_project_ids?.length ?? 0) > 0 ? (
        <ServicePackageWorksSection
          projectIds={service.reference_project_ids}
          serviceId={service.id}
          compact={!isPage}
        />
      ) : null}
    </>
  );

  return (
    <div className={cn("flex flex-col", isPage && "min-h-0")}>
      <div
        className={cn(
          "grid grid-cols-1",
          // tablet + desktop: two columns
          "md:grid-cols-[1.35fr_1fr] lg:grid-cols-[1.45fr_1fr]",
        )}
      >
        <div
          className={cn(
            "space-y-3 border-border/50",
            isPage
              ? "p-4 md:p-5 lg:p-6 md:border-r"
              : "p-4 pt-3 md:p-5 md:pt-3 border-b md:border-b-0 md:border-r",
          )}
        >
          {!hideCreator && creatorName?.trim() ? (
            <HireTargetProfilePreview
              name={creatorName}
              username={creatorUsername}
              avatarUrl={creatorAvatarUrl}
              role={creatorRole}
              freelancerId={creatorId ?? service.owner_id}
            />
          ) : null}

          <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/20">
            <div className="aspect-[4/3] bg-black/20">
              {active ? (
                isVideoUrl(active) ? (
                  <video
                    key={active}
                    src={active}
                    controls
                    playsInline
                    className="h-full w-full object-contain bg-black"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => openLightbox(activeIdx)}
                    className="group relative block h-full w-full cursor-zoom-in"
                    aria-label="ดูภาพเต็ม"
                  >
                    <img src={active} alt="" className="h-full w-full object-cover" />
                    <span className="pointer-events-none absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-90 transition group-hover:bg-black/70">
                      <Expand className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  </button>
                )
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  ยังไม่มีสื่อ
                </div>
              )}
            </div>
          </div>

          {media.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {media.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  onDoubleClick={() => openLightbox(i)}
                  className={cn(
                    "relative h-14 w-[4.5rem] shrink-0 overflow-hidden rounded-lg border touch-manipulation",
                    i === activeIdx ? "border-primary ring-1 ring-primary" : "border-border/60",
                  )}
                  aria-label={isVideoUrl(url) ? `วิดีโอ ${i + 1}` : `ดูภาพ ${i + 1}`}
                >
                  {isVideoUrl(url) ? (
                    <video src={url} muted playsInline className="h-full w-full object-cover" />
                  ) : (
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          ) : null}

          <div className="space-y-3 pt-1">{aboutBlock}</div>

          {/* Mobile: price under media + about */}
          <div className="md:hidden">{priceBlock}</div>
        </div>

        <div
          className={cn(
            "flex flex-col gap-4",
            isPage ? "p-4 md:p-5 lg:p-6" : "p-4 pt-3 md:p-5 md:pt-3",
            // room for sticky mobile CTA
            !previewOnly && "pb-24 md:pb-4",
            previewOnly && "pb-4",
          )}
        >
          <div className="hidden md:block">{priceBlock}</div>
          {sidebarDetailsBlock}
        </div>
      </div>

      {/* Mobile sticky CTA */}
      {!previewOnly ? (
        <div
          className={cn(
            "md:hidden sticky bottom-0 z-10 border-t border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85",
            "px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
            isPage && "fixed inset-x-0 bottom-0",
          )}
        >
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <p className="min-w-0 flex-1 text-base font-semibold text-primary tabular-nums truncate">
              {formatServicePriceRange(service.price_min_thb, service.price_thb)}
            </p>
            <Button
              type="button"
              className="rounded-full gap-1.5 min-h-11 px-5 shrink-0"
              disabled={busy}
              onClick={() => onRequest(service)}
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageCircle className="w-4 h-4" />
              )}
              ขอใช้บริการนี้
            </Button>
          </div>
        </div>
      ) : (
        <div className="md:hidden px-4 pb-4 space-y-2">
          {requestButton}
          <p className="text-center text-[11px] text-muted-foreground">
            ตัวอย่าง — ปุ่มขอใช้บริการกดไม่ได้
          </p>
        </div>
      )}

      <ImageLightbox
        images={imageMedia}
        index={lightboxIndex}
        open={lightboxOpen && imageMedia.length > 0}
        onClose={() => setLightbox(false)}
        onIndexChange={(idx) => {
          setLightboxIndex(idx);
          const url = imageMedia[idx];
          if (!url) return;
          const mediaIdx = media.indexOf(url);
          if (mediaIdx >= 0) setActiveIdx(mediaIdx);
        }}
        alt={service.title}
      />
    </div>
  );
}
