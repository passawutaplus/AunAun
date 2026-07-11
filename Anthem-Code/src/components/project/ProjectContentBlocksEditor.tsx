import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectRichTextField } from "@/components/project/ProjectRichTextField";
import {
  CONTENT_BLOCK_META,
  PROJECT_BLOCK_BODY_MAX,
  PROJECT_BLOCK_HEADING_MAX,
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
  const addBlock = (type: ProjectContentBlockType) => {
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
      {blocks.length > 0 && (
        <div className="space-y-3">
          {blocks.map((block, index) => {
            return (
              <div
                key={block.id}
                className="space-y-2"
              >
                <div className="flex items-center justify-end gap-1">
                  <GripVertical className="mr-auto w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
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

                {block.type !== "body" && (
                  <ProjectRichTextField
                    value={block.heading ?? ""}
                    onChange={(heading) => patchBlock(block.id, { heading })}
                    placeholder="พิมพ์หัวข้อ..."
                    maxLength={PROJECT_BLOCK_HEADING_MAX}
                    disabled={disabled}
                    variant="heading"
                    className={cn(block.type === "heading" && "[&_[role=textbox]]:text-center")}
                  />
                )}

                {block.type !== "heading" && (
                  <ProjectRichTextField
                    value={block.body ?? ""}
                    onChange={(body) => patchBlock(block.id, { body })}
                    placeholder="เล่าที่มา แนวคิด กระบวนการ หรือผลลัพธ์..."
                    maxLength={PROJECT_BLOCK_BODY_MAX}
                    disabled={disabled}
                    minHeightClass={block.type === "body" ? "min-h-[120px]" : "min-h-[96px]"}
                  />
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
              disabled={disabled}
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
            </button>
          );
        })}
      </div>
      )}
    </section>
  );
}
