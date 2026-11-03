import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { useCanvasTemplates, UserCanvasTemplate } from "@/hooks/useCanvasTemplates";
import type { ProjectContentBlock } from "@/lib/projectContentBlocks";

export type TemplateNameDialogState =
  | null
  | { mode: "save" }
  | { mode: "rename"; template: UserCanvasTemplate };

type CanvasTemplatesApi = ReturnType<typeof useCanvasTemplates>;

/** Save-as / rename / update / delete prompts for the user's canvas templates. */
export function ProjectEditorTemplateDialogs({
  templateNameDialog,
  setTemplateNameDialog,
  templateNameDraft,
  setTemplateNameDraft,
  pendingUpdateTemplate,
  setPendingUpdateTemplate,
  pendingDeleteTemplate,
  setPendingDeleteTemplate,
  contentBlocks,
  contextEnabled,
  createFromBlocks,
  renameTemplate,
  updateModulesFromBlocks,
  removeTemplate,
}: {
  templateNameDialog: TemplateNameDialogState;
  setTemplateNameDialog: (next: TemplateNameDialogState) => void;
  templateNameDraft: string;
  setTemplateNameDraft: (next: string) => void;
  pendingUpdateTemplate: UserCanvasTemplate | null;
  setPendingUpdateTemplate: (next: UserCanvasTemplate | null) => void;
  pendingDeleteTemplate: UserCanvasTemplate | null;
  setPendingDeleteTemplate: (next: UserCanvasTemplate | null) => void;
  contentBlocks: ProjectContentBlock[];
  contextEnabled: boolean;
  createFromBlocks: CanvasTemplatesApi["createFromBlocks"];
  renameTemplate: CanvasTemplatesApi["rename"];
  updateModulesFromBlocks: CanvasTemplatesApi["updateModulesFromBlocks"];
  removeTemplate: CanvasTemplatesApi["remove"];
}) {
  return (
    <>
      <Dialog
        open={templateNameDialog !== null}
        onOpenChange={(open) => {
          if (!open) setTemplateNameDialog(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {templateNameDialog?.mode === "rename" ? "เปลี่ยนชื่อเทมเพลต" : "บันทึกเป็นเทมเพลต"}
            </DialogTitle>
            <DialogDescription>
              {templateNameDialog?.mode === "rename"
                ? "ตั้งชื่อใหม่ให้เทมเพลตนี้"
                : "เก็บเฉพาะโครงโมดูล (ไม่เก็บรูป/ข้อความจริง) — สูงสุด 5 อัน"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="template-name-input">ชื่อเทมเพลต</Label>
            <Input
              id="template-name-input"
              value={templateNameDraft}
              onChange={(e) => setTemplateNameDraft(e.target.value)}
              placeholder="เช่น เคสแบรนด์สั้น"
              maxLength={80}
              autoFocus
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit?.();
              }}
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setTemplateNameDialog(null)}>
              ยกเลิก
            </Button>
            <Button
              type="button"
              disabled={!templateNameDraft.trim() || createFromBlocks.isPending || renameTemplate.isPending}
              onClick={() => {
                const name = templateNameDraft.trim();
                if (!name || !templateNameDialog) return;
                if (templateNameDialog.mode === "save") {
                  createFromBlocks.mutate(
                    { name, blocks: contentBlocks, openContext: contextEnabled },
                    { onSuccess: () => setTemplateNameDialog(null) },
                  );
                  return;
                }
                renameTemplate.mutate(
                  { id: templateNameDialog.template.id, name },
                  { onSuccess: () => setTemplateNameDialog(null) },
                );
              }}
            >
              {templateNameDialog?.mode === "rename" ? "บันทึกชื่อ" : "บันทึกเทมเพลต"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingUpdateTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setPendingUpdateTemplate(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>อัปเดตเทมเพลต</DialogTitle>
            <DialogDescription>
              แทนที่โครงของ「{pendingUpdateTemplate?.name ?? ""}」ด้วยโมดูลบนแคนวาสปัจจุบัน
              (ไม่เก็บรูป/ข้อความจริง)
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setPendingUpdateTemplate(null)}>
              ยกเลิก
            </Button>
            <Button
              type="button"
              disabled={updateModulesFromBlocks.isPending || contentBlocks.length === 0}
              onClick={() => {
                if (!pendingUpdateTemplate) return;
                updateModulesFromBlocks.mutate(
                  {
                    id: pendingUpdateTemplate.id,
                    blocks: contentBlocks,
                    openContext: contextEnabled,
                  },
                  { onSuccess: () => setPendingUpdateTemplate(null) },
                );
              }}
            >
              อัปเดตโครง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDeleteTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteTemplate(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ลบเทมเพลต</DialogTitle>
            <DialogDescription>
              ลบ「{pendingDeleteTemplate?.name ?? ""}」ออกจากรายการของคุณ? กู้คืนไม่ได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setPendingDeleteTemplate(null)}>
              ยกเลิก
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removeTemplate.isPending}
              onClick={() => {
                if (!pendingDeleteTemplate) return;
                removeTemplate.mutate(pendingDeleteTemplate.id, {
                  onSuccess: () => setPendingDeleteTemplate(null),
                });
              }}
            >
              ลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
