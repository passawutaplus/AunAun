import { KeyRound, Mail, ShieldCheck } from "lucide-react";

/** How to change password, recover password, or recover withdraw PIN. */
export function AccountSecurityIntro() {
  return (
    <section className="rounded-2xl glass-panel p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">ความปลอดภัยบัญชี</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        รหัสผ่านใช้เข้าแอป PIN ใช้ตอนถอนเงิน — อย่าตั้งให้เหมือนกัน
      </p>
      <ol className="space-y-3 text-sm">
        <li className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-foreground">
            1
          </span>
          <div className="min-w-0">
            <p className="font-medium text-foreground">ขอเปลี่ยนรหัสผ่าน</p>
            <p className="text-xs text-muted-foreground">
              อยู่ในระบบและยังจำรหัสเดิม — กดขอเปลี่ยน แล้วกรอกรหัสปัจจุบันกับรหัสใหม่
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-foreground">
            2
          </span>
          <div className="min-w-0">
            <p className="font-medium text-foreground inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-primary" aria-hidden />
              ลืมรหัสผ่าน
            </p>
            <p className="text-xs text-muted-foreground">
              เข้าแอปไม่ได้ — ขอลิงก์ทางอีเมลจากหน้าเข้าสู่ระบบ แล้วตั้งรหัสใหม่จากลิงก์
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-foreground">
            3
          </span>
          <div className="min-w-0">
            <p className="font-medium text-foreground inline-flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-primary" aria-hidden />
              ลืม PIN ถอนเงิน
            </p>
            <p className="text-xs text-muted-foreground">
              ต้องเข้าสู่ระบบอยู่ แล้วกดลืม PIN ด้านล่าง — ยืนยันรหัสผ่านบัญชี จากนั้นตั้ง PIN ใหม่
            </p>
          </div>
        </li>
      </ol>
    </section>
  );
}
