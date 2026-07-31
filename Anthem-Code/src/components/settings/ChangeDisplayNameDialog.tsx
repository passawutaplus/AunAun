import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
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
import { DISPLAY_NAME_COOLDOWN_DAYS } from "@/lib/displayNamePolicy";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentDisplayName: string;
  cooldownUntil: Date | null;
  onChanged?: (displayName: string) => void;
};

const COOLDOWN_WARN = `เปลี่ยนได้ทุก ${DISPLAY_NAME_COOLDOWN_DAYS} วัน`;

export function ChangeDisplayNameDialog({
  open,
  onOpenChange,
  userId,
  currentDisplayName,
  cooldownUntil,
  onChanged,
}: Props) {
  const saved = currentDisplayName.trim();
  const [draft, setDraft] = useState(saved);
  const updateMut = useUpdateProfile(userId);
  const onCooldown = !!cooldownUntil && cooldownUntil.getTime() > Date.now();

  useEffect(() => {
    if (open) setDraft(saved);
  }, [open, saved]);

  const next = draft.trim();
  const unchanged = next === saved;
  const tooShort = next.length === 0;
  const tooLong = next.length > 60;

  const canSubmit = useMemo(() => {
    if (onCooldown || unchanged || updateMut.isPending) return false;
    if (tooShort || tooLong) return false;
    return true;
  }, [onCooldown, unchanged, updateMut.isPending, tooShort, tooLong]);

  const submit = async () => {
    if (!canSubmit) return;
    try {
      await updateMut.mutateAsync({ displayName: next });
      toast.success("เปลี่ยนชื่อที่แสดงแล้ว", {
        description: next,
      });
      onChanged?.(next);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เปลี่ยนชื่อที่แสดงไม่สำเร็จ");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (updateMut.isPending) return;
        onOpenChange(v);
      }}
    >
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ขอเปลี่ยนชื่อที่แสดง</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground pt-1">
              ตอนนี้ใช้{" "}
              <span className="font-medium text-foreground">{saved || "—"}</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        {onCooldown && cooldownUntil ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-foreground">
            ยังเปลี่ยนไม่ได้ — ครั้งถัดไปได้หลัง{" "}
            {cooldownUntil.toLocaleDateString("th-TH", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor="change-display-name-input" className="text-sm font-medium text-foreground">
              ชื่อที่แสดงใหม่
            </label>
            <div
              className={cn(
                "flex items-center rounded-xl bg-secondary border border-border focus-within:ring-2 focus-within:ring-primary/40",
                (tooShort || tooLong) && next.length > 0 && "border-destructive focus-within:ring-destructive/40",
              )}
            >
              <input
                id="change-display-name-input"
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
                maxLength={60}
                placeholder="ชื่อที่คนอื่นเห็น"
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-xs placeholder:font-light placeholder:text-muted-foreground/40 focus:outline-none"
              />
            </div>
            {tooLong ? (
              <p className="text-xs text-destructive">ไม่เกิน 60 ตัวอักษร</p>
            ) : tooShort && draft.length > 0 ? (
              <p className="text-xs text-destructive">กรุณากรอกชื่อ</p>
            ) : (
              <p className="text-xs text-muted-foreground">กดยืนยันแล้วระบบจะเปลี่ยนให้ทันที</p>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-destructive" aria-hidden />
              <span>{COOLDOWN_WARN}</span>
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={updateMut.isPending}
            onClick={() => onOpenChange(false)}
          >
            ยกเลิก
          </Button>
          {!onCooldown ? (
            <Button
              type="button"
              className="rounded-full"
              disabled={!canSubmit}
              onClick={() => void submit()}
            >
              {updateMut.isPending ? "กำลังเปลี่ยน..." : "ยืนยันเปลี่ยน"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
