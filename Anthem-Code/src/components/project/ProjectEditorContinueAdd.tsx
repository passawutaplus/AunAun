import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

export function ProjectEditorContinueAdd({ onClick, disabled, className }: Props) {
  return (
    <div className={cn("flex justify-center py-1", className)}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex h-8 w-8 items-center justify-center text-primary transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-40"
        aria-label="เพิ่มเนื้อหาต่อ"
        title="เพิ่มเนื้อหาต่อ"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
