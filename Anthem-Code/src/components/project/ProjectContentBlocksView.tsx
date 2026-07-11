import { Film } from "lucide-react";
import type { ReactNode } from "react";
import ProjectGallery from "@/components/ProjectGallery";
import { PhotoGridPreview } from "@/components/project/PhotoGridPreview";
import ImageActionBar from "@/components/project/ImageActionBar";
import { ProjectRichTextView } from "@/components/project/ProjectRichTextField";
import {
  mergeContentBlocks,
  resolveProjectCanvas,
  blockGapAfterClass,
  blockImageUrls,
  isImageTextBlockType,
  isMediaBlockType,
  textVerticalAlignClass,
  type ProjectContentBlock,
} from "@/lib/projectContentBlocks";
import { parsePhotoGridLayout } from "@/lib/photoGridLayouts";
import { cn } from "@/lib/utils";

type ActionContext = {
  projectId: string;
  projectTitle: string;
};

type Props = {
  blocks?: ProjectContentBlock[] | null;
  legacyDescription?: string | null;
  /** When set, prefer interleaved canvas (media + text) including legacy gallery arrays. */
  galleryUrls?: string[] | null;
  videoUrls?: string[] | null;
  className?: string;
  /** Enables hover actions (like / inspire / share) on images. */
  projectId?: string;
  projectTitle?: string;
};

function ImageFrame({
  url,
  imageIndex,
  actions,
  className,
  imgClassName,
}: {
  url: string;
  imageIndex: number;
  actions?: ActionContext | null;
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div className={cn("relative group overflow-hidden rounded-none bg-transparent", className)}>
      <img src={url} alt="" className={cn("w-full object-contain", imgClassName)} loading="lazy" />
      {actions ? (
        <ImageActionBar
          projectId={actions.projectId}
          projectTitle={actions.projectTitle}
          imageUrl={url}
          imageIndex={imageIndex}
        />
      ) : null}
    </div>
  );
}

function MultiRowImages({
  urls,
  columns,
  actions,
  indexOffset = 0,
}: {
  urls: string[];
  columns: 2 | 3 | 4;
  actions?: ActionContext | null;
  indexOffset?: number;
}) {
  return (
    <div
      className={cn(
        "grid gap-2",
        columns === 4 ? "grid-cols-4" : columns === 3 ? "grid-cols-3" : "grid-cols-2",
      )}
    >
      {urls.map((url, i) => (
        <ImageFrame
          key={`${url}-${i}`}
          url={url}
          imageIndex={indexOffset + i}
          actions={actions}
          className="min-w-0"
        />
      ))}
    </div>
  );
}

function ImageTextBlockView({
  url,
  body,
  splitSide,
  textVerticalAlign,
  actions,
  imageIndex,
}: {
  url?: string;
  body?: string;
  splitSide?: "image_left" | "text_left";
  textVerticalAlign?: "top" | "middle" | "bottom";
  actions?: ActionContext | null;
  imageIndex: number;
}) {
  const image = url?.trim() ? (
    <ImageFrame url={url} imageIndex={imageIndex} actions={actions} className="min-w-0" />
  ) : null;
  const text = body?.trim() ? (
    <ProjectRichTextView
      html={body}
      className="text-base text-foreground/90 leading-relaxed"
    />
  ) : null;
  if (!image && !text) return null;
  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4">
      {splitSide === "text_left" ? (
        <>
          <div className={cn("flex h-full min-w-0", textVerticalAlignClass(textVerticalAlign))}>{text}</div>
          <div className="min-w-0">{image}</div>
        </>
      ) : (
        <>
          <div className="min-w-0">{image}</div>
          <div className={cn("flex h-full min-w-0", textVerticalAlignClass(textVerticalAlign))}>{text}</div>
        </>
      )}
    </div>
  );
}

function renderBlock(
  block: ProjectContentBlock,
  actions: ActionContext | null,
  imageIndexOffset: number,
) {
  if (block.type === "image") {
    const urls = blockImageUrls(block).filter((u) => u.trim());
    if (!urls.length) return null;

    if (block.mediaLayout === "gallery") {
      return (
        <ProjectGallery
          images={urls}
          alt={actions?.projectTitle ?? ""}
          projectId={actions?.projectId}
          projectTitle={actions?.projectTitle}
          imageIndexOffset={imageIndexOffset}
        />
      );
    }

    if (block.mediaLayout === "grid") {
      const layout = parsePhotoGridLayout(block.gridLayout);
      return (
        <PhotoGridPreview
          images={urls.map((url) => ({ url }))}
          layout={layout}
          title={actions?.projectTitle ?? ""}
          className="max-w-none"
          projectId={actions?.projectId}
          projectTitle={actions?.projectTitle}
          imageIndexOffset={imageIndexOffset}
        />
      );
    }

    if (block.mediaLayout === "multi") {
      const columns = block.rowColumns === 3 || block.rowColumns === 4 ? block.rowColumns : 2;
      return (
        <MultiRowImages
          urls={urls}
          columns={columns}
          actions={actions}
          indexOffset={imageIndexOffset}
        />
      );
    }

    if (urls.length === 1) {
      return (
        <ImageFrame
          url={urls[0]}
          imageIndex={imageIndexOffset}
          actions={actions}
          imgClassName="max-h-[min(80vh,900px)]"
        />
      );
    }

    return (
      <MultiRowImages
        urls={urls}
        columns={2}
        actions={actions}
        indexOffset={imageIndexOffset}
      />
    );
  }

  if (block.type === "video" && block.url) {
    return (
      <div className="overflow-hidden rounded-none bg-transparent">
        <video
          src={block.url}
          controls
          className="max-h-[min(80vh,900px)] w-full"
          preload="metadata"
        />
        <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground">
          <Film className="h-3.5 w-3.5" />
          วิดีโอ
        </div>
      </div>
    );
  }

  if (isImageTextBlockType(block.type)) {
    return (
      <ImageTextBlockView
        url={block.url}
        body={block.body}
        splitSide={block.splitSide}
        textVerticalAlign={block.textVerticalAlign}
        actions={actions}
        imageIndex={imageIndexOffset}
      />
    );
  }

  if (isMediaBlockType(block.type)) return null;

  if (block.type === "heading") {
    return (
      <ProjectRichTextView
        as="h2"
        html={block.heading}
        className="text-xl sm:text-2xl font-semibold text-foreground text-center leading-snug"
      />
    );
  }

  if (block.type === "heading_body") {
    return (
      <div className="space-y-2">
        {block.heading?.trim() ? (
          <ProjectRichTextView
            as="h3"
            html={block.heading}
            className="text-lg font-semibold text-foreground leading-snug"
          />
        ) : null}
        {block.body?.trim() ? (
          <ProjectRichTextView
            html={block.body}
            className="text-base text-foreground/90 leading-relaxed"
          />
        ) : null}
      </div>
    );
  }

  return (
    <ProjectRichTextView
      html={block.body}
      className="text-base text-foreground/90 leading-relaxed"
    />
  );
}

function countBlockImages(block: ProjectContentBlock): number {
  if (block.type === "image") return blockImageUrls(block).filter((u) => u.trim()).length;
  if (isImageTextBlockType(block.type) && block.url?.trim()) return 1;
  return 0;
}

export function ProjectContentBlocksView({
  blocks,
  legacyDescription,
  galleryUrls,
  videoUrls,
  className,
  projectId,
  projectTitle,
}: Props) {
  const items =
    galleryUrls != null || videoUrls != null
      ? resolveProjectCanvas({
          content_blocks: blocks,
          description: legacyDescription,
          gallery_urls: galleryUrls,
          video_urls: videoUrls,
        })
      : mergeContentBlocks(blocks ?? [], legacyDescription);

  if (!items.length) return null;

  const actions: ActionContext | null =
    projectId && projectTitle ? { projectId, projectTitle } : null;

  let imageIndexOffset = 0;
  const rendered: { block: ProjectContentBlock; content: ReactNode }[] = [];
  for (const block of items) {
    const content = renderBlock(block, actions, imageIndexOffset);
    imageIndexOffset += countBlockImages(block);
    if (content != null) rendered.push({ block, content });
  }

  if (!rendered.length) return null;

  return (
    <div className={cn("flex flex-col", className)}>
      {rendered.map(({ block, content }, index) => (
        <div
          key={block.id}
          className={cn(
            "min-w-0",
            blockGapAfterClass(block.gapAfter, index === rendered.length - 1, "public"),
          )}
        >
          {content}
        </div>
      ))}
    </div>
  );
}
