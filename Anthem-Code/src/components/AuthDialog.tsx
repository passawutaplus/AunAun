import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, User as UserIcon, Eye, EyeOff, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { SocialButtons, AuthEmailSeparator } from "@/components/auth/SocialButtons";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { DemoLoginHint, DemoSignupBlocked } from "@/components/DemoAuthHints";
import { BRAND_STORAGE_NO_PERSIST } from "@/lib/brandConfig";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import { ReferralSignupHint } from "@/components/referral/ReferralSignupHint";

const PasswordInput = ({ id, value, onChange, placeholder, autoComplete, minLength, required, invalid }: {
  id: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; autoComplete?: string; minLength?: number; required?: boolean; invalid?: boolean;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id} type={show ? "text" : "password"} value={value} onChange={onChange}
        placeholder={placeholder} autoComplete={autoComplete} minLength={minLength} required={required}
        className={cn(
          "h-11 rounded-xl pr-10 bg-background/60 backdrop-blur border-border/60 focus-visible:ring-primary/40",
          invalid && "border-destructive focus-visible:ring-destructive/30"
        )}
      />
      <button type="button" onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};

const AuthDialog = () => {
  const { open, mode, setMode, close, redirectPath } = useAuthDialog();
  const { user } = useAuth();

  // Auto-close on successful login
  useEffect(() => {
    if (user && open) close();
  }, [user, open, close]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden gap-0">
        <div className="p-6 sm:p-7">
          <div className="mb-4">
            <BrandLogo size="sm" />
          </div>

          <DialogTitle className="text-xl font-medium tracking-tight thai-display">
            {mode === "signup" ? "สมัครสมาชิกเพื่อใช้งาน" : "ยินดีต้อนรับกลับมา 👋"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1 thai-body">
            {mode === "signup"
              ? "เข้าร่วมชุมชนฟรีแลนซ์ — ใช้เวลาไม่ถึง 1 นาที"
              : "เข้าสู่ระบบเพื่อใช้ฟีเจอร์ทั้งหมด"}
          </DialogDescription>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "signup" | "login")} className="w-full mt-5">
            <TabsList className="grid w-full grid-cols-2 mb-4 rounded-xl bg-muted/60 p-1 h-11">
              <TabsTrigger value="signup" className="rounded-lg">สมัครสมาชิก</TabsTrigger>
              <TabsTrigger value="login" className="rounded-lg">เข้าสู่ระบบ</TabsTrigger>
            </TabsList>

            <TabsContent value="signup" className="space-y-3.5 mt-0">
              <SignupForm onSwitch={() => setMode("login")} />
            </TabsContent>

            <TabsContent value="login" className="space-y-3.5 mt-0">
              <SocialButtons redirectTo={redirectPath} />
              <AuthEmailSeparator />
              <LoginForm onSwitch={() => setMode("signup")} />
            </TabsContent>
          </Tabs>

          <p className="mt-5 text-center text-[11px] text-muted-foreground">
            ดำเนินการต่อเท่ากับยอมรับ{" "}
            <Link to="/legal/terms" onClick={close} className="hover:text-foreground underline underline-offset-2">ข้อกำหนด</Link>
            {" "}และ{" "}
            <Link to="/legal/privacy" onClick={close} className="hover:text-foreground underline underline-offset-2">นโยบายความเป็นส่วนตัว (PDPA)</Link>
            {" "}·{" "}
            <Link to="/legal/cookies" onClick={close} className="hover:text-foreground underline underline-offset-2">คุกกี้</Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const LoginForm = ({ onSwitch }: { onSwitch: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setErr(error.message.toLowerCase().includes("invalid")
          ? "อ๊ะ! อีเมลหรือรหัสผ่านไม่ถูกต้อง"
          : error.message);
        setShake(true);
        setTimeout(() => setShake(false), 450);
      } else {
        if (!remember) sessionStorage.setItem(BRAND_STORAGE_NO_PERSIST, "1");
        toast.success("เข้าสู่ระบบสำเร็จ");
      }
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className={cn("space-y-3.5", shake && "animate-input-shake")}>
      <DemoLoginHint
        onUseAccount={(demoEmail, demoPassword) => {
          setEmail(demoEmail);
          setPassword(demoPassword);
        }}
      />
      <div className="space-y-1.5">
        <Label htmlFor="ad-li-email" className="text-xs">อีเมล</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input id="ad-li-email" type="email" autoComplete="email" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required
            className="pl-9 h-11 rounded-xl bg-background/60 backdrop-blur border-border/60 focus-visible:ring-primary/40" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ad-li-pass" className="text-xs">รหัสผ่าน</Label>
        <PasswordInput id="ad-li-pass" autoComplete="current-password" placeholder="••••••••"
          value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!err} required />
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
        <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
        จดจำฉันไว้
      </label>
      <Button type="submit" disabled={busy}
        className="w-full h-11 rounded-xl text-base font-medium bg-gradient-brand text-white hover:opacity-95 border-0 shadow-md shadow-primary/20">
        {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} เข้าสู่ระบบ
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        ยังไม่มีบัญชี?{" "}
        <button type="button" onClick={onSwitch} className="text-primary hover:underline font-medium">
          สมัครสมาชิกที่นี่
        </button>
      </p>
    </form>
  );
};

const SignupForm = ({ onSwitch }: { onSwitch: () => void }) => {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    return <DemoSignupBlocked onSwitchToLogin={onSwitch} />;
  }

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const emailValid = !email || /^\S+@\S+\.\S+$/.test(email.trim());
  const passValid = password.length >= 8;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!emailValid) { toast.error("กรุณากรอกอีเมลให้ถูกต้อง"); return; }
    if (!passValid) { toast.error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"); return; }
    if (!accept) { toast.error("กรุณายอมรับข้อกำหนดก่อนสมัคร"); return; }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: {
          emailRedirectTo: window.location.origin + "/",
          data: { display_name: displayName || email.split("@")[0] },
        },
      });
      if (error) toast.error(error.message);
      else toast.success("สมัครสำเร็จ! กรุณาตรวจอีเมลเพื่อยืนยันบัญชีก่อนเข้าใช้งาน");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <ReferralSignupHint />
      <div className="space-y-1.5">
        <Label htmlFor="ad-su-name" className="text-xs">ชื่อที่แสดง</Label>
        <div className="relative">
          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input id="ad-su-name" placeholder="ชื่อของคุณ" value={displayName}
            onChange={(e) => setDisplayName(e.target.value)} maxLength={80}
            className="pl-9 h-11 rounded-xl bg-background/60 backdrop-blur border-border/60 focus-visible:ring-primary/40" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ad-su-email" className="text-xs">อีเมล</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input id="ad-su-email" type="email" autoComplete="email" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched(true)} required
            className={cn(
              "pl-9 h-11 rounded-xl bg-background/60 backdrop-blur border-border/60 focus-visible:ring-primary/40",
              touched && email && !emailValid && "border-destructive"
            )} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ad-su-pass" className="text-xs">รหัสผ่าน (อย่างน้อย 8 ตัว)</Label>
        <PasswordInput id="ad-su-pass" autoComplete="new-password" placeholder="••••••••"
          value={password} onChange={(e) => setPassword(e.target.value)} minLength={8}
          invalid={touched && !!password && !passValid} required />
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 space-y-2">
        <div className="flex gap-2">
          <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">โปรดทราบ:</span> เราจะส่งอีเมลยืนยันให้คุณก่อนเข้าใช้งาน
          </p>
        </div>
        <label className="flex gap-2 items-start cursor-pointer select-none">
          <Checkbox checked={accept} onCheckedChange={(v) => setAccept(v === true)} className="mt-0.5" />
          <span className="text-[11px] leading-relaxed text-foreground">
            ฉันยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว
          </span>
        </label>
      </div>

      <Button type="submit" disabled={busy || !accept}
        className="w-full h-11 rounded-xl text-base font-medium bg-gradient-brand text-white hover:opacity-95 border-0 shadow-md shadow-primary/20">
        {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} สมัครสมาชิก
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        มีบัญชีอยู่แล้ว?{" "}
        <button type="button" onClick={onSwitch} className="text-primary hover:underline font-medium">
          เข้าสู่ระบบ
        </button>
      </p>
    </form>
  );
};

export default AuthDialog;
