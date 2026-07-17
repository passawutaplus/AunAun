import { useEffect, useState, Fragment, type ReactNode } from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  FileImage,
  Film,
  GripVertical,
  Image as ImageIcon,
  LayoutGrid,
  Lock,
  LockOpen,
  Moon,
  Pencil,
  Sun,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useThemeFade } from "@/hooks/useThemeFade";
import {
  FLEX_GRID_MODULE_DEFAULTS,
  FLEX_GRID_PRESET_META,
  FLEX_GRID_PRESETS,
  boardDisplayName,
  type FlexAlignKind,
  type FlexDistributeKind,
  type FlexGridLayout,
  type FlexGridModule,
  type FlexGridModuleType,
  type FlexGridSettings,
} from "@/lib/flexGridLayout";
import { cn } from "@/lib/utils";

export const FLEX_GRID_TOOL_MIME = "application/x-flex-grid-module";

export function flexGridBoardDomId(boardId: string) {
  return `flex-grid-board-${boardId}`;
}

/** Browsers block getData() during dragover — stash active drag type here. */
export let activeFlexGridDragType: FlexGridModuleType | null = null;

export function setActiveFlexGridDragType(type: FlexGridModuleType | null) {
  activeFlexGridDragType = type;
}

export type FlexGridLayerRef = {
  boardId: string;
  moduleId: string;
};

type Props = {
  layout: FlexGridLayout;
  selected: FlexGridLayerRef | null;
  selection: FlexGridLayerRef[];
  onSelect: (ref: FlexGridLayerRef | null, additive?: boolean) => void;
  onGridChange: (grid: FlexGridSettings) => void;
  onDeleteModule: (ref: FlexGridLayerRef) => void;
  onDeleteBoard: (boardId: string) => void;
  onDuplicateBoard: (boardId: string) => void;
  onRenameBoard: (boardId: string, name: string) => void;
  onRenameModule: (ref: FlexGridLayerRef, name: string) => void;
  onToggleLock: (ref: FlexGridLayerRef) => void;
  onAlign: (kind: FlexAlignKind) => void;
  onDistribute: (kind: FlexDistributeKind) => void;
  onReorderLayer: (boardId: string, fromModuleId: string, toModuleId: string) => void;
  onMoveLayer: (boardId: string, moduleId: string, direction: "up" | "down") => void;
  onPlaceModule?: (type: FlexGridModuleType) => void;
  gridVisible: boolean;
  onGridVisibleChange: (visible: boolean) => void;
  snapEnabled: boolean;
  onSnapEnabledChange: (enabled: boolean) => void;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
};

const MODULE_CARDS: {
  type: FlexGridModuleType;
  label: string;
  hint: string;
  icon: typeof ImageIcon;
}[] = [
  { type: "image", label: "Image", hint: "วางภาพบนกริด", icon: ImageIcon },
  { type: "gif", label: "GIF", hint: "ภาพเคลื่อนไหว .gif", icon: FileImage },
  { type: "text", label: "Text", hint: "ข้อความแก้ไขได้", icon: Type },
  { type: "video", label: "Video", hint: "วางวิดีโอ", icon: Film },
  { type: "model3d", label: "3D Model", hint: "ไฟล์ STL/OBJ หมุน 360°", icon: Box },
];

function HybridField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-[10px] text-muted-foreground">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 min-w-0 flex-1 accent-primary"
      />
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-7 w-12 rounded border border-border/70 bg-background px-1 text-center text-[11px] tabular-nums"
      />
    </div>
  );
}

type SidebarSectionKey = "modules" | "view" | "align" | "grid" | "layers";

function SidebarSection({
  title,
  hint,
  open,
  onToggle,
  bordered,
  children,
}: {
  title: string;
  hint?: ReactNode;
  open: boolean;
  onToggle: () => void;
  bordered?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", bordered && "border-t border-border/60 pt-3")}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-0.5 py-1 text-left hover:text-foreground"
        aria-expanded={open}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </span>
          {hint ? (
            <span className="text-[10px] text-muted-foreground tabular-nums">{hint}</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-300 ease-out",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "space-y-1.5 transition-opacity duration-300 ease-out",
              open ? "opacity-100" : "opacity-0",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FlexGridToolsSidebar({
  layout,
  selected,
  selection,
  onSelect,
  onGridChange,
  onDeleteModule,
  onDeleteBoard,
  onDuplicateBoard,
  onRenameBoard,
  onRenameModule,
  onToggleLock,
  onAlign,
  onDistribute,
  onReorderLayer,
  onMoveLayer,
  onPlaceModule,
  gridVisible,
  onGridVisibleChange,
  snapEnabled,
  onSnapEnabledChange,
  expanded: expandedProp,
  onExpandedChange,
  className,
}: Props) {
  const isControlled = expandedProp !== undefined;
  const [internalExpanded, setInternalExpanded] = useState(true);
  const expanded = isControlled ? !!expandedProp : internalExpanded;
  const setExpanded = (next: boolean) => {
    if (!isControlled) setInternalExpanded(next);
    onExpandedChange?.(next);
  };

  const [gridPanelOpen, setGridPanelOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SidebarSectionKey, boolean>>({
    modules: true,
    view: true,
    align: true,
    grid: true,
    layers: true,
  });
  const toggleSection = (key: SidebarSectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const [dragLayerId, setDragLayerId] = useState<string | null>(null);
  const [pendingDeleteBoard, setPendingDeleteBoard] = useState<{
    id: string;
    name: string;
    moduleCount: number;
  } | null>(null);
  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);
  const [renamingModuleId, setRenamingModuleId] = useState<string | null>(null);
  const { isDark, toggleTheme, mounted } = useThemeFade();

  useEffect(() => {
    if (isControlled) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setInternalExpanded(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [isControlled]);

  const grid = layout.grid;
  const patchGrid = (partial: Partial<FlexGridSettings>) => {
    onGridChange({ ...grid, ...partial });
  };

  const matchedPreset = Object.entries(FLEX_GRID_PRESETS).find(([, p]) =>
    p.columns === grid.columns &&
    p.colGap === grid.colGap &&
    p.colMargin === grid.colMargin &&
    p.rows === grid.rows &&
    p.rowGap === grid.rowGap &&
    p.rowMargin === grid.rowMargin,
  )?.[0];

  const layersByBoard = layout.boards.map((board, bi) => ({
    board,
    boardIndex: bi,
    modules: [...board.modules].sort((a, b) => b.z - a.z),
  }));

  return (
    <>
      {expanded ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/45 lg:hidden"
          aria-label="ปิดแถบเครื่องมือ"
          onClick={() => setExpanded(false)}
        />
      ) : null}

      <aside
        className={cn(
          "relative shrink-0 transition-[width] duration-200",
          expanded
            ? cn(
                "fixed bottom-0 left-0 top-14 z-50 w-[min(280px,88vw)] border-r border-border/80 bg-card shadow-xl",
                "lg:sticky lg:inset-auto lg:top-16 lg:z-auto lg:w-[248px] lg:self-start lg:bg-card/95 lg:shadow-none lg:backdrop-blur-md",
              )
            : "w-0 border-0 bg-transparent",
          className,
        )}
        aria-label="เครื่องมือ Full Grid"
      >
        {expanded ? (
          <div className="flex h-full flex-col lg:h-[calc(100dvh-4rem)]">
            <div className="flex items-center justify-between gap-2 p-2 pl-3">
              <p className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground leading-snug">
                <LayoutGrid className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Full Grid
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

            <div className="flex-1 overflow-y-auto p-3 pt-1 space-y-4">
              <SidebarSection
                title="Modules"
                open={openSections.modules}
                onToggle={() => toggleSection("modules")}
              >
                <div className="grid grid-cols-1 gap-1.5">
                  {MODULE_CARDS.map((card) => {
                    const Icon = card.icon;
                    return (
                      <button
                        key={card.type}
                        type="button"
                        draggable
                        onDragStart={(e) => {
                          setActiveFlexPhotoGridPreset(null);
                          setActiveFlexGridDragType(card.type);
                          e.dataTransfer.setData(FLEX_GRID_TOOL_MIME, card.type);
                          e.dataTransfer.setData("text/plain", card.type);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onDragEnd={() => setActiveFlexGridDragType(null)}
                        onClick={() => onPlaceModule?.(card.type)}
                        className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-background/80 px-2.5 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                        title={`ลากหรือคลิกเพื่อวาง ${card.label}`}
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/60 text-foreground/70">
                          <Icon className="h-4 w-4" strokeWidth={1.5} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-medium text-foreground">{card.label}</span>
                          <span className="block text-[10px] text-muted-foreground">{card.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </SidebarSection>

              <SidebarSection
                title="View"
                bordered
                open={openSections.view}
                onToggle={() => toggleSection("view")}
              >
                <div className="flex flex-wrap items-center gap-2 px-0.5">
                    <label className="inline-flex cursor-pointer items-center gap-1.5">
                      <Checkbox
                        checked={gridVisible}
                        onCheckedChange={(v) => onGridVisibleChange(v === true)}
                        aria-label={gridVisible ? "Hide grid" : "Show grid"}
                        className="h-3.5 w-3.5 rounded-full [&_svg]:h-2.5 [&_svg]:w-2.5"
                      />
                      <span className="text-[10px] font-medium text-muted-foreground">
                        Show Grid
                      </span>
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-1.5">
                      <Checkbox
                        checked={snapEnabled}
                        onCheckedChange={(v) => onSnapEnabledChange(v === true)}
                        aria-label={snapEnabled ? "ปิดสแนป" : "เปิดสแนป"}
                        className="h-3.5 w-3.5 rounded-full [&_svg]:h-2.5 [&_svg]:w-2.5"
                      />
                      <span className="text-[10px] font-medium text-muted-foreground">Snap</span>
                    </label>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      disabled={!mounted}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                      title={isDark ? "สลับโหมดสว่าง" : "สลับโหมดมืด"}
                      aria-label={isDark ? "สลับโหมดสว่าง" : "สลับโหมดมืด"}
                    >
                      {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                    </button>
                </div>
              </SidebarSection>

              <SidebarSection
                title="Align"
                bordered
                open={openSections.align}
                onToggle={() => toggleSection("align")}
              >
                <div className="flex flex-wrap items-center gap-0.5">
                  {(
                    [
                      ["left", AlignStartVertical, "ชิดซ้าย"],
                      ["center", AlignCenterVertical, "กึ่งกลางแนวนอน"],
                      ["right", AlignEndVertical, "ชิดขวา"],
                      ["top", AlignStartHorizontal, "ชิดบน"],
                      ["middle", AlignCenterHorizontal, "กึ่งกลางแนวตั้ง"],
                      ["bottom", AlignEndHorizontal, "ชิดล่าง"],
                    ] as const
                  ).map(([kind, Icon, label], i) => {
                    const enabled = selection.length >= 2;
                    return (
                      <Fragment key={kind}>
                        {i === 3 ? (
                          <span className="mx-0.5 h-3.5 w-px shrink-0 bg-border" aria-hidden />
                        ) : null}
                        <button
                          type="button"
                          title={enabled ? label : "Ctrl+คลิกเลือกอย่างน้อย 2 โมดูล"}
                          aria-label={label}
                          disabled={!enabled}
                          onClick={() => onAlign(kind)}
                          className={cn(
                            "rounded p-1.5 transition-colors",
                            enabled
                              ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                              : "cursor-not-allowed text-muted-foreground/35",
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </button>
                      </Fragment>
                    );
                  })}
                  <span className="mx-0.5 h-3.5 w-px shrink-0 bg-border" aria-hidden />
                  {(
                    [
                      ["vertical", AlignVerticalDistributeCenter, "กระจายแนวตั้ง"] as const,
                      ["horizontal", AlignHorizontalDistributeCenter, "กระจายแนวนอน"] as const,
                    ]
                  ).map(([kind, Icon, label]) => {
                    const enabled = selection.length >= 3;
                    return (
                      <button
                        key={kind}
                        type="button"
                        title={enabled ? label : "Ctrl+คลิกเลือกอย่างน้อย 3 โมดูล"}
                        aria-label={label}
                        disabled={!enabled}
                        onClick={() => onDistribute(kind)}
                        className={cn(
                          "rounded p-1.5 transition-colors",
                          enabled
                            ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                            : "cursor-not-allowed text-muted-foreground/35",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    );
                  })}
                </div>
              </SidebarSection>

              <SidebarSection
                title="Grid"
                bordered
                open={openSections.grid}
                onToggle={() => toggleSection("grid")}
              >
                <div className="grid grid-cols-3 gap-2">
                  {FLEX_GRID_PRESET_META.map((preset) => {
                    const active = matchedPreset === preset.key;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => onGridChange({ ...FLEX_GRID_PRESETS[preset.key] })}
                        className="group flex flex-col items-center gap-1.5 text-center"
                        title={preset.label}
                      >
                        <span
                          className={cn(
                            "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2 p-1.5 transition-colors",
                            active
                              ? "border-primary bg-primary/10"
                              : "border-border/70 bg-background hover:border-primary/40",
                          )}
                        >
                          {preset.kind === "columns" ? (
                            <span className="absolute inset-1.5 flex gap-0.5">
                              {Array.from({ length: preset.wireCols }, (_, i) => (
                                <span
                                  key={i}
                                  className={cn(
                                    "h-full flex-1 rounded-[2px]",
                                    active ? "bg-primary/35" : "bg-foreground/15",
                                  )}
                                />
                              ))}
                            </span>
                          ) : (
                            <span
                              className="absolute inset-1.5 grid gap-0.5"
                              style={{
                                gridTemplateColumns: `repeat(${preset.wireCols}, minmax(0, 1fr))`,
                                gridTemplateRows: `repeat(${preset.wireRows}, minmax(0, 1fr))`,
                              }}
                            >
                              {Array.from(
                                { length: preset.wireCols * preset.wireRows },
                                (_, i) => (
                                  <span
                                    key={i}
                                    className={cn(
                                      "rounded-[1px]",
                                      active ? "bg-primary/35" : "bg-foreground/15",
                                    )}
                                  />
                                ),
                              )}
                            </span>
                          )}
                          <span
                            className={cn(
                              "relative z-[1] flex h-7 min-w-7 items-center justify-center rounded-full bg-background px-1.5 text-[10px] font-semibold shadow-sm",
                              active ? "text-primary" : "text-foreground",
                            )}
                          >
                            {preset.badge}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "text-[9px] font-medium leading-tight",
                            active ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setGridPanelOpen((v) => !v)}
                  className="inline-flex items-center gap-1 px-0.5 py-1.5 text-xs text-foreground hover:text-primary"
                  aria-expanded={gridPanelOpen}
                >
                  ปรับอย่างละเอียด
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform duration-300 ease-out",
                      gridPanelOpen && "rotate-180",
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-out",
                    gridPanelOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div
                      className={cn(
                        "mt-1 space-y-2.5 rounded-lg border border-border/60 bg-muted/20 p-2.5 transition-opacity duration-300 ease-out",
                        gridPanelOpen ? "opacity-100" : "opacity-0",
                      )}
                    >
                      <p className="text-[10px] font-medium text-muted-foreground">Columns</p>
                      <HybridField
                        label="Count"
                        value={grid.columns}
                        min={1}
                        max={16}
                        onChange={(n) => patchGrid({ columns: n })}
                      />
                      <HybridField
                        label="Gutter"
                        value={grid.colGap}
                        min={0}
                        max={60}
                        onChange={(n) => patchGrid({ colGap: n })}
                      />
                      <HybridField
                        label="Margin"
                        value={grid.colMargin}
                        min={0}
                        max={100}
                        onChange={(n) => patchGrid({ colMargin: n })}
                      />
                      <p className="text-[10px] font-medium text-muted-foreground">Rows</p>
                      <HybridField
                        label="Count"
                        value={grid.rows}
                        min={0}
                        max={24}
                        onChange={(n) => patchGrid({ rows: n })}
                      />
                      <HybridField
                        label="Gutter"
                        value={grid.rowGap}
                        min={0}
                        max={60}
                        onChange={(n) => patchGrid({ rowGap: n })}
                      />
                      <HybridField
                        label="Margin"
                        value={grid.rowMargin}
                        min={0}
                        max={100}
                        onChange={(n) => patchGrid({ rowMargin: n })}
                      />
                    </div>
                  </div>
                </div>
              </SidebarSection>

              <SidebarSection
                title="Layers"
                bordered
                open={openSections.layers}
                onToggle={() => toggleSection("layers")}
              >
                <div className="space-y-2.5">
                  {layersByBoard.map(({ board, boardIndex, modules }) => {
                    const title = boardDisplayName(board, boardIndex);
                    const renaming = renamingBoardId === board.id;
                    return (
                    <div key={board.id} className="space-y-1">
                      <div className="flex items-center gap-1 px-0.5">
                        {renaming ? (
                          <Input
                            autoFocus
                            defaultValue={board.name?.trim() || title}
                            className="h-7 flex-1 rounded-md px-1.5 text-[11px]"
                            aria-label={`ชื่อ Board ${boardIndex + 1}`}
                            onBlur={(e) => {
                              onRenameBoard(board.id, e.target.value);
                              setRenamingBoardId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.currentTarget.blur();
                              }
                              if (e.key === "Escape") {
                                setRenamingBoardId(null);
                              }
                            }}
                          />
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                document
                                  .getElementById(flexGridBoardDomId(board.id))
                                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }}
                              className="min-w-0 flex-1 truncate text-left text-[10px] font-semibold text-foreground hover:text-primary"
                              title="ไปยัง board นี้"
                            >
                              {title}
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                  aria-label={`เมนู ${title}`}
                                  title="เมนู board"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  className="text-xs gap-2"
                                  onSelect={() => setRenamingBoardId(board.id)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  แก้ไขชื่อ
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs gap-2"
                                  onSelect={() => onDuplicateBoard(board.id)}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  ก๊อปทั้งบอร์ด
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs gap-2 text-destructive focus:text-destructive"
                                  disabled={layout.boards.length <= 1}
                                  onSelect={() => {
                                    if (layout.boards.length <= 1) return;
                                    setPendingDeleteBoard({
                                      id: board.id,
                                      name: title,
                                      moduleCount: modules.length,
                                    });
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  ลบบอร์ด
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                      {modules.length === 0 ? (
                        <p className="rounded-md border border-dashed border-border/60 px-2 py-2 text-center text-[10px] text-muted-foreground">
                          ว่าง — ลากโมดูลมาวาง
                        </p>
                      ) : (
                        modules.map((m, idx) => (
                          <LayerItem
                            key={m.id}
                            module={m}
                            selected={
                              selection.some((s) => s.boardId === board.id && s.moduleId === m.id)
                            }
                            primary={
                              selected?.boardId === board.id && selected?.moduleId === m.id
                            }
                            dragging={dragLayerId === m.id}
                            renaming={renamingModuleId === m.id}
                            canMoveUp={idx > 0}
                            canMoveDown={idx < modules.length - 1}
                            onSelect={(additive) =>
                              onSelect({ boardId: board.id, moduleId: m.id }, additive)
                            }
                            onStartRename={() => setRenamingModuleId(m.id)}
                            onCancelRename={() => setRenamingModuleId(null)}
                            onRename={(name) => {
                              onRenameModule({ boardId: board.id, moduleId: m.id }, name);
                              setRenamingModuleId(null);
                            }}
                            onToggleLock={() =>
                              onToggleLock({ boardId: board.id, moduleId: m.id })
                            }
                            onDelete={() => onDeleteModule({ boardId: board.id, moduleId: m.id })}
                            onMoveUp={() => onMoveLayer(board.id, m.id, "up")}
                            onMoveDown={() => onMoveLayer(board.id, m.id, "down")}
                            onDragStart={() => setDragLayerId(m.id)}
                            onDragEnd={() => setDragLayerId(null)}
                            onDrop={() => {
                              if (!dragLayerId || dragLayerId === m.id) return;
                              onReorderLayer(board.id, dragLayerId, m.id);
                              setDragLayerId(null);
                            }}
                          />
                        ))
                      )}
                    </div>
                    );
                  })}
                </div>
              </SidebarSection>
            </div>
          </div>
        ) : null}
      </aside>

      <DeleteConfirmDialog
        open={!!pendingDeleteBoard}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteBoard(null);
        }}
        title={`ลบ ${pendingDeleteBoard?.name ?? "Board"}?`}
        description={
          pendingDeleteBoard && pendingDeleteBoard.moduleCount > 0
            ? `การลบ Board นี้จะลบโมดูลทั้งหมดใน board ด้วย (${pendingDeleteBoard.moduleCount} โมดูล) ไม่สามารถกู้คืนได้`
            : "ยืนยันลบ Board นี้หรือไม่"
        }
        confirmLabel="ลบ board"
        onConfirm={() => {
          if (!pendingDeleteBoard) return;
          onDeleteBoard(pendingDeleteBoard.id);
          setPendingDeleteBoard(null);
        }}
      />

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="fixed left-2 top-[4.75rem] z-30 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card shadow-md lg:sticky lg:top-20 lg:z-auto lg:self-start"
          aria-label="เปิดแถบเครื่องมือ Full Grid"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}
    </>
  );
}

function LayerItem({
  module,
  selected,
  primary,
  dragging,
  renaming,
  canMoveUp,
  canMoveDown,
  onSelect,
  onStartRename,
  onCancelRename,
  onRename,
  onToggleLock,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  module: FlexGridModule;
  selected: boolean;
  primary: boolean;
  dragging: boolean;
  renaming: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: (additive?: boolean) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onRename: (name: string) => void;
  onToggleLock: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
}) {
  const label =
    module.name?.trim() ||
    `${FLEX_GRID_MODULE_DEFAULTS[module.type].label.charAt(0)}${FLEX_GRID_MODULE_DEFAULTS[
      module.type
    ].label
      .slice(1)
      .toLowerCase()}`;

  return (
    <div
      draggable={!renaming && !module.locked}
      onDragStart={(e) => {
        if (renaming || module.locked) {
          e.preventDefault();
          return;
        }
        onDragStart();
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onClick={(e) => {
        if (renaming) return;
        onSelect(e.ctrlKey || e.metaKey);
      }}
      className={cn(
        "flex cursor-pointer items-center gap-1 rounded-md border px-1 py-1 text-left transition-colors",
        selected
          ? primary
            ? "border-primary/50 bg-primary/10"
            : "border-primary/30 bg-primary/5"
          : "border-transparent bg-muted/30 hover:bg-muted/50",
        dragging && "opacity-50",
        module.locked && "opacity-80",
      )}
    >
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
      {renaming ? (
        <Input
          autoFocus
          defaultValue={module.name?.trim() || label}
          className="h-6 min-w-0 flex-1 rounded-md px-1.5 text-[11px]"
          aria-label={`ชื่อโมดูล ${label}`}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => onRename(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
            if (e.key === "Escape") {
              onCancelRename();
            }
          }}
        />
      ) : (
        <span
          className="min-w-0 flex-1 truncate text-[11px] text-foreground"
          onDoubleClick={(e) => {
            e.stopPropagation();
            onStartRename();
          }}
          title="ดับเบิลคลิกเพื่อเปลี่ยนชื่อ · Ctrl+คลิกเลือกหลายอัน"
        >
          {label}
        </span>
      )}
      <div className="flex shrink-0 items-center">
        {!renaming ? (
          <button
            type="button"
            title="เปลี่ยนชื่อโมดูล"
            onClick={(e) => {
              e.stopPropagation();
              onStartRename();
            }}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label={`เปลี่ยนชื่อ ${label}`}
          >
            <Pencil className="h-3 w-3" />
          </button>
        ) : null}
        <button
          type="button"
          title={module.locked ? "ปลดล็อก" : "ล็อกโมดูล"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock();
          }}
          className={cn(
            "rounded p-0.5 text-muted-foreground hover:text-foreground",
            module.locked && "text-primary",
          )}
          aria-label={module.locked ? "ปลดล็อก" : "ล็อก"}
        >
          {module.locked ? (
            <Lock className="h-3 w-3" />
          ) : (
            <LockOpen className="h-3 w-3" />
          )}
        </button>
        <button
          type="button"
          disabled={!canMoveUp || !!module.locked}
          title="เลื่อนขึ้น (นำหน้ากว่า)"
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="เลื่อนเลเยอร์ขึ้น"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={!canMoveDown || !!module.locked}
          title="เลื่อนลง (อยู่ด้านหลังกว่า)"
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="เลื่อนเลเยอร์ลง"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={!!module.locked}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded p-0.5 text-muted-foreground hover:text-destructive disabled:opacity-30"
          aria-label="ลบโมดูล"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
