import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Blocks,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Columns2,
  Film,
  Image,
  Images,
  Layers,
  LayoutGrid,
  LayoutTemplate,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { PhotoGridLayoutWireframe } from "@/components/project/PhotoGridLayoutPicker";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  setCanvasToolDragData,
  type CanvasToolPayload,
} from "@/lib/canvasToolDrag";
import {
  CONTENT_BLOCK_META,
  IMAGE_TEXT_SPLIT_LAYOUTS,
  MULTI_ROW_LAYOUTS,
  type GalleryDisplayMode,
  type ImageTextSplitSide,
  type MultiRowColumns,
  type ProjectTextBlockType,
} from "@/lib/projectContentBlocks";
import { PHOTO_GRID_LAYOUTS, type PhotoGridLayout } from "@/lib/photoGridLayouts";
import {
  CANVAS_TEMPLATE_MAX,
  type CanvasTemplatePreviewSlot,
} from "@/lib/projectCanvasTemplates";
import type { UserCanvasTemplate } from "@/hooks/useCanvasTemplates";
import { cn } from "@/lib/utils";

type Props = {
  galleryDisplayMode: GalleryDisplayMode;
  gridLayout: PhotoGridLayout;
  onDisplayModeChange: (mode: GalleryDisplayMode) => void;
  onPlaceTool: (payload: CanvasToolPayload) => void;
  templates?: UserCanvasTemplate[];
  templatesLoading?: boolean;
  templatesAtLimit?: boolean;
  canSaveTemplate?: boolean;
  onApplyTemplate?: (templateId: string) => void;
  onSaveAsTemplate?: () => void;
  onRenameTemplate?: (template: UserCanvasTemplate) => void;
  onUpdateTemplate?: (template: UserCanvasTemplate) => void;
  onDeleteTemplate?: (template: UserCanvasTemplate) => void;
  imageDisabled?: boolean;
  videoDisabled?: boolean;
  textDisabled?: boolean;
  uploadingImage?: boolean;
  uploadingVideo?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Controlled tools category tab (Module / Template). */
  toolsTab?: "template" | "module";
  onToolsTabChange?: (tab: "template" | "module") => void;
  className?: string;
};

type PreviewKind = GalleryDisplayMode | "video" | "multi" | ProjectTextBlockType;

function normalizeSearch(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchesSearch(query: string, ...parts: Array<string | undefined | null>): boolean {
  if (!query) return true;
  const hay = parts.filter(Boolean).join(" ").toLowerCase();
  return hay.includes(query);
}

function MultiRowWireframe({ columns, active }: { columns: MultiRowColumns; active?: boolean }) {
  const cell = cn("h-full flex-1 bg-foreground/20", active && "bg-primary/50");
  return (
    <div className="flex h-11 w-full gap-0.5">
      {Array.from({ length: columns }, (_, i) => (
        <div key={i} className={cell} />
      ))}
    </div>
  );
}

function ImageTextWireframe({ side }: { side: ImageTextSplitSide }) {
  const image = <div className="aspect-square w-full bg-foreground/20" />;
  const text = (
    <div className="flex h-full w-full flex-col justify-center gap-1 py-0.5">
      <div className="h-px w-full bg-foreground/35" />
      <div className="h-px w-full bg-foreground/35" />
      <div className="h-px w-[85%] bg-foreground/35" />
      <div className="h-px w-[70%] bg-foreground/35" />
    </div>
  );
  return (
    <div className="grid h-11 w-full grid-cols-2 gap-1.5">
      {side === "image_left" ? (
        <>
          {image}
          {text}
        </>
      ) : (
        <>
          {text}
          {image}
        </>
      )}
    </div>
  );
}

function TemplateSlotPreview({ slot }: { slot: CanvasTemplatePreviewSlot }) {
  if (slot.kind === "heading") {
    return (
      <div className="flex w-full items-center justify-center rounded-[1px] bg-muted/50 px-2 py-1.5">
        <div className="h-1 w-2/5 rounded-full bg-foreground/45" />
      </div>
    );
  }
  if (slot.kind === "heading_body") {
    return (
      <div className="flex w-full flex-col items-center gap-0.5 rounded-[1px] bg-muted/40 px-2 py-1.5">
        <div className="h-1 w-2/5 rounded-full bg-foreground/45" />
        <div className="h-0.5 w-full rounded-full bg-foreground/25" />
        <div className="h-0.5 w-4/5 rounded-full bg-foreground/25" />
      </div>
    );
  }
  if (slot.kind === "body") {
    return (
      <div className="flex w-full flex-col gap-0.5 rounded-[1px] bg-muted/30 px-2 py-1.5">
        <div className="h-0.5 w-full rounded-full bg-foreground/30" />
        <div className="h-0.5 w-full rounded-full bg-foreground/30" />
        <div className="h-0.5 w-3/4 rounded-full bg-foreground/30" />
      </div>
    );
  }
  if (slot.kind === "image") {
    return (
      <div className="flex h-7 w-full items-center justify-center rounded-[1px] bg-foreground/15">
        <Image className="h-3.5 w-3.5 text-muted-foreground/70" strokeWidth={1.5} />
      </div>
    );
  }
  if (slot.kind === "video") {
    return (
      <div className="flex h-7 w-full items-center justify-center rounded-[1px] bg-foreground/15">
        <Film className="h-3.5 w-3.5 text-muted-foreground/70" strokeWidth={1.5} />
      </div>
    );
  }
  if (slot.kind === "gallery") {
    return (
      <div className="relative flex h-7 w-full items-center justify-center rounded-[1px] bg-foreground/15">
        <Image className="h-3.5 w-3.5 text-muted-foreground/70" strokeWidth={1.5} />
        <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
          <span className="h-0.5 w-0.5 rounded-full bg-foreground/50" />
          <span className="h-0.5 w-0.5 rounded-full bg-foreground/30" />
          <span className="h-0.5 w-0.5 rounded-full bg-foreground/30" />
        </span>
      </div>
    );
  }
  if (slot.kind === "multi") {
    return (
      <div className="flex h-7 w-full items-center gap-0.5 rounded-[1px] bg-muted/20 p-0.5">
        {Array.from({ length: slot.columns }, (_, i) => (
          <div key={i} className="h-full flex-1 bg-foreground/25" />
        ))}
      </div>
    );
  }
  if (slot.kind === "grid") {
    const cell = "bg-foreground/25";
    if (slot.layout === "three_split") {
      return (
        <div className="grid h-8 w-full grid-cols-2 grid-rows-2 gap-0.5 rounded-[1px] bg-muted/20 p-0.5">
          <div className={cn(cell, "row-span-2")} />
          <div className={cell} />
          <div className={cell} />
        </div>
      );
    }
    if (slot.layout === "four_quad") {
      return (
        <div className="grid h-8 w-full grid-cols-2 grid-rows-2 gap-0.5 rounded-[1px] bg-muted/20 p-0.5">
          <div className={cell} />
          <div className={cell} />
          <div className={cell} />
          <div className={cell} />
        </div>
      );
    }
    return (
      <div className="flex h-8 w-full items-center justify-center rounded-[1px] bg-muted/20">
        <PhotoGridLayoutWireframe layout={slot.layout} active={false} />
      </div>
    );
  }
  if (slot.kind !== "image_text") return null;
  const image = <div className="aspect-square h-6 w-6 shrink-0 bg-foreground/25" />;
  const text = (
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
      <div className="h-0.5 w-full bg-foreground/35" />
      <div className="h-0.5 w-full bg-foreground/35" />
      <div className="h-0.5 w-2/3 bg-foreground/35" />
    </div>
  );
  return (
    <div className="flex w-full items-center gap-1.5 rounded-[1px] bg-muted/30 px-1.5 py-1.5">
      {slot.side === "image_left" ? (
        <>
          {image}
          {text}
        </>
      ) : (
        <>
          {text}
          {image}
        </>
      )}
    </div>
  );
}

function TemplatePreviewStack({ slots }: { slots: CanvasTemplatePreviewSlot[] }) {
  return (
    <div className="flex w-full flex-col gap-1 rounded-sm border border-border/40 bg-background/40 p-1.5">
      {slots.map((slot, i) => (
        <TemplateSlotPreview key={`${slot.kind}-${i}`} slot={slot} />
      ))}
    </div>
  );
}

function TemplateCard({
  template,
  disabled,
  onClick,
  onRename,
  onUpdate,
  onDelete,
}: {
  template: UserCanvasTemplate;
  disabled?: boolean;
  onClick: () => void;
  onRename?: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
}) {
  const hasActions = Boolean(onRename || onUpdate || onDelete);
  return (
    <div
      className={cn(
        "relative flex w-full flex-col gap-2 rounded-none border px-2.5 py-2.5 text-left transition-colors",
        "border-border/60 bg-card/50 hover:border-primary/30 hover:bg-muted/30",
        template.recommended && "border-primary/35 bg-primary/5",
        disabled && "pointer-events-none opacity-45",
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="flex w-full flex-col gap-2 text-left"
        aria-label={`ใช้เทมเพลต ${template.name}`}
      >
        <TemplatePreviewStack slots={template.modules} />
        <div className="min-w-0 space-y-0.5 pr-6">
          <p className="text-[11px] font-semibold text-foreground leading-tight">
            {template.name}
            {template.recommended ? (
              <span className="ml-1 text-[9px] font-medium text-primary">แนะนำ</span>
            ) : null}
          </p>
          <p className="text-[10px] text-muted-foreground leading-snug">
            {template.modules.length} โมดูล
            {template.hint ? ` · ${template.hint}` : ""}
          </p>
        </div>
      </button>
      {hasActions ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              aria-label={`จัดการเทมเพลต ${template.name}`}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {onRename ? (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRename();
                }}
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                เปลี่ยนชื่อ
              </DropdownMenuItem>
            ) : null}
            {onUpdate ? (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate();
                }}
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                อัปเดตจากแคนวาส
              </DropdownMenuItem>
            ) : null}
            {onRename || onUpdate ? <DropdownMenuSeparator /> : null}
            {onDelete ? (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                ลบ
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

function SectionDivider() {
  return <div className="border-t border-border/60" role="separator" />;
}

function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 px-0.5">
      <p className="text-[11px] font-semibold tracking-wide text-foreground">{children}</p>
      {hint ? <span className="text-[10px] text-muted-foreground/80">{hint}</span> : null}
    </div>
  );
}

function ToolPreview({ kind, compact }: { kind: PreviewKind; compact?: boolean }) {
  const box = "bg-foreground/20";
  const shell = cn("flex items-center justify-center", compact ? "h-9 w-12" : "h-10 w-14");

  if (kind === "single") {
    return (
      <div className={shell}>
        <div className={cn(box, "flex h-full w-full items-center justify-center")}>
          <Image className="h-3.5 w-3.5 text-muted-foreground/70" strokeWidth={1.5} />
        </div>
      </div>
    );
  }
  if (kind === "gallery") {
    return (
      <div className={cn(shell, "gap-0.5")}>
        <div className={cn(box, "h-full flex-1")} />
        <div className={cn(box, "h-full w-2.5")} />
        <div className={cn(box, "h-full w-2.5 opacity-60")} />
      </div>
    );
  }
  if (kind === "multi") {
    return (
      <div className={cn(shell, "gap-0.5")}>
        <div className={cn(box, "h-full flex-1")} />
        <div className={cn(box, "h-full flex-1")} />
      </div>
    );
  }
  if (kind === "video") {
    return (
      <div className={shell}>
        <div className={cn(box, "flex h-full w-full items-center justify-center")}>
          <Film className="h-3.5 w-3.5 text-muted-foreground/70" strokeWidth={1.5} />
        </div>
      </div>
    );
  }
  if (kind === "heading") {
    return (
      <div className={cn(shell, "flex-col gap-0.5")}>
        <div className={cn(box, "h-1.5 w-3/4")} />
      </div>
    );
  }
  if (kind === "heading_body") {
    return (
      <div className={cn(shell, "flex-col gap-0.5")}>
        <div className={cn(box, "h-1 w-2/3 self-start")} />
        <div className={cn(box, "h-0.5 w-full")} />
        <div className={cn(box, "h-0.5 w-4/5 self-start")} />
      </div>
    );
  }
  if (kind === "body") {
    return (
      <div className={cn(shell, "flex-col gap-0.5")}>
        <div className={cn(box, "h-0.5 w-full")} />
        <div className={cn(box, "h-0.5 w-4/5 self-start")} />
        <div className={cn(box, "h-0.5 w-full")} />
      </div>
    );
  }
  return null;
}

function ToolRowButton({
  label,
  hint,
  preview,
  active,
  disabled,
  loading,
  dragPayload,
  onClick,
}: {
  label: string;
  hint: string;
  preview: PreviewKind;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  dragPayload?: CanvasToolPayload;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      draggable={!disabled && !loading && !!dragPayload}
      onDragStart={(e) => {
        if (!dragPayload || disabled || loading) return;
        setCanvasToolDragData(e.dataTransfer, dragPayload);
      }}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-none border p-2 text-left transition-colors",
        active
          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
          : "border-border/60 bg-card/50 hover:border-primary/30 hover:bg-muted/30",
        disabled && "pointer-events-none opacity-45",
        dragPayload && !disabled && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="w-14 shrink-0">
        {loading ? (
          <div className="flex h-10 items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ToolPreview kind={preview} compact />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-medium text-foreground">{label}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="shrink-0 text-muted-foreground/50"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                role="presentation"
              >
                <CircleHelp className="h-3 w-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[220px] text-xs">
              {hint}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </button>
  );
}

function TextToolButton({
  label,
  preview,
  disabled,
  onClick,
}: {
  label: string;
  preview: ProjectTextBlockType;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      draggable={!disabled}
      onDragStart={(e) => {
        if (disabled) return;
        setCanvasToolDragData(e.dataTransfer, { tool: preview });
      }}
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1 rounded-none border border-border/60 bg-card/50 p-1.5 text-left transition-colors hover:border-primary/30 hover:bg-muted/30",
        disabled && "pointer-events-none opacity-45",
        !disabled && "cursor-grab active:cursor-grabbing",
      )}
    >
      <ToolPreview kind={preview} compact />
      <span className="text-[10px] font-medium leading-tight text-foreground line-clamp-2">{label}</span>
    </button>
  );
}

function CollapsedRailButton({
  label,
  active,
  disabled,
  loading,
  dragPayload,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  dragPayload?: CanvasToolPayload;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          disabled={disabled || loading}
          draggable={!disabled && !loading && !!dragPayload}
          onDragStart={(e) => {
            if (!dragPayload || disabled || loading) return;
            setCanvasToolDragData(e.dataTransfer, dragPayload);
          }}
          onClick={onClick}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
            active
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            (disabled || loading) && "pointer-events-none opacity-50",
            dragPayload && !disabled && "cursor-grab active:cursor-grabbing",
          )}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function ProjectEditorToolsSidebar({
  galleryDisplayMode,
  gridLayout,
  onDisplayModeChange,
  onPlaceTool,
  templates = [],
  templatesLoading,
  templatesAtLimit,
  canSaveTemplate,
  onApplyTemplate,
  onSaveAsTemplate,
  onRenameTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  imageDisabled,
  videoDisabled,
  textDisabled,
  uploadingImage,
  uploadingVideo,
  expanded: expandedProp,
  onExpandedChange,
  toolsTab: toolsTabProp,
  onToolsTabChange,
  className,
}: Props) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isControlled = expandedProp !== undefined;
  const expanded = isControlled ? expandedProp : internalExpanded;

  const setExpanded = (next: boolean) => {
    if (!isControlled) setInternalExpanded(next);
    onExpandedChange?.(next);
  };

  const [internalToolsTab, setInternalToolsTab] = useState<"template" | "module">("module");
  const toolsTabControlled = toolsTabProp !== undefined;
  const sidebarTab = toolsTabControlled ? toolsTabProp : internalToolsTab;
  const setSidebarTab = (tab: "template" | "module") => {
    if (!toolsTabControlled) setInternalToolsTab(tab);
    onToolsTabChange?.(tab);
  };

  useEffect(() => {
    if (isControlled) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setInternalExpanded(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [isControlled]);

  const placeSingle = () => {
    if (imageDisabled || uploadingImage) return;
    onDisplayModeChange("single");
    onPlaceTool({ tool: "single" });
  };

  const placeGallery = () => {
    if (imageDisabled || uploadingImage) return;
    onDisplayModeChange("gallery");
    onPlaceTool({ tool: "gallery" });
  };

  const placeMulti = (columns: MultiRowColumns) => {
    if (imageDisabled || uploadingImage) return;
    onPlaceTool({ tool: "multi", columns });
  };

  const placeImageText = (side: ImageTextSplitSide) => {
    if (imageDisabled || uploadingImage || textDisabled) return;
    onPlaceTool({ tool: "image_text", side });
  };

  const placeGrid = (layout: PhotoGridLayout) => {
    if (imageDisabled || uploadingImage) return;
    onDisplayModeChange("grid");
    onPlaceTool({ tool: "grid", layout });
  };

  const placeVideo = () => {
    if (videoDisabled || uploadingVideo) return;
    onPlaceTool({ tool: "video" });
  };

  const [moduleSearch, setModuleSearch] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");

  const activeSearch = sidebarTab === "template" ? templateSearch : moduleSearch;
  const setActiveSearch = sidebarTab === "template" ? setTemplateSearch : setModuleSearch;
  const moduleQuery = normalizeSearch(moduleSearch);
  const templateQuery = normalizeSearch(templateSearch);

  const filteredTemplates = useMemo(
    () =>
      templates.filter((t) =>
        matchesSearch(templateQuery, t.name, t.hint, t.source_key ?? "", "template", "เทมเพลต"),
      ),
    [templateQuery, templates],
  );

  const textTypes = useMemo(() => {
    const all = ["heading", "heading_body", "body"] as const;
    if (!moduleQuery) return all;
    if (matchesSearch(moduleQuery, "ข้อความ", "text")) return all;
    return all.filter((type) =>
      matchesSearch(
        moduleQuery,
        CONTENT_BLOCK_META[type].label,
        CONTENT_BLOCK_META[type].description,
        type,
      ),
    );
  }, [moduleQuery]);

  const imageTextLayouts = useMemo(() => {
    if (!moduleQuery) return IMAGE_TEXT_SPLIT_LAYOUTS;
    if (matchesSearch(moduleQuery, "ภาพ + ข้อความ", "ภาพ+ข้อความ", "image text")) {
      return IMAGE_TEXT_SPLIT_LAYOUTS;
    }
    return IMAGE_TEXT_SPLIT_LAYOUTS.filter((layout) =>
      matchesSearch(moduleQuery, layout.label, layout.side),
    );
  }, [moduleQuery]);

  const showSingle = matchesSearch(moduleQuery, "ภาพเดี่ยว", "ภาพเดียว", "single", "image");
  const showGallery = matchesSearch(moduleQuery, "แกลเลอรีสไลด์", "แกลเลอรี", "gallery", "สไลด์");
  const multiLayouts = useMemo(() => {
    if (!moduleQuery) return MULTI_ROW_LAYOUTS;
    if (matchesSearch(moduleQuery, "ภาพหลายรูป", "หลายรูป", "multi")) return MULTI_ROW_LAYOUTS;
    return MULTI_ROW_LAYOUTS.filter((layout) => matchesSearch(moduleQuery, layout.label, `${layout.columns}`));
  }, [moduleQuery]);
  const gridLayouts = useMemo(() => {
    if (!moduleQuery) return PHOTO_GRID_LAYOUTS;
    if (matchesSearch(moduleQuery, "photo grid", "กริด", "grid")) return PHOTO_GRID_LAYOUTS;
    return PHOTO_GRID_LAYOUTS.filter((layout) =>
      matchesSearch(moduleQuery, layout.label, layout.description, layout.id),
    );
  }, [moduleQuery]);
  const showVideo = matchesSearch(moduleQuery, "วิดีโอ", "video");

  const hasModuleMatches =
    textTypes.length > 0 ||
    imageTextLayouts.length > 0 ||
    showSingle ||
    showGallery ||
    multiLayouts.length > 0 ||
    gridLayouts.length > 0 ||
    showVideo;

  const showTemplatesPane = sidebarTab === "template";
  const showModulesPane = sidebarTab === "module";
  const searchingModules = moduleQuery.length > 0;
  const searchingTemplates = templateQuery.length > 0;
  const noSearchResults =
    (showModulesPane && searchingModules && !hasModuleMatches) ||
    (showTemplatesPane && searchingTemplates && filteredTemplates.length === 0);

  const singleMode = galleryDisplayMode === "single";
  const galleryMode = galleryDisplayMode === "gallery";
  const gridMode = galleryDisplayMode === "grid";

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          "shrink-0 transition-[width] duration-200 ease-out",
          expanded
            ? "w-[248px] border-r border-border/80 bg-card/95 backdrop-blur-md lg:sticky lg:top-16 lg:z-auto lg:self-start"
            : "w-0 border-0 bg-transparent",
          className,
        )}
        aria-label="เครื่องมือเพิ่มเนื้อหา"
      >
        {expanded ? (
          <div className="flex h-[calc(100dvh-4rem)] flex-col">
            <div className="flex items-center justify-between gap-2 p-2 pl-3">
              <p className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground leading-snug">
                {sidebarTab === "template" ? (
                  <LayoutTemplate className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <Blocks className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                {sidebarTab === "template" ? "Template" : "Module"}
              </p>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                aria-label="ย่อแถบเครื่องมือ"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 px-3 pb-2">
              <button
                type="button"
                onClick={() => setSidebarTab("module")}
                aria-pressed={sidebarTab === "module"}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
                  sidebarTab === "module"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                <Blocks className="h-3 w-3" aria-hidden />
                Module
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab("template")}
                aria-pressed={sidebarTab === "template"}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
                  sidebarTab === "template"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                <LayoutTemplate className="h-3 w-3" aria-hidden />
                Template
              </button>
            </div>

            <div className="px-3 pb-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={activeSearch}
                  onChange={(e) => setActiveSearch(e.target.value)}
                  placeholder={sidebarTab === "template" ? "ค้นหาเทมเพลต" : "ค้นหาโมดูล"}
                  className="h-8 rounded-lg border-border/70 bg-background/80 pl-8 pr-8 text-xs"
                  aria-label={sidebarTab === "template" ? "ค้นหาเทมเพลต" : "ค้นหาโมดูล"}
                />
                {activeSearch ? (
                  <button
                    type="button"
                    onClick={() => setActiveSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label="ล้างคำค้นหา"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 pt-1">
              {noSearchResults ? (
                <p className="px-1 py-6 text-center text-[11px] text-muted-foreground leading-relaxed">
                  {sidebarTab === "template"
                    ? `ไม่พบเทมเพลตที่ตรงกับ “${templateSearch.trim()}”`
                    : `ไม่พบโมดูลที่ตรงกับ “${moduleSearch.trim()}”`}
                </p>
              ) : null}

              {showTemplatesPane ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 px-0.5">
                    <SectionTitle>
                      {searchingTemplates ? "เทมเพลตที่พบ" : "เลือกเทมเพลต"}
                    </SectionTitle>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {templates.length}/{CANVAS_TEMPLATE_MAX}
                    </span>
                  </div>

                  {onSaveAsTemplate ? (
                    <button
                      type="button"
                      disabled={!canSaveTemplate || textDisabled}
                      onClick={onSaveAsTemplate}
                      className={cn(
                        "flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed px-2.5 py-2 text-[11px] font-medium transition-colors",
                        canSaveTemplate && !textDisabled
                          ? "border-primary/40 text-primary hover:bg-primary/10"
                          : "border-border/50 text-muted-foreground opacity-50",
                      )}
                    >
                      <Save className="h-3 w-3" aria-hidden />
                      {templatesAtLimit
                        ? `เต็มแล้ว (${CANVAS_TEMPLATE_MAX})`
                        : "บันทึกแคนวาสเป็นเทมเพลต"}
                    </button>
                  ) : null}

                  {templatesLoading ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-[11px] text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      กำลังโหลดเทมเพลต...
                    </div>
                  ) : filteredTemplates.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1.5">
                      {filteredTemplates.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          disabled={textDisabled || !onApplyTemplate}
                          onClick={() => onApplyTemplate?.(template.id)}
                          onRename={
                            onRenameTemplate ? () => onRenameTemplate(template) : undefined
                          }
                          onUpdate={
                            onUpdateTemplate ? () => onUpdateTemplate(template) : undefined
                          }
                          onDelete={
                            onDeleteTemplate ? () => onDeleteTemplate(template) : undefined
                          }
                        />
                      ))}
                    </div>
                  ) : searchingTemplates ? null : (
                    <p className="px-1 py-4 text-center text-[11px] text-muted-foreground">
                      ยังไม่มีเทมเพลต — จัดโมดูลแล้วกดบันทึกได้
                    </p>
                  )}
                </div>
              ) : null}

              {showModulesPane && hasModuleMatches ? (
                <>
              {textTypes.length > 0 ? (
              <div className="space-y-1.5">
                <SectionTitle>ข้อความ</SectionTitle>
                <div className="grid grid-cols-2 gap-1.5">
                  {textTypes.map((type) => (
                    <TextToolButton
                      key={type}
                      label={CONTENT_BLOCK_META[type].label}
                      preview={type}
                      disabled={textDisabled}
                      onClick={() => onPlaceTool({ tool: type })}
                    />
                  ))}
                </div>
              </div>
              ) : null}

              {textTypes.length > 0 && imageTextLayouts.length > 0 ? <SectionDivider /> : null}

              {imageTextLayouts.length > 0 ? (
              <div className="space-y-1.5">
                <SectionTitle>ภาพ + ข้อความ</SectionTitle>
                <div className="grid grid-cols-2 gap-1.5">
                  {imageTextLayouts.map((layout) => (
                    <button
                      key={layout.side}
                      type="button"
                      disabled={imageDisabled || uploadingImage || textDisabled}
                      draggable={!imageDisabled && !uploadingImage && !textDisabled}
                      onDragStart={(e) => {
                        if (imageDisabled || uploadingImage || textDisabled) return;
                        setCanvasToolDragData(e.dataTransfer, {
                          tool: "image_text",
                          side: layout.side,
                        });
                      }}
                      onClick={() => placeImageText(layout.side)}
                      className={cn(
                        "flex min-h-[4.25rem] flex-col items-center justify-center rounded-none border px-2.5 py-2.5 transition-colors",
                        "border-border/60 bg-card/50 hover:border-primary/30 hover:bg-muted/30",
                        (imageDisabled || uploadingImage || textDisabled) && "pointer-events-none opacity-45",
                        !(imageDisabled || textDisabled) && "cursor-grab active:cursor-grabbing",
                      )}
                      aria-label={layout.label}
                    >
                      <ImageTextWireframe side={layout.side} />
                    </button>
                  ))}
                </div>
              </div>
              ) : null}

              {(imageTextLayouts.length > 0 || textTypes.length > 0) &&
              (showSingle || showGallery || multiLayouts.length > 0 || gridLayouts.length > 0) ? (
                <SectionDivider />
              ) : null}

              {showSingle ? (
              <div className="space-y-1.5">
                <SectionTitle>ภาพเดี่ยว</SectionTitle>
                <ToolRowButton
                  label="ภาพเดี่ยว"
                  hint="ลากหรือกดเพื่อวางช่องภาพ — อัปโหลดทีหลังได้"
                  preview="single"
                  active={singleMode}
                  disabled={imageDisabled}
                  loading={uploadingImage && singleMode}
                  dragPayload={{ tool: "single" }}
                  onClick={placeSingle}
                />
              </div>
              ) : null}

              {showGallery ? (
              <div className="space-y-1.5">
                <SectionTitle>แกลเลอรีสไลด์</SectionTitle>
                <ToolRowButton
                  label="แกลเลอรีสไลด์"
                  hint="วางช่องภาพเพิ่มได้เรื่อย ๆ แล้วอัปโหลดทีหลัง"
                  preview="gallery"
                  active={galleryMode}
                  disabled={imageDisabled}
                  loading={uploadingImage && galleryMode}
                  dragPayload={{ tool: "gallery" }}
                  onClick={placeGallery}
                />
              </div>
              ) : null}

              {multiLayouts.length > 0 ? (
              <div className="space-y-1.5">
                <SectionTitle>ภาพหลายรูป</SectionTitle>
                <div className="grid grid-cols-2 gap-1.5">
                  {multiLayouts.map((layout) => (
                    <button
                      key={layout.columns}
                      type="button"
                      disabled={imageDisabled || uploadingImage}
                      draggable={!imageDisabled && !uploadingImage}
                      onDragStart={(e) => {
                        if (imageDisabled || uploadingImage) return;
                        setCanvasToolDragData(e.dataTransfer, {
                          tool: "multi",
                          columns: layout.columns,
                        });
                      }}
                      onClick={() => placeMulti(layout.columns)}
                      className={cn(
                        "flex min-h-[4.25rem] flex-col items-center justify-center rounded-none border px-2.5 py-2.5 transition-colors",
                        "border-border/60 bg-card/50 hover:border-primary/30 hover:bg-muted/30",
                        (imageDisabled || uploadingImage) && "pointer-events-none opacity-45",
                        !imageDisabled && "cursor-grab active:cursor-grabbing",
                      )}
                      aria-label={layout.label}
                    >
                      <MultiRowWireframe columns={layout.columns} />
                    </button>
                  ))}
                </div>
              </div>
              ) : null}

              {gridLayouts.length > 0 ? (
              <div className="space-y-1.5">
                <SectionTitle>Photo grid</SectionTitle>
                <div className="grid grid-cols-2 gap-1.5">
                {gridLayouts.map((layout) => {
                  const active = gridMode && gridLayout === layout.id;
                  return (
                    <button
                      key={layout.id}
                      type="button"
                      disabled={imageDisabled || uploadingImage}
                      aria-pressed={active}
                      draggable={!imageDisabled && !uploadingImage}
                      onDragStart={(e) => {
                        if (imageDisabled || uploadingImage) return;
                        setCanvasToolDragData(e.dataTransfer, { tool: "grid", layout: layout.id });
                      }}
                      onClick={() => placeGrid(layout.id)}
                      className={cn(
                        "flex min-h-[4.25rem] flex-col items-center justify-center rounded-none border px-2.5 py-2.5 transition-colors",
                        active
                          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                          : "border-border/60 bg-card/50 hover:border-primary/30 hover:bg-muted/30",
                        (imageDisabled || uploadingImage) && "pointer-events-none opacity-45",
                        !imageDisabled && "cursor-grab active:cursor-grabbing",
                      )}
                      aria-label={layout.label}
                    >
                      <PhotoGridLayoutWireframe layout={layout.id} active={active} />
                    </button>
                  );
                })}
                </div>
              </div>
              ) : null}

              {showVideo ? (
              <>
              {(showSingle || showGallery || multiLayouts.length > 0 || gridLayouts.length > 0) ? (
                <SectionDivider />
              ) : null}
              <div className="space-y-1.5">
                <SectionTitle>วิดีโอ</SectionTitle>
                <ToolRowButton
                  label="วิดีโอ"
                  hint="วางช่องวิดีโอก่อน แล้วค่อยอัปโหลดคลิป"
                  preview="video"
                  disabled={videoDisabled}
                  loading={uploadingVideo}
                  dragPayload={{ tool: "video" }}
                  onClick={placeVideo}
                />
              </div>
              </>
              ) : null}
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="pointer-events-none fixed left-2 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-1 sm:left-3">
            <div className="pointer-events-auto flex flex-col items-center gap-1">
              <CollapsedRailButton
                label="ข้อความ"
                disabled={textDisabled}
                dragPayload={{ tool: "body" }}
                onClick={() => onPlaceTool({ tool: "body" })}
              >
                <Type className="h-4 w-4" />
              </CollapsedRailButton>
              <CollapsedRailButton
                label="ภาพ + ข้อความ"
                disabled={imageDisabled || textDisabled}
                dragPayload={{ tool: "image_text", side: "image_left" }}
                onClick={() => placeImageText("image_left")}
              >
                <Columns2 className="h-4 w-4" />
              </CollapsedRailButton>
              <CollapsedRailButton
                label="ภาพเดี่ยว"
                active={singleMode}
                disabled={imageDisabled}
                loading={uploadingImage && singleMode}
                dragPayload={{ tool: "single" }}
                onClick={placeSingle}
              >
                <Image className="h-4 w-4" />
              </CollapsedRailButton>
              <CollapsedRailButton
                label="แกลเลอรีสไลด์"
                active={galleryMode}
                disabled={imageDisabled}
                loading={uploadingImage && galleryMode}
                dragPayload={{ tool: "gallery" }}
                onClick={placeGallery}
              >
                <Layers className="h-4 w-4" />
              </CollapsedRailButton>
              <CollapsedRailButton
                label="ภาพหลายรูป"
                disabled={imageDisabled}
                dragPayload={{ tool: "multi", columns: 2 }}
                onClick={() => placeMulti(2)}
              >
                <Images className="h-4 w-4" />
              </CollapsedRailButton>
              <CollapsedRailButton
                label="Photo grid"
                active={gridMode}
                disabled={imageDisabled}
                dragPayload={{ tool: "grid", layout: gridLayout }}
                onClick={() => placeGrid(gridLayout)}
              >
                <LayoutGrid className="h-4 w-4" />
              </CollapsedRailButton>
              <CollapsedRailButton
                label="วิดีโอ"
                disabled={videoDisabled}
                loading={uploadingVideo}
                dragPayload={{ tool: "video" }}
                onClick={placeVideo}
              >
                <Film className="h-4 w-4" />
              </CollapsedRailButton>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                aria-label="ขยายแถบเครื่องมือ"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
