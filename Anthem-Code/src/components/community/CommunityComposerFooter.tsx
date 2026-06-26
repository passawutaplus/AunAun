import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onSaveDraft: () => void;
  onPublish: () => void;
  savingDraft?: boolean;
  publishing?: boolean;
  className?: string;
};

export function CommunityComposerFooter({
  onSaveDraft,
  onPublish,
  savingDraft,
  publishing,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur-md",
        "px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      <div className="max-w-2xl mx-auto flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="shrink-0 w-[28%] min-w-[7.5rem] rounded-full px-3 text-sm"
          disabled={savingDraft || publishing}
          onClick={onSaveDraft}
          aria-busy={savingDraft}
        >
          {savingDraft ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-label="กำลังบันทึก" />
          ) : (
            "บันทึกแบบร่าง"
          )}
        </Button>
        <Button
          type="button"
          className="flex-1 rounded-full"
          disabled={savingDraft || publishing}
          onClick={onPublish}
        >
          {publishing ? "กำลังโพสต์..." : "โพสต์"}
        </Button>
      </div>
    </div>
  );
}
