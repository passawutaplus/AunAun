import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Clock3, Expand, Layers, Loader2, MessageCircle, Pencil, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import type { PackageChoice } from "@/hooks/useChatAboutPackage";
import {
  formatServiceDurationDays,
  formatServicePrice,
  formatServicePriceRange,
  formatServiceRevisions,
  servicePreviewUrls,
  type CreatorService,
} from "@/hooks/useCreatorServices";
import { isVideoUrl } from "@/lib/videoAccept";
import { packageDetailTags, packageTagFeedUrl } from "@/lib/packageRoutes";
import HireTargetProfilePreview from "@/components/opportunity/HireTargetProfilePreview";
import ServicePackageActions from "@/components/services/ServicePackageActions";
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
  onRequest: (service: CreatorService, choice?: PackageChoice) => void;
  /** Viewer owns this package: the CTA becomes "แก้ไขแพ็กเกจ". */
  onEdit?: () => void;
  /** Accepted / closed jobs on this package. */
  hireCount?: number;
  /** Creator's typical first reply in hire chats (minutes). */
  responseMinutes?: number | null;
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
  onEdit,
  hireCount = 0,
  responseMinutes = null,
  onLightboxOpenChange,
}: Props) {
  const media = servicePreviewUrls(service);
  const imageMedia = useMemo(() => media.filter((u) => !isVideoUrl(u)), [media]);
  const detailTags = useMemo(
    () => packageDetailTags(service.category, service.tags),
    [service.category, service.tags],
  );
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const active = media[Math.min(activeIdx, Math.max(0, media.length - 1))] ?? null;
  const duration = formatServiceDurationDays(service.duration_label);
  const flatRevisions = formatServiceRevisions(service.revisions_label);
  const flatExclusions = service.exclusions_note?.trim() || "";
  const isPage = variant === "page";
  // Save / share only on the real page, not in editor previews.
  const showActions = isPage && !previewOnly;
  const tiers = service.tiers ?? [];
  const addons = service.addons ?? [];
  const faq = service.faq ?? [];
  const [tierIdx, setTierIdx] = useState(0);
  const [requestedTier, setRequestedTier] = useState<number | null>(null);
  const [pickedAddons, setPickedAddons] = useState<number[]>([]);
  const tier = tiers.length ? tiers[Math.min(tierIdx, tiers.length - 1)] : null;
  const addonTotal = pickedAddons.reduce((sum, i) => sum + (addons[i]?.price_thb ?? 0), 0);
  const choice: PackageChoice = { tier, addons: pickedAddons.map((i) => addons[i]).filter(Boolean) };
  const priceLabel = tier
    ? formatServicePrice(tier.price_thb + addonTotal)
    : addonTotal > 0
      ? formatServicePriceRange(
          (service.price_min_thb || service.price_thb) + addonTotal,
          service.price_thb + addonTotal,
        )
      : formatServicePriceRange(service.price_min_thb, service.price_thb);
  const shownDuration = tier?.duration_days ? `${tier.duration_days} วัน` : duration;
  const revisions = tier ? (tier.revisions ? formatServiceRevisions(String(tier.revisions)) : "") : flatRevisions;
  const exclusions = tier ? tier.exclusions.trim() : flatExclusions;
  const deliverables = tier?.deliverables.length ? tier.deliverables : service.deliverables;
  const responseLabel =
    responseMinutes == null
      ? null
      : responseMinutes <= 60
        ? "ตอบกลับภายใน 1 ชม."
        : responseMinutes <= 24 * 60
          ? `ตอบกลับภายใน ~${Math.ceil(responseMinutes / 60)} ชม.`
          : null;

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

  const requestButton = onEdit ? (
    <Button type="button" variant="outline" className="w-full rounded-full gap-1.5 min-h-11" onClick={onEdit}>
      <Pencil className="w-4 h-4" aria-hidden />
      แก้ไขแพ็กเกจ
    </Button>
  ) : (
    <Button
      type="button"
      className="w-full rounded-full gap-1.5 min-h-11"
      disabled={previewOnly || busy}
      aria-disabled={previewOnly || busy}
      onClick={() => {
        if (previewOnly) return;
        onRequest(service, choice);
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
      {tiers.length > 1 ? (
        <div
          className="grid gap-1 rounded-full bg-muted/50 p-1"
          style={{ gridTemplateColumns: `repeat(${tiers.length}, minmax(0, 1fr))` }}
          role="tablist"
          aria-label="ระดับแพ็กเกจ"
        >
          {tiers.map((t, i) => (
            <button
              key={`${t.name}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === tierIdx}
              onClick={() => setTierIdx(i)}
              className={cn(
                "truncate rounded-full px-2 py-1.5 text-xs font-medium transition-colors",
                i === tierIdx ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      ) : null}
      <p className="text-2xl font-semibold text-primary tabular-nums lg:text-[1.75rem]">{priceLabel}</p>
      {tier?.summary ? <p className="-mt-1 text-sm text-muted-foreground">{tier.summary}</p> : null}
      {shownDuration || revisions ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {shownDuration ? (
            <span>
              ระยะเวลา: <span className="text-foreground font-medium">{shownDuration}</span>
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
      {addons.length > 0 && !onEdit ? (
        <div className="space-y-1.5 border-t border-border/50 pt-3">
          <p className="text-xs font-medium text-foreground">บริการเสริม</p>
          {addons.map((a, i) => (
            <label key={`${a.label}-${i}`} className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={pickedAddons.includes(i)}
                disabled={previewOnly}
                onCheckedChange={(v) => setPickedAddons((cur) => (v ? [...cur, i] : cur.filter((x) => x !== i)))}
              />
              <span className="min-w-0 flex-1 truncate">{a.label}</span>
              <span className="shrink-0 tabular-nums">+{formatServicePrice(a.price_thb)}</span>
            </label>
          ))}
        </div>
      ) : addons.length > 0 ? (
        <p className="text-xs text-muted-foreground">บริการเสริม {addons.length} รายการ</p>
      ) : null}
      {hireCount > 0 || responseLabel ? (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {hireCount > 0 ? (
            <span className="rounded-full border border-border/60 px-2 py-0.5 text-muted-foreground">
              จ้างแล้ว {hireCount.toLocaleString("th-TH")} ครั้ง
            </span>
          ) : null}
          {responseLabel ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
              <Clock3 className="h-3 w-3" aria-hidden />
              {responseLabel}
            </span>
          ) : null}
        </div>
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

      {showActions || detailTags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {showActions ? (
            <>
              <ServicePackageActions serviceId={service.id} title={service.title} />
              {detailTags.length > 0 ? <span className="mx-1.5 h-5 w-px bg-border" aria-hidden /> : null}
            </>
          ) : null}
          {detailTags.map((tag) => (
            <Link
              key={tag}
              to={packageTagFeedUrl(tag)}
              className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {tag}
            </Link>
          ))}
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
      {deliverables.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">สิ่งที่คุณจะได้{tiers.length > 1 && tier ? ` · ${tier.name}` : ""}</h3>
          <ul className="space-y-1.5">
            {deliverables.map((d, i) => (
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
                    <img loading="lazy" decoding="async" src={active} alt="" className="h-full w-full object-cover" />
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
                    <img loading="lazy" decoding="async" src={url} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          ) : null}

          <div className="space-y-3 pt-1">{aboutBlock}</div>

          {faq.length > 0 ? (
            <div className="space-y-1 pt-2">
              <h3 className="text-sm font-semibold">คำถามที่พบบ่อย</h3>
              <Accordion type="single" collapsible className="w-full">
                {faq.map((item, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="border-border/50">
                    <AccordionTrigger className="py-3 text-left text-sm">{item.q}</AccordionTrigger>
                    <AccordionContent className="whitespace-pre-wrap text-sm text-muted-foreground">{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ) : null}

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

      {tiers.length > 1 ? (
        <section
          className={cn("space-y-3 border-t border-border/50", isPage ? "p-4 md:p-5 lg:p-6" : "p-4 md:p-5")}
          aria-labelledby="tier-compare-title"
        >
          <h3 id="tier-compare-title" className="flex items-center gap-1.5 text-sm font-semibold">
            <Layers className="h-4 w-4 text-primary" aria-hidden />
            เปรียบเทียบแพ็กเกจ
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="w-28 p-3 text-left text-xs font-normal text-muted-foreground" />
                  {tiers.map((t, i) => (
                    <th key={`${t.name}-${i}`} scope="col" className="p-3 text-left align-top">
                      <span className="block text-sm font-semibold text-foreground">{t.name}</span>
                      <span className="block text-base font-semibold tabular-nums text-foreground">
                        {formatServicePrice(t.price_thb)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["รายละเอียด", (t) => t.summary || "–"],
                    ["ระยะเวลา", (t) => (t.duration_days ? `${t.duration_days} วัน` : "–")],
                    ["แก้ไข", (t) => (t.revisions ? `${t.revisions} รอบ` : "–")],
                    [
                      "สิ่งที่ได้",
                      (t) =>
                        t.deliverables.length ? (
                          <ul className="space-y-1">
                            {t.deliverables.map((d, k) => (
                              <li key={k} className="flex items-start gap-1.5">
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                                <span>{d}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "–"
                        ),
                    ],
                  ] as [string, (t: (typeof tiers)[number]) => ReactNode][]
                ).map(([label, render]) => (
                  <tr key={label} className="border-t border-border/50 align-top">
                    <th scope="row" className="p-3 text-left text-xs font-normal text-muted-foreground">
                      {label}
                    </th>
                    {tiers.map((t, i) => (
                      <td
                        key={`${label}-${i}`}
                        className="whitespace-pre-wrap p-3 text-foreground/90"
                      >
                        {render(t)}
                      </td>
                    ))}
                  </tr>
                ))}
                {onEdit ? null : (
                  <tr className="border-t border-border/50">
                    <td />
                    {tiers.map((t, i) => (
                      <td key={`req-${i}`} className="p-3">
                        <Button
                          type="button"
                          size="sm"
                          className="w-full gap-1.5 rounded-full"
                          disabled={previewOnly || busy}
                          onClick={() => {
                            if (previewOnly) return;
                            setRequestedTier(i);
                            onRequest(service, { tier: t, addons: choice.addons });
                          }}
                        >
                          {busy && requestedTier === i ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <MessageCircle className="h-4 w-4" aria-hidden />
                          )}
                          ขอใช้บริการนี้
                        </Button>
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
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
            <p className="min-w-0 flex-1 text-base font-semibold text-primary tabular-nums truncate">{priceLabel}</p>
            {onEdit ? (
              <Button type="button" variant="outline" className="rounded-full gap-1.5 min-h-11 px-5 shrink-0" onClick={onEdit}>
                <Pencil className="w-4 h-4" aria-hidden />
                แก้ไขแพ็กเกจ
              </Button>
            ) : (
              <Button
                type="button"
                className="rounded-full gap-1.5 min-h-11 px-5 shrink-0"
                disabled={busy}
                onClick={() => onRequest(service, choice)}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                ขอใช้บริการนี้
              </Button>
            )}
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
