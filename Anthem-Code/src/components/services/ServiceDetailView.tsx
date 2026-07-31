import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2, MessageCircle } from "lucide-react";
import {
  formatServiceDurationDays,
  formatServicePriceRange,
  servicePreviewUrls,
  type CreatorService,
} from "@/hooks/useCreatorServices";
import { formatCategoryBreadcrumb, stripCategorySubTags } from "@/data/categoryTaxonomy";
import { isVideoUrl } from "@/lib/videoAccept";
import { PACKAGE_INQUIRY_PLATFORM_DISCLAIMER } from "@/lib/legalSignupCopy";
import HireTargetProfilePreview from "@/components/opportunity/HireTargetProfilePreview";
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
  onRequest: (service: CreatorService) => void;
  onClosePreview?: () => void;
};

function parseMetaCount(raw: string): number {
  const n = Number.parseInt(String(raw ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

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
  onRequest,
  onClosePreview,
}: Props) {
  const media = servicePreviewUrls(service);
  const [activeIdx, setActiveIdx] = useState(0);
  const active = media[Math.min(activeIdx, Math.max(0, media.length - 1))] ?? null;
  const duration = formatServiceDurationDays(service.duration_label);
  const conceptsN = parseMetaCount(service.concepts_label);
  const revisionsN = parseMetaCount(service.revisions_label);
  const isPage = variant === "page";

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
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {duration ? (
          <span>
            ระยะเวลา: <span className="text-foreground font-medium">{duration}</span>
          </span>
        ) : null}
        {conceptsN > 0 ? (
          <span>
            แนวคิด: <span className="text-foreground font-medium tabular-nums">{conceptsN}</span>
          </span>
        ) : null}
        {revisionsN > 0 ? (
          <span>
            รอบแก้: <span className="text-foreground font-medium tabular-nums">{revisionsN}</span>
          </span>
        ) : null}
      </div>
      {/* Desktop / tablet CTA in sidebar */}
      <div className="hidden md:block">
        {previewOnly ? (
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full min-h-11"
            onClick={onClosePreview}
          >
            ปิดตัวอย่าง
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full rounded-full gap-1.5 min-h-11"
            disabled={busy}
            onClick={() => onRequest(service)}
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
            {busy ? "กำลังเปิด..." : "ขอใช้บริการนี้"}
          </Button>
        )}
      </div>
    </div>
  );

  const detailsBlock = (
    <>
      {(service.category?.trim() || stripCategorySubTags(service.tags).length > 0) ? (
        <div className="space-y-2">
          {service.category?.trim() ? (
            <p className="text-xs text-muted-foreground">
              หมวด{" "}
              <span className="font-medium text-foreground">
                {formatCategoryBreadcrumb(service.category, service.tags)}
              </span>
            </p>
          ) : null}
          {stripCategorySubTags(service.tags).length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {stripCategorySubTags(service.tags).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">รายละเอียด</h3>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {service.summary}
        </p>
      </div>

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
          {creatorName?.trim() ? (
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
                  <img src={active} alt="" className="h-full w-full object-cover" />
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
                  className={cn(
                    "relative h-14 w-[4.5rem] shrink-0 overflow-hidden rounded-lg border touch-manipulation",
                    i === activeIdx ? "border-primary ring-1 ring-primary" : "border-border/60",
                  )}
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

          {/* Mobile: price under media (before long text) */}
          <div className="md:hidden">{priceBlock}</div>
        </div>

        <div
          className={cn(
            "flex flex-col gap-4",
            isPage ? "p-4 md:p-5 lg:p-6" : "p-4 pt-3 md:p-5 md:pt-3",
            // room for sticky mobile CTA
            !previewOnly && "pb-24 md:pb-4",
          )}
        >
          <div className="hidden md:block">{priceBlock}</div>
          {detailsBlock}
        </div>
      </div>

      {!previewOnly ? (
        <div className="border-t border-border/50 px-4 py-3 md:px-5 lg:px-6">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {PACKAGE_INQUIRY_PLATFORM_DISCLAIMER}
          </p>
        </div>
      ) : null}

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
        <div className="md:hidden px-4 pb-4">
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full min-h-11"
            onClick={onClosePreview}
          >
            ปิดตัวอย่าง
          </Button>
        </div>
      )}
    </div>
  );
}
