import { Bookmark, Share2 } from "lucide-react";
import SharePopover from "@/components/SharePopover";
import { useAuth } from "@/hooks/useAuth";
import {
  useSavedCreatorServiceIds,
  useToggleCreatorServiceBookmark,
} from "@/hooks/useCreatorServiceBookmarks";
import { requireAuth } from "@/lib/requireAuth";
import { absoluteUrl } from "@/lib/seo";
import { cn } from "@/lib/utils";

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 text-foreground transition-colors hover:bg-muted";

/** Save + share for one package — sits in front of the category chips on the package page. */
export default function ServicePackageActions({ serviceId, title }: { serviceId: string; title: string }) {
  const { user } = useAuth();
  const { data: savedIds } = useSavedCreatorServiceIds();
  const toggleSave = useToggleCreatorServiceBookmark();
  const isSaved = savedIds?.has(serviceId) ?? false;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        disabled={toggleSave.isPending}
        onClick={() => requireAuth(user, () => toggleSave.mutate({ serviceId, saved: isSaved }))}
        aria-pressed={isSaved}
        aria-label={isSaved ? "เอาออกจากที่บันทึก" : "บันทึกแพ็กเกจไว้ดูทีหลัง"}
        title={isSaved ? "เอาออกจากที่บันทึก" : "บันทึกไว้ดูทีหลัง"}
        className={cn(iconBtn, isSaved && "border-primary/50 text-primary")}
      >
        <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} strokeWidth={1.8} aria-hidden />
      </button>
      <SharePopover url={absoluteUrl(`/service/${serviceId}`)} title={title}>
        <button type="button" aria-label="แชร์" title="แชร์" className={iconBtn}>
          <Share2 className="h-4 w-4" aria-hidden />
        </button>
      </SharePopover>
    </div>
  );
}
