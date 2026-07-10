import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
  isEditing: boolean;
  saving?: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  children: React.ReactNode;
  editContent: React.ReactNode;
  /** nested = subsection inside a parent Section card */
  variant?: "panel" | "nested";
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
  variant = "panel",
}: Props) {
  const nested = variant === "nested";
  return (
    <section
      id={id}
      className={cn(
        nested
          ? "border-t border-border/60 pt-5 first:border-0 first:pt-0"
          : cn("rounded-3xl glass-panel p-5 md:p-6", id && "scroll-mt-24"),
      )}
    >
      <div className={cn("flex items-center justify-between gap-3", nested ? "mb-3" : "mb-4")}>
        <div className="flex items-center gap-2 min-w-0">
          {!nested && Icon ? (
            <div className="text-primary flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" />
            </div>
          ) : null}
          {nested ? (
            <h3 className="text-sm font-medium text-foreground truncate">
              {title}
              {typeof count === "number" && (
                <span className="text-muted-foreground font-normal ml-1.5 text-xs">({count})</span>
              )}
            </h3>
          ) : (
            <h2 className="font-medium text-foreground truncate">
              {title}
              {typeof count === "number" && (
                <span className="text-muted-foreground font-normal ml-1.5 text-sm">({count})</span>
              )}
            </h2>
          )}
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
