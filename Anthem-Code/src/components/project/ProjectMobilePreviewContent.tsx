import { ChevronLeft, Layers3, MessageCircle, Share2 } from "lucide-react";
import ProjectSidePanel from "@/components/ProjectSidePanel";
import LicenseDetailBlock from "@/components/license/LicenseDetailBlock";
import SafeDemoImage from "@/components/SafeDemoImage";
import { isVideoUrl } from "@/lib/portfolioMedia";
import { cn } from "@/lib/utils";
import type { ProjectPreviewData } from "@/components/project/ProjectPreviewDialog";

type Props = {
  data: ProjectPreviewData;
  ownerName: string;
  ownerAvatar?: string;
  ownerId?: string;
  displayTitle: string;
  images: string[];
  onPreviewAction: () => void;
  className?: string;
};

/** Scrollable mobile project detail — mirrors /project/:id on phone. */
export function ProjectMobilePreviewContent({
  data,
  ownerName,
  ownerAvatar,
  ownerId,
  displayTitle,
  images,
  onPreviewAction,
  className,
}: Props) {
  return (
    <div className={cn("h-full flex flex-col min-h-0 bg-app-ambient", className)}>
      <header className="shrink-0 z-10 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 px-2 py-2.5">
          <span
            className="inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground"
            aria-hidden
          >
            <ChevronLeft className="w-5 h-5" />
          </span>
          <div className="flex items-center gap-0.5 text-muted-foreground" aria-hidden>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full">
              <Layers3 className="w-5 h-5" />
            </span>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full">
              <Share2 className="w-5 h-5" />
            </span>
          </div>
        </div>
      </header>

      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
        role="region"
        aria-label="พรีวิวหน้ารายละเอียดผลงานบนมือถือ"
      >
        <div className="px-3 py-4 space-y-4">
          <section className="space-y-3 min-w-0">
            {images.length > 0 ? (
              images.map((src, i) =>
                isVideoUrl(src) ? (
                  <video
                    key={src + i}
                    src={src}
                    controls
                    playsInline
                    className="w-full rounded-2xl border border-border/60 bg-black"
                  />
                ) : (
                  <SafeDemoImage
                    key={src + i}
                    src={src}
                    index={i}
                    alt={`${displayTitle} ${i + 1}`}
                    className="w-full rounded-2xl border border-border/60 bg-card object-contain"
                    loading="lazy"
                  />
                ),
              )
            ) : (
              <div className="aspect-video rounded-2xl bg-muted flex items-center justify-center text-sm text-muted-foreground">
                ยังไม่มีรูปภาพ
              </div>
            )}
          </section>

          <ProjectSidePanel
            title={displayTitle}
            category={data.category}
            ownerName={ownerName}
            ownerAvatar={ownerAvatar}
            ownerId={ownerId}
            publishedDate={new Date().toISOString()}
            description={data.description}
            tools={data.tools}
            tags={data.tags}
            price={data.price}
            views={0}
            likes={0}
            commentsCount={0}
            liked={false}
            onLike={onPreviewAction}
            onHire={onPreviewAction}
            onCollab={onPreviewAction}
            allowHire={data.allowHire}
            allowCollab={data.allowCollab}
          />

          <LicenseDetailBlock
            licenseType={data.licenseType}
            licenseNote={data.licenseNote}
            copyrightHolder={data.copyrightHolder}
            ownerName={ownerName}
            hasThirdPartyAssets={data.hasThirdPartyAssets}
            thirdPartyNote={data.thirdPartyNote}
            allowHire={data.allowHire}
            onHire={onPreviewAction}
          />

          <section className="rounded-2xl glass-panel p-4 space-y-3 pointer-events-none opacity-90">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              ความคิดเห็น
            </h3>
            <p className="text-sm text-muted-foreground py-6 text-center">
              ยังไม่มีความคิดเห็น — จะแสดงที่นี่เมื่อเผยแพร่แล้ว
            </p>
          </section>
        </div>

        <div className="h-8 shrink-0" aria-hidden />
      </div>
    </div>
  );
}
