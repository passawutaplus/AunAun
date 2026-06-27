import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
  isEditing: boolean;
  saving?: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  children: React.ReactNode;
  editContent: React.ReactNode;
};

export function ProfileEditableSection({
  id,
  icon: Icon,
  title,
  count,
  isEditing,
  saving,
  onEdit,
  onCancel,
  onSave,
  children,
  editContent,
}: Props) {
  return (
    <section id={id} className={cn("rounded-3xl glass-panel p-5 md:p-6", id && "scroll-mt-24")}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-primary flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <h2 className="font-medium text-foreground truncate">
            {title}
            {typeof count === "number" && (
              <span className="text-muted-foreground font-normal ml-1.5 text-sm">({count})</span>
            )}
          </h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isEditing ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onCancel}
                disabled={saving}
                className="rounded-full h-8 text-xs"
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onSave}
                disabled={saving}
                className="rounded-full h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "บันทึก"}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onEdit}
              className="rounded-full h-8 text-xs text-muted-foreground hover:text-primary"
            >
              แก้ไข
            </Button>
          )}
        </div>
      </div>
      {isEditing ? editContent : children}
    </section>
  );
}
