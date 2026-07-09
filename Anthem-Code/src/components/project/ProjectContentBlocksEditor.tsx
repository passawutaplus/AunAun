import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CONTENT_BLOCK_META,
  PROJECT_BLOCK_BODY_MAX,
  PROJECT_BLOCK_HEADING_MAX,
  PROJECT_CONTENT_BLOCKS_MAX,
  createContentBlock,
  type ProjectContentBlock,
  type ProjectContentBlockType,
} from "@/lib/projectContentBlocks";
import { cn } from "@/lib/utils";

type Props = {
  blocks: ProjectContentBlock[];
  onChange: (blocks: ProjectContentBlock[]) => void;
  disabled?: boolean;
  hideAddButtons?: boolean;
};

function BlockTypePreview({ type }: { type: ProjectContentBlockType }) {
  if (type === "heading") {
    return (
      <div className="rounded-lg border border-border bg-background px-3 py-4 text-center">
        <p className="text-sm font-semibold text-foreground">หัวข้อ</p>
      </div>
    );
  }
  if (type === "heading_body") {
    return (
      <div className="rounded-lg border border-border bg-background px-3 py-3 space-y-1.5 text-left">
        <p className="text-sm font-semibold text-foreground">หัวข้อ</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          ย่อหน้าอธิบายรายละเอียดงาน...
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-3 text-left">
      <p className="text-xs text-muted-foreground leading-relaxed">
        ย่อหน้าอธิบายรายละเอียดงาน...
      </p>
    </div>
  );
}

function moveBlock(blocks: ProjectContentBlock[], index: number, dir: -1 | 1) {
  const next = index + dir;
  if (next < 0 || next >= blocks.length) return blocks;
  const copy = [...blocks];
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item!);
  return copy;
}

export function ProjectContentBlocksEditor({
  blocks,
  onChange,
  disabled,
  hideAddButtons = false,
}: Props) {
  const canAdd = blocks.length < PROJECT_CONTENT_BLOCKS_MAX;

  const addBlock = (type: ProjectContentBlockType) => {
    if (!canAdd) return;
    onChange([...blocks, createContentBlock(type)]);
  };

  const patchBlock = (id: string, patch: Partial<ProjectContentBlock>) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
  };

  if (hideAddButtons && blocks.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <Label className="text-sm font-semibold">เนื้อหาผลงาน</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          เพิ่มบล็อกหัวข้อ/เนื้อหา — จัดเรียงตามลำดับที่ต้องการ
        </p>
      </div>

      {blocks.length > 0 && (
        <div className="space-y-3">
          {blocks.map((block, index) => {
            const meta = CONTENT_BLOCK_META[block.type];
            return (
              <div
                key={block.id}
                className="rounded-2xl border border-border bg-card/50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
                    <span className="text-xs font-medium text-muted-foreground truncate">
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={disabled || index === 0}
                      aria-label="เลื่อนขึ้น"
                      onClick={() => onChange(moveBlock(blocks, index, -1))}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={disabled || index === blocks.length - 1}
                      aria-label="เลื่อนลง"
                      onClick={() => onChange(moveBlock(blocks, index, 1))}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={disabled}
                      aria-label="ลบบล็อก"
                      onClick={() => removeBlock(block.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {block.type !== "body" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">หัวข้อ</Label>
                    <Input
                      value={block.heading ?? ""}
                      onChange={(e) => patchBlock(block.id, { heading: e.target.value })}
                      placeholder="พิมพ์หัวข้อ..."
                      maxLength={PROJECT_BLOCK_HEADING_MAX}
                      disabled={disabled}
                      className={cn(block.type === "heading" && "text-center font-semibold")}
                    />
                  </div>
                )}

                {block.type !== "heading" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">เนื้อหา</Label>
                    <Textarea
                      value={block.body ?? ""}
                      onChange={(e) => patchBlock(block.id, { body: e.target.value })}
                      placeholder="เล่าที่มา แนวคิด กระบวนการ หรือผลลัพธ์..."
                      rows={block.type === "body" ? 5 : 4}
                      maxLength={PROJECT_BLOCK_BODY_MAX}
                      disabled={disabled}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!hideAddButtons && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {(["heading", "heading_body", "body"] as const).map((type) => {
          const meta = CONTENT_BLOCK_META[type];
          return (
            <button
              key={type}
              type="button"
              disabled={disabled || !canAdd}
              onClick={() => addBlock(type)}
              className={cn(
                "rounded-xl border border-dashed border-border bg-muted/30 p-3 text-left transition-colors",
                "hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50 disabled:pointer-events-none",
              )}
            >
              <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-foreground">
                <Plus className="w-3.5 h-3.5" />
                {meta.label}
              </div>
              <BlockTypePreview type={type} />
              <p className="text-[10px] text-muted-foreground mt-2 leading-snug">{meta.description}</p>
            </button>
          );
        })}
      </div>
      )}

      <p className="text-xs text-muted-foreground text-right">
        {blocks.length}/{PROJECT_CONTENT_BLOCKS_MAX} บล็อก
      </p>
    </section>
  );
}
