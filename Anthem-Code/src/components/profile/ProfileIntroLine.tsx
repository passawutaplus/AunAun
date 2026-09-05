import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateProfile } from "@/hooks/useProfile";
import { highlight } from "@/lib/highlight";
import { PROFILE_INTRO_MAX, profileIntroText } from "@/lib/profileCv";
import { cn } from "@/lib/utils";

type Props = {
  userId?: string;
  bio?: string | null;
  canEdit?: boolean;
  highlightQuery?: string;
  className?: string;
};

export default function ProfileIntroLine({
  userId,
  bio,
  canEdit = false,
  highlightQuery = "",
  className,
}: Props) {
  const intro = profileIntroText(bio);
  const updateMut = useUpdateProfile(canEdit ? userId : undefined);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(intro);

  useEffect(() => {
    if (open) setDraft(profileIntroText(bio));
  }, [open, bio]);

  if (!canEdit && !intro) return null;

  const save = async () => {
    try {
      await updateMut.mutateAsync({ bio: draft.trim().slice(0, PROFILE_INTRO_MAX) });
      toast.success("บันทึกแนะนำตัวแล้ว");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    }
  };

  return (
    <div className={cn("space-y-0.5", className)}>
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          {canEdit ? (
            <p className="text-[11px] font-medium text-muted-foreground">แนะนำตัวโปรไฟล์</p>
          ) : null}
          {intro ? (
            <p className={cn("text-sm text-foreground max-w-xl leading-relaxed", canEdit && "mt-0.5")}>
              {highlightQuery ? highlight(intro, highlightQuery) : intro}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">
              เขียนแนะนำตัวสั้นๆ ให้คนอื่นรู้จักคุณ
            </p>
          )}
        </div>
        {canEdit ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setOpen(true)}
            className="h-8 w-8 shrink-0 rounded-full text-primary hover:text-primary hover:bg-primary/10"
            title="แก้ไขแนะนำตัวโปรไฟล์"
            aria-label="แก้ไขแนะนำตัวโปรไฟล์"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        ) : null}
      </div>

      {canEdit ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>แนะนำตัวโปรไฟล์</DialogTitle>
              <DialogDescription>
                บรรทัดสั้นบนการ์ดโปรไฟล์ — ไม่ใช่ข้อความ About Me ในเอกสาร CV
              </DialogDescription>
            </DialogHeader>
            <label className="sr-only" htmlFor="profile-intro-draft">
              แนะนำตัวโปรไฟล์
            </label>
            <textarea
              id="profile-intro-draft"
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, PROFILE_INTRO_MAX))}
              rows={3}
              maxLength={PROFILE_INTRO_MAX}
              placeholder="เช่น นักออกแบบแพ็กเกจ รับงานแบรนด์และงานพิมพ์"
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-xs placeholder:font-light placeholder:text-muted-foreground/40"
            />
            <p className="text-[11px] text-muted-foreground text-right">
              {draft.length}/{PROFILE_INTRO_MAX}
            </p>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="button" onClick={() => void save()} disabled={updateMut.isPending}>
                {updateMut.isPending ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
