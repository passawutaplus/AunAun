import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Palette,
  Trash2,
  Pencil,
  Plus,
  X,
  Eye,
  FolderInput,
  MoreVertical,
  Copy,
  FileText,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { useColorPalettes, type ColorPalette } from "@/hooks/useColorPalettes";
import { getColorBreakdown, preferWhiteText } from "@/lib/colorUtils";
import { ColorCodesTable } from "@/components/dashboard/briefs/ColorLab/ColorCodesTable";
import { storeLabsPaletteHandoff } from "@/lib/labsPaletteHandoff";
import { toast } from "sonner";

interface Props {
  onPickColor: (hex: string) => void;
}

export function MyPalettes({ onPickColor }: Props) {
  const { palettes, loading, createPalette, renamePalette, deletePalette, removeColor, moveColor } =
    useColorPalettes();
  const [newName, setNewName] = React.useState("");
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");

  React.useEffect(() => {
    if (!activeId && palettes[0]) setActiveId(palettes[0].id);
    if (activeId && !palettes.find((p) => p.id === activeId)) {
      setActiveId(palettes[0]?.id ?? null);
    }
  }, [palettes, activeId]);

  const active = palettes.find((p) => p.id === activeId);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const id = await createPalette(name);
    setNewName("");
    if (id) setActiveId(id);
  };

  const applyActiveToBrief = (): boolean => {
    if (!active || active.colors.length === 0) {
      toast.error("ยังไม่มีสีในหมวดนี้");
      return false;
    }
    storeLabsPaletteHandoff({
      paletteName: active.name,
      hexes: active.colors.map((c) => c.hex),
    });
    toast.success(`เตรียมพาเลท "${active.name}" สำหรับ Smart Brief แล้ว`);
    return true;
  };

  const copyActivePalette = async () => {
    if (!active || active.colors.length === 0) {
      toast.error("ยังไม่มีสีในหมวดนี้");
      return;
    }
    const lines = active.colors.map((c) => {
      const label = c.label?.trim();
      return label ? `${c.hex}  /* ${label} */` : c.hex;
    });
    const text = [`/* ${active.name} */`, ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`คัดลอก ${active.colors.length} สีจาก "${active.name}" แล้ว`);
    } catch {
      toast.error("ก๊อปปี้ไม่สำเร็จ");
    }
  };

  return (
    <Card className="p-4 sm:p-5 glass">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Palette className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">พาเลทสีของฉัน</h3>
        <Badge variant="outline" className="text-[10px]">
          {palettes.length} หมวด
        </Badge>
        {active && active.colors.length > 0 && (
          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto h-7 gap-1.5 text-[11px] rounded-lg"
              onClick={copyActivePalette}
            >
              <Copy className="h-3 w-3" />
              คัดลอกหมวดนี้
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-7 gap-1.5 text-[11px] rounded-lg"
              asChild
            >
              <Link
                to="/dashboard"
                search={{ tab: "planner", sub: "briefs" }}
                onClick={(e) => {
                  if (!applyActiveToBrief()) e.preventDefault();
                }}
              >
                <FileText className="h-3 w-3" />
                ใส่ในบรีฟ
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="ตั้งชื่อหมวดใหม่ เช่น Brand / Pastel / Web"
          maxLength={40}
          className="h-9"
        />
        <Button onClick={handleCreate} className="gap-1.5 h-9 shrink-0">
          <Plus className="h-4 w-4" /> เพิ่มหมวด
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-lg" />
            ))}
          </div>
        </div>
      ) : palettes.length === 0 ? (
        <div className="text-center text-xs text-muted-foreground py-8">
          ยังไม่มีพาเลท — สร้างหมวดแรกของคุณ แล้วกด "บันทึกสีนี้" จาก Color Lab
        </div>
      ) : (
        <>
          {/* Palette tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {palettes.map((p) => (
              <div key={p.id} className="flex items-center">
                {editingId === p.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-xs w-32"
                      autoFocus
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          await renamePalette(p.id, editName);
                          setEditingId(null);
                        } else if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={async () => {
                        await renamePalette(p.id, editName);
                        setEditingId(null);
                      }}
                    >
                      บันทึก
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveId(p.id)}
                    className={`group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full text-xs border transition ${
                      activeId === p.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:border-primary"
                    }`}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-[10px] opacity-70">{p.colors.length}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(p.id);
                        setEditName(p.name);
                      }}
                      className="ml-1 p-1 rounded-full hover:bg-black/10 transition opacity-60 hover:opacity-100"
                      aria-label="แก้ชื่อ"
                    >
                      <Pencil className="h-3 w-3" />
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded-full hover:bg-rose-500/20 transition opacity-60 hover:opacity-100"
                          aria-label="ลบหมวด"
                        >
                          <X className="h-3 w-3" />
                        </span>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>ลบหมวด "{p.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            สีทั้งหมด {p.colors.length} สีในหมวดนี้จะถูกลบไปด้วย
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePalette(p.id)}>
                            ลบ
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Active palette colors */}
          {active && (
            <div>
              {active.colors.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-8 border border-dashed rounded-lg">
                  ยังไม่มีสีในหมวดนี้ — เลือกสีจาก Color Lab ด้านบนแล้วกด "บันทึกสีนี้"
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {active.colors.map((c) => (
                    <ColorChip
                      key={c.id}
                      hex={c.hex}
                      label={c.label}
                      onPick={() => onPickColor(c.hex)}
                      onDelete={() => removeColor(c.id)}
                      palettes={palettes}
                      currentPaletteId={active.id}
                      onMove={(targetId) => moveColor(c.id, targetId)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function ColorChip({
  hex,
  label,
  onPick,
  onDelete,
  palettes,
  currentPaletteId,
  onMove,
}: {
  hex: string;
  label: string | null;
  onPick: () => void;
  onDelete: () => void;
  palettes: ColorPalette[];
  currentPaletteId: string;
  onMove: (targetPaletteId: string) => void;
}) {
  const breakdown = React.useMemo(() => getColorBreakdown(hex), [hex]);
  const useWhite = preferWhiteText(hex);
  const otherPalettes = palettes.filter((p) => p.id !== currentPaletteId);

  return (
    <div className="group relative rounded-lg overflow-hidden border border-border hover:shadow-elevated transition">
      <button
        type="button"
        onClick={onPick}
        className="w-full aspect-square flex items-end justify-start p-2 transition-transform group-hover:scale-[1.02]"
        style={{ backgroundColor: hex, color: useWhite ? "#fff" : "#000" }}
        title={`ใช้ ${hex}`}
      >
        <span className="text-[10px] font-mono font-semibold drop-shadow">{hex}</span>
      </button>
      <div className="px-2 py-1.5 bg-card border-t border-border">
        <div className="text-[10px] truncate text-muted-foreground" title={label ?? ""}>
          {label || "ไม่มีชื่อ"}
        </div>
      </div>
      {/* Action buttons */}
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="secondary" className="h-6 w-6 p-0" title="ดูโค้ดสี">
              <Eye className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[300px] sm:w-[360px] p-3">
            <div className="text-xs font-semibold mb-2">{label || hex}</div>
            {breakdown && <ColorCodesTable breakdown={breakdown} />}
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="secondary" className="h-6 w-6 p-0" title="ตัวเลือกอื่น">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="flex items-center gap-1.5 text-xs">
              <FolderInput className="h-3.5 w-3.5" /> ย้ายไปหมวด
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {otherPalettes.length === 0 ? (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                ไม่มีหมวดอื่น — สร้างเพิ่มก่อน
              </DropdownMenuItem>
            ) : (
              otherPalettes.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => onMove(p.id)}
                  className="text-xs cursor-pointer"
                >
                  {p.name}
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {p.colors.length}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive" className="h-6 w-6 p-0" title="ลบสี">
              <Trash2 className="h-3 w-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ลบสี {hex}?</AlertDialogTitle>
              <AlertDialogDescription>การลบนี้ไม่สามารถย้อนกลับได้</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>ลบ</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
