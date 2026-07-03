import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  userHasEmailPassword,
  verifyEmailConfirmation,
  verifyUserPassword,
} from "@/lib/sensitiveActionAuth";

export interface ReauthRequest {
  reason: string;
  resolve: () => void;
  reject: (err: Error) => void;
}

interface Props {
  request: ReauthRequest | null;
  onClose: () => void;
}

const SensitiveActionReauthDialog = ({ request, onClose }: Props) => {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPassword = userHasEmailPassword(user);
  const open = !!request && !!user;

  useEffect(() => {
    if (!open) {
      setPassword("");
      setEmailConfirm("");
      setError(null);
      setShowPass(false);
    }
  }, [open]);

  const cancel = () => {
    request?.reject(new Error("ยกเลิกการยืนยัน"));
    onClose();
  };

  const confirm = async () => {
    if (!user?.email || !request) return;
    setBusy(true);
    setError(null);
    try {
      if (hasPassword) {
        if (!password) {
          setError("กรุณากรอกรหัสผ่าน");
          return;
        }
        await verifyUserPassword(user.email, password);
      } else {
        if (!emailConfirm.trim()) {
          setError("กรุณากรอกอีเมลเพื่อยืนยัน");
          return;
        }
        verifyEmailConfirmation(user.email, emailConfirm);
      }
      request.resolve();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ยืนยันไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) cancel();
      }}
    >
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="w-5 h-5" />
            <DialogTitle>ยืนยันตัวตนก่อนดำเนินการ</DialogTitle>
          </div>
          <DialogDescription className="text-left pt-1">
            {request?.reason ?? "เพื่อความปลอดภัย กรุณายืนยันว่าคุณเป็นเจ้าของบัญชี"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {hasPassword ? (
            <div className="space-y-1.5">
              <Label htmlFor="reauth-pass">รหัสผ่านบัญชี</Label>
              <div className="relative">
                <Input
                  id="reauth-pass"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  onKeyDown={(e) => e.key === "Enter" && void confirm()}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPass((s) => !s)}
                  aria-label={showPass ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                อีเมล: {user?.email}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="reauth-email">พิมพ์อีเมลบัญชีเพื่อยืนยัน</Label>
              <Input
                id="reauth-email"
                type="email"
                autoComplete="email"
                value={emailConfirm}
                onChange={(e) => setEmailConfirm(e.target.value)}
                placeholder={user?.email ?? "you@example.com"}
                onKeyDown={(e) => e.key === "Enter" && void confirm()}
              />
              <p className="text-[11px] text-muted-foreground">
                บัญชีนี้เข้าสู่ระบบด้วย Google — ใช้การยืนยันอีเมลแทนรหัสผ่าน
              </p>
            </div>
          )}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={cancel} disabled={busy}>
            ยกเลิก
          </Button>
          <Button type="button" onClick={() => void confirm()} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            ยืนยัน
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SensitiveActionReauthDialog;
