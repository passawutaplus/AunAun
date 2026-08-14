import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { User as UserIcon, Loader2 } from "lucide-react";
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
import LegalSignupConsents from "@/components/legal/LegalSignupConsents";
import { recordSignupConsents, markPendingSignupConsent } from "@/lib/legalCompliance";
import { isAuthRoute } from "@/lib/onboardingRoutes";
import { hasCompletedProfileOnboarding } from "@/hooks/useFeedInterests";
import { buildEmailConfirmUrl } from "@/lib/oauthRedirect";
import { isDemoMode } from "@/lib/demoMode";
import { PasswordField } from "@/components/ui/PasswordField";
import { FieldError } from "@/components/ui/FieldError";
import { ResponsiveOverlay } from "@/components/ui/ResponsiveOverlay";
import {
  saveLoginEmailPrefill,
  loginEmailFormatError,
  loginPasswordEmptyError,
} from "@/lib/loginEmailPrefill";

const AuthDialog = () => {
  const { open, mode, setMode, close, redirectPath } = useAuthDialog();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Auto-close on successful login — send first-time users home for interest survey
  useEffect(() => {
    if (!user || !open) return;
    const dest = redirectPath || "/";
    close();
    void (async () => {
      await qc.invalidateQueries({ queryKey: ["profile", user.id, "feed-interests"] });
      const { data } = await supabase
        .from("profiles")
        .select(
          "feed_interests, feed_interests_at, username, opportunity_types, preferred_categories, skills, profile_onboarding_at",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      const needsInterestSurvey = !hasCompletedProfileOnboarding(data);
      if (needsInterestSurvey) {
        navigate("/", { replace: true });
        return;
      }
      if (dest !== "/" && !isAuthRoute(dest.split("?")[0] ?? dest)) {
        navigate(dest, { replace: true });
      }
    })();
  }, [user, open, close, redirectPath, navigate, qc]);

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(v) => !v && close()}
      accessibleTitle={mode === "signup" ? "สมัครสมาชิกเพื่อใช้งาน" : "ยินดีต้อนรับกลับมา"}
      desktopClassName="sm:max-w-md"
      bodyClassName="px-6 sm:px-7 pt-6 pb-6"
      showGrabHandle
    >
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
          {isDemoMode() ? null : (
            <>
              <SocialButtons redirectTo={redirectPath} />
              <AuthEmailSeparator />
            </>
          )}
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
    </ResponsiveOverlay>
  );
};

const LoginForm = ({ onSwitch }: { onSwitch: () => void }) => {
  const navigate = useNavigate();
  const { close } = useAuthDialog();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextEmailErr = loginEmailFormatError(email);
    const nextPassErr = loginPasswordEmptyError(password);
    setEmailError(nextEmailErr);
    setPasswordError(nextPassErr);
    if (nextEmailErr || nextPassErr) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    setBusy(true);
    try {
      if (!remember) sessionStorage.setItem(BRAND_STORAGE_NO_PERSIST, "1");
      else sessionStorage.removeItem(BRAND_STORAGE_NO_PERSIST);
      saveLoginEmailPrefill(email);

      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        const invalid = error.message.toLowerCase().includes("invalid");
        setEmailError(null);
        setPasswordError(invalid ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : error.message);
        setShake(true);
        setTimeout(() => setShake(false), 450);
      } else {
        if (!remember) sessionStorage.setItem(BRAND_STORAGE_NO_PERSIST, "1");
        else sessionStorage.removeItem(BRAND_STORAGE_NO_PERSIST);
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
          setEmailError(null);
          setPasswordError(null);
          saveLoginEmailPrefill(demoEmail);
        }}
      />
      <div className="space-y-1.5">
        <Label htmlFor="ad-li-email" className="text-xs">อีเมล</Label>
        <Input id="ad-li-email" type="email" autoComplete="email" placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            saveLoginEmailPrefill(e.target.value);
          }}
          onBlur={() => setEmailError(loginEmailFormatError(email))}
          onFocus={() => setEmailError(null)}
          aria-invalid={!!emailError || undefined}
          aria-describedby={emailError ? "ad-li-email-error" : undefined}
          className={cn(
            "h-11 rounded-xl bg-background/60 backdrop-blur border-border/60 focus-visible:ring-primary/40",
            emailError && "border-destructive",
          )}
          required />
        <FieldError id="ad-li-email-error" message={emailError} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ad-li-pass" className="text-xs">รหัสผ่าน</Label>
        <PasswordField id="ad-li-pass" autoComplete="current-password" placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setPasswordError(loginPasswordEmptyError(password))}
          onFocus={() => setPasswordError(null)}
          invalid={!!passwordError} error={passwordError} required />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
          <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
          จดจำฉันไว้
        </label>
        <button
          type="button"
          onClick={() => { close(); navigate("/auth/forgot"); }}
          className="text-xs text-primary hover:underline"
        >
          ลืมรหัสผ่าน?
        </button>
      </div>
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consents, setConsents] = useState({ terms: false, privacy: false });
  const [busy, setBusy] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passTouched, setPassTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  const emailValid = !email || /^\S+@\S+\.\S+$/.test(email.trim());
  const passValid = password.length >= 8;
  const confirmValid = password === confirmPassword && confirmPassword.length > 0;
  const emailError = emailTouched && email && !emailValid ? "กรุณากรอกอีเมลให้ถูกต้อง" : null;
  const passError = passTouched && password && !passValid ? "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" : null;
  const confirmError =
    confirmTouched && confirmPassword && !confirmValid ? "รหัสผ่านยืนยันไม่ตรงกัน" : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setPassTouched(true);
    setConfirmTouched(true);
    setConsentError(null);
    if (!emailValid || !passValid || !confirmValid) return;
    if (!consents.terms || !consents.privacy) {
      setConsentError("กรุณายืนยันข้อกำหนดและความเป็นส่วนตัวก่อนสมัคร");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: {
          emailRedirectTo: buildEmailConfirmUrl(),
          data: { display_name: displayName || email.split("@")[0] },
        },
      });
      if (error) toast.error(error.message);
      else {
        markPendingSignupConsent();
        await recordSignupConsents();
        toast.success("สมัครสำเร็จ! กรุณาตรวจอีเมลเพื่อยืนยันบัญชีก่อนเข้าใช้งาน");
      }
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
        <Input id="ad-su-email" type="email" autoComplete="email" placeholder="you@example.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setEmailTouched(true)} onFocus={() => setEmailTouched(false)} required
          aria-invalid={!!emailError || undefined}
          aria-describedby={emailError ? "ad-su-email-error" : undefined}
          className={cn(
            "h-11 rounded-xl bg-background/60 backdrop-blur border-border/60 focus-visible:ring-primary/40",
            emailError && "border-destructive"
          )} />
        <FieldError id="ad-su-email-error" message={emailError} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ad-su-pass" className="text-xs">รหัสผ่าน (อย่างน้อย 8 ตัว)</Label>
        <PasswordField id="ad-su-pass" autoComplete="new-password" placeholder="••••••••"
          value={password} onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setPassTouched(true)} onFocus={() => setPassTouched(false)}
          minLength={8} showStrength invalid={!!passError} error={passError} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ad-su-pass-confirm" className="text-xs">ยืนยันรหัสผ่าน</Label>
        <PasswordField id="ad-su-pass-confirm" autoComplete="new-password" placeholder="••••••••"
          value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={() => setConfirmTouched(true)} onFocus={() => setConfirmTouched(false)}
          invalid={!!confirmError} error={confirmError} required />
      </div>

      <LegalSignupConsents value={consents} onChange={(v) => { setConsents(v); setConsentError(null); }} compact />
      <FieldError message={consentError} />

      <Button type="submit" disabled={busy || !consents.terms || !consents.privacy}
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
