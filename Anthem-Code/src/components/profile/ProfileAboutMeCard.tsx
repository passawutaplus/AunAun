import { MapPin, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  bio?: string | null;
  location?: string | null;
  onEdit?: () => void;
  className?: string;
};

/** Compact About me blurb for the portfolio sidebar. */
export default function ProfileAboutMeCard({ bio, location, onEdit, className }: Props) {
  const trimmedBio = bio?.trim() || "";
  const trimmedLocation = location?.trim() || "";

  return (
    <div className={cn("rounded-3xl glass-panel p-4 space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">About me</h2>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-primary hover:bg-primary/10 transition-colors"
            title="แก้ไข About me"
            aria-label="แก้ไข About me"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">แนะนำตัว</p>
        {trimmedBio ? (
          <p className="text-sm text-foreground leading-relaxed line-clamp-4 whitespace-pre-wrap">
            {trimmedBio}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">ยังไม่ได้แนะนำตัว</p>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">ที่อยู่</p>
        {trimmedLocation ? (
          <p className="text-sm text-foreground inline-flex items-start gap-1.5 leading-snug">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <span>{trimmedLocation}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">ยังไม่ได้ระบุที่อยู่</p>
        )}
      </div>
    </div>
  );
}
