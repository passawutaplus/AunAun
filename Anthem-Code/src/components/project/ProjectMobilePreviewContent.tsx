import { ChevronLeft, Layers3, MessageCircle, Share2 } from "lucide-react";
import ProjectSidePanel from "@/components/ProjectSidePanel";
import { ProjectContentBlocksView } from "@/components/project/ProjectContentBlocksView";
import { FlexGridView } from "@/components/project/FlexGridView";
import ProjectContextCard from "@/components/project/ProjectContextCard";
import {
  resolveProjectCanvas,
} from "@/lib/projectContentBlocks";
import { mediaItemFromUrl } from "@/lib/portfolioMedia";
import { cn } from "@/lib/utils";
import type { ProjectPreviewData } from "@/components/project/ProjectPreviewDialog";

type Props = {
  data: ProjectPreviewData;
  ownerName: string;
  ownerAvatar?: string;
  ownerId?: string;
  displayTitle: string;
  onPreviewAction: () => void;
  className?: string;
};

/** Scrollable mobile project detail — same canvas layout as PC /project/:id. */
export function ProjectMobilePreviewContent({
  data,
  ownerName,
  ownerAvatar,
  ownerId,
  displayTitle,
  onPreviewAction,
  className,
}: Props) {
  const isFlex = data.editorMode === "flex_grid";
  const canvasBlocks = resolveProjectCanvas({
    content_blocks: data.contentBlocks,
    description: data.description,
    gallery_urls: data.gallery,
    video_urls: data.gallery.filter((u) => mediaItemFromUrl(u).kind === "video"),
  });

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
            {data.subtitle?.trim() ? (
              <p className="text-sm text-muted-foreground">{data.subtitle.trim()}</p>
            ) : null}
            {isFlex ? (
              <FlexGridView layout={data.flexGridLayout} />
            ) : canvasBlocks.length > 0 ? (
              <ProjectContentBlocksView blocks={canvasBlocks} className="max-w-2xl" />
            ) : (
              <div className="aspect-video rounded-2xl bg-muted flex items-center justify-center text-sm text-muted-foreground">
                ยังไม่มีเนื้อหา — เพิ่มภาพหรือข้อความบนแคนวาสเพื่อดูพรีวิว
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
            priceThb={data.priceThb}
            views={0}
            likes={0}
            commentsCount={0}
            liked={false}
            onLike={onPreviewAction}
            onHire={onPreviewAction}
            onCollab={onPreviewAction}
            allowHire={data.allowHire}
            allowCollab={data.allowCollab}
            licenseType={data.licenseType}
            licenseNote={data.licenseNote}
            copyrightHolder={data.copyrightHolder}
            hasThirdPartyAssets={data.hasThirdPartyAssets}
            thirdPartyNote={data.thirdPartyNote}
            aiAssisted={data.aiAssisted}
            aiDisclosureNote={data.aiDisclosureNote}
            clientPermissionConfirmed={data.clientPermissionConfirmed}
          />

          {data.context ? <ProjectContextCard context={data.context} /> : null}

          <section className="rounded-2xl glass-panel p-4 space-y-3 pointer-events-none opacity-90">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              ความคิดเห็น
            </h3>
            <p className="text-xs text-muted-foreground">ความคิดเห็นจะแสดงหลังเผยแพร่ผลงาน</p>
          </section>
        </div>
      </div>
    </div>
  );
}
