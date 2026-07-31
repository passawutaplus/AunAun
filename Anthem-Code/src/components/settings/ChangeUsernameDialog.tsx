import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUpdateProfile } from "@/hooks/useProfile";
import {
  checkUsernameAvailability,
  normalizeUsername,
} from "@/hooks/useUsernameAvailability";
import { USERNAME_COOLDOWN_DAYS } from "@/lib/usernamePolicy";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentUsername: string;
  cooldownUntil: Date | null;
  onChanged?: (username: string) => void;
};

const COOLDOWN_WARN = `เปลี่ยนได้ทุก ${USERNAME_COOLDOWN_DAYS} วัน — ลิงก์โปรไฟล์เก่าที่แชร์ไว้จะเปิดไม่ได้`;

function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-3.5 py-3">
      <p className="text-xs text-foreground flex items-start gap-2 leading-relaxed">
        <AlertTriangle className="w-4 h-4 shrink-0 text-destructive mt-0.5" aria-hidden />
        <span>{children}</span>
      </p>
    </div>
  );
}

export function ChangeUsernameDialog({
  open,
  onOpenChange,
  userId,
  currentUsername,
  cooldownUntil,
  onChanged,
}: Props) {
  const saved = normalizeUsername(currentUsername);
  const [draft, setDraft] = useState(saved);
  const [verifyStatus, setVerifyStatus] = useState<
    | null
    | { kind: "checking" }
    | { kind: "ok"; username: string }
    | { kind: "error"; username: string; message: string }
  >(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const updateMut = useUpdateProfile(userId);
  const onCooldown = !!cooldownUntil && cooldownUntil.getTime() > Date.now();

  useEffect(() => {
    if (open) {
      setDraft(saved);
      setVerifyStatus(null);
      setConfirmOpen(false);
    }
  }, [open, saved]);

  const next = normalizeUsername(draft);
  const unchanged = next === saved;
  const verifiedOk = verifyStatus?.kind === "ok" && verifyStatus.username === next;

  const canOpenConfirm = useMemo(() => {
    if (onCooldown || unchanged || updateMut.isPending) return false;
    if (next.length < 2) return false;
    return verifiedOk;
  }, [onCooldown, unchanged, updateMut.isPending, next, verifiedOk]);

  const runVerify = async () => {
    const candidate = normalizeUsername(draft);
    if (candidate === saved) {
      setVerifyStatus({ kind: "error", username: candidate, message: "ชื่อผู้ใช้เหมือนเดิม" });
      return;
    }
    setVerifyStatus({ kind: "checking" });
    const result = await checkUsernameAvailability(candidate, userId);
    if (!result.ok) {
      setVerifyStatus({ kind: "error", username: result.username, message: result.message });
      return;
    }
    setVerifyStatus({ kind: "ok", username: result.username });
  };

  const submit = async () => {
    if (!canOpenConfirm) return;
    try {
      await updateMut.mutateAsync({ username: next });
      toast.success("เปลี่ยนชื่อผู้ใช้แล้ว", {
        description: `ลิงก์โปรไฟล์ใหม่: /@${next}`,
      });
      onChanged?.(next);
      setConfirmOpen(false);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เปลี่ยนชื่อผู้ใช้ไม่สำเร็จ");
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (updateMut.isPending) return;
          onOpenChange(v);
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ขอเปลี่ยนชื่อผู้ใช้</DialogTitle>
            <DialogDescription asChild>
              <div className="text-sm text-muted-foreground pt-1">
                ตอนนี้ใช้{" "}
                <span className="font-medium text-foreground">@{saved || "—"}</span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <WarningBox>{COOLDOWN_WARN}</WarningBox>

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
              <label htmlFor="change-username-input" className="text-sm font-medium text-foreground">
                ชื่อผู้ใช้ใหม่
              </label>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex flex-1 items-center rounded-xl bg-secondary border border-border focus-within:ring-2 focus-within:ring-primary/40",
                    verifyStatus?.kind === "error" &&
                      verifyStatus.username === next &&
                      "border-destructive focus-within:ring-destructive/40",
                    verifiedOk && "border-emerald-500/50 focus-within:ring-emerald-500/30",
                  )}
                >
                  <span className="pl-3 text-muted-foreground text-sm">@</span>
                  <input
                    id="change-username-input"
                    type="text"
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value.toLowerCase());
                      setVerifyStatus(null);
                    }}
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    autoFocus
                    placeholder="username"
                    className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-xs placeholder:font-light placeholder:text-muted-foreground/40 focus:outline-none"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full shrink-0"
                  disabled={
                    unchanged ||
                    next.length < 2 ||
                    verifyStatus?.kind === "checking" ||
                    onCooldown
                  }
                  onClick={() => void runVerify()}
                >
                  {verifyStatus?.kind === "checking" ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> เช็ค…
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>

              {verifyStatus?.kind === "ok" && verifyStatus.username === next ? (
                <p className="text-xs flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> ชื่อผู้ใช้นี้ใช้ได้
                </p>
              ) : null}
              {verifyStatus?.kind === "error" && verifyStatus.username === next ? (
                <p className="text-xs text-destructive">{verifyStatus.message}</p>
              ) : null}
              {!unchanged && next.length >= 2 && !verifyStatus ? (
                <p className="text-xs text-muted-foreground">กด Verify เพื่อเช็คว่าชื่อซ้ำกับคนอื่นหรือไม่</p>
              ) : null}

              {verifiedOk ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                  <p className="text-xs text-foreground flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <span>
                      ลิงก์จะเปลี่ยนจาก{" "}
                      <span className="font-medium">/@{saved}</span> เป็น{" "}
                      <span className="font-medium">/@{next}</span>
                    </span>
                  </p>
                </div>
              ) : null}
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
                disabled={!canOpenConfirm}
                onClick={() => setConfirmOpen(true)}
              >
                ยืนยันเปลี่ยน
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>แน่ใจว่าจะเปลี่ยนชื่อผู้ใช้?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  ระบบจะเปลี่ยนจาก{" "}
                  <span className="font-medium text-foreground">/@{saved}</span> เป็น{" "}
                  <span className="font-medium text-foreground">/@{next}</span>{" "}
                  ทันทีหลังยืนยัน
                </p>
                <WarningBox>{COOLDOWN_WARN}</WarningBox>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMut.isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              disabled={updateMut.isPending || !canOpenConfirm}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {updateMut.isPending ? "กำลังเปลี่ยน..." : "แน่ใจ เปลี่ยนเลย"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
