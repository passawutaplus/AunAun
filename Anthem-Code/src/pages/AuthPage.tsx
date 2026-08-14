import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedModeTransition } from "@/components/feed/FeedModeTransition";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { SocialButtons, AuthEmailSeparator } from "@/components/auth/SocialButtons";
import {
  buildEmailConfirmUrl,
  safeRelativePath,
  shouldStripRedirectParam,
} from "@/lib/oauthRedirect";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { User as UserIcon, Loader2 } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { BrandLogo } from "@/components/brand/BrandLogo";
import AuthWorkWall from "@/components/auth/AuthWorkWall";
import HeroGridSpotlight from "@/components/feed/HeroGridSpotlight";
import { DemoLoginHint, DemoSignupBlocked } from "@/components/DemoAuthHints";
import { ReferralSignupHint } from "@/components/referral/ReferralSignupHint";
import LegalSignupConsents from "@/components/legal/LegalSignupConsents";
import { recordSignupConsents, markPendingSignupConsent } from "@/lib/legalCompliance";
import {
  BRAND_STORAGE_NO_PERSIST,
} from "@/lib/brandConfig";
import SeoHead from "@/components/SeoHead";
import { hasCompletedProfileOnboarding } from "@/hooks/useFeedInterests";
import { PasswordField } from "@/components/ui/PasswordField";
import { FieldError } from "@/components/ui/FieldError";
import {
  saveLoginEmailPrefill,
  loginEmailFormatError,
  loginPasswordEmptyError,
} from "@/lib/loginEmailPrefill";

const AuthPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rawRedirect = params.get("redirect");
  const redirect = safeRelativePath(rawRedirect, "/");

  const { user } = useAuth();
  const authHeroRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!shouldStripRedirectParam(rawRedirect)) return;
    const next = new URLSearchParams(params);
    next.delete("redirect");
    const q = next.toString();
    navigate(q ? `/auth?${q}` : "/auth", { replace: true });
  }, [rawRedirect, params, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setFadeOut(true);
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "feed_interests, feed_interests_at, username, opportunity_types, preferred_categories, skills, profile_onboarding_at",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const needsInterestSurvey = !hasCompletedProfileOnboarding(data);
      const dest = needsInterestSurvey ? "/" : redirect;
      window.setTimeout(() => navigate(dest, { replace: true }), 250);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, navigate, redirect]);

  return (
    <div
      ref={authHeroRef}
      className={cn(
      "relative min-h-screen overflow-hidden bg-background transition-opacity duration-300",
      fadeOut && "opacity-0"
    )}>
      <SeoHead title="เข้าสู่ระบบ" path="/auth" noindex />
      <main id="main-content" className="contents">
      <HeroGridSpotlight trackRef={authHeroRef} className="z-0" />

      <BackButton to="/" label="กลับหน้าแรก" className="absolute top-4 left-4 z-30" />

      <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
        {/* LEFT: Full-bleed work wall. Hidden on mobile. */}
        <div className="relative hidden min-h-screen overflow-hidden lg:block">
          <AuthWorkWall className="z-[1] pointer-events-none" />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-20 bg-gradient-to-l from-background to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-16 bg-gradient-to-b from-background/50 to-transparent"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-background from-[18%] via-background/75 via-[55%] to-transparent px-8 pb-8 pt-24">
            <p className="text-left text-3xl font-bold tracking-tight leading-[0.95] text-foreground xl:text-4xl">
              <span className="block">1 Profile to</span>
              <span className="block text-primary">100+ Opportunity</span>
            </p>
            <p className="mt-1.5 max-w-md text-sm font-normal leading-relaxed text-muted-foreground xl:text-base">
              ให้ผลงานพาคุณไปสู่โอกาสใหม่ๆ
            </p>
          </div>
        </div>

        {/* RIGHT: Form */}
        <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-md pb-24">
            <div className="flex justify-center mb-6 lg:hidden">
              <BrandLogo />
            </div>
            <div className="hidden lg:flex mb-8">
              <BrandLogo size="sm" />
            </div>

            <h1 className="text-2xl font-medium tracking-tight mb-6 thai-display">
              {tab === "login" ? "ยินดีต้อนรับกลับมา 👋" : "สร้างบัญชีใหม่"}
            </h1>
            {tab === "signup" ? (
              <p className="text-sm text-muted-foreground -mt-4 mb-6 thai-body">
                เริ่มต้นใช้งานฟรี — ใช้อีเมลเดียวกับ So1o ถ้ามีแพ็ก Pro แล้ว
              </p>
            ) : null}

            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-5 rounded-xl bg-muted/60 p-1 h-11">
                <TabsTrigger value="login" className="rounded-lg">เข้าสู่ระบบ</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg">สมัครสมาชิก</TabsTrigger>
              </TabsList>

              <FeedModeTransition modeKey={tab}>
                {tab === "login" ? (
                  <div className="space-y-4">
                    <SocialButtons redirectTo={redirect} />
                    <AuthEmailSeparator />
                    <LoginForm redirect={redirect} onSwitch={() => setTab("signup")} />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Demo: no Google on signup — email signup blocked; avoid accidental OAuth account create */}
                    {import.meta.env.VITE_DEMO_MODE === "true" ? null : (
                      <>
                        <SocialButtons redirectTo={redirect} />
                        <AuthEmailSeparator />
                      </>
                    )}
                    <SignupForm onSwitch={() => setTab("login")} />
                  </div>
                )}
              </FeedModeTransition>
            </Tabs>

            <p className="mt-8 text-center text-[11px] text-muted-foreground">
              ดำเนินการต่อเท่ากับยอมรับ{" "}
              <Link to="/legal/terms" className="hover:text-foreground underline underline-offset-2">ข้อกำหนด</Link>
              {" "}และ{" "}
              <Link to="/legal/privacy" className="hover:text-foreground underline underline-offset-2">นโยบายความเป็นส่วนตัว</Link>
            </p>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
};

const LoginForm = ({ redirect, onSwitch }: { redirect: string; onSwitch: () => void }) => {
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

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
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
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={cn("space-y-4", shake && "animate-input-shake")}>
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
        <Label htmlFor="login-email" className="text-xs">อีเมล</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            saveLoginEmailPrefill(e.target.value);
          }}
          onBlur={() => setEmailError(loginEmailFormatError(email))}
          onFocus={() => setEmailError(null)}
          aria-invalid={!!emailError || undefined}
          aria-describedby={emailError ? "login-email-error" : undefined}
          className={cn(
            "h-11 rounded-xl bg-background/60 backdrop-blur border-border/60 focus-visible:ring-primary/40",
            emailError && "border-destructive",
          )}
          required
        />
        <FieldError id="login-email-error" message={emailError} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-pass" className="text-xs">รหัสผ่าน</Label>
        <PasswordField
          id="login-pass"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setPasswordError(loginPasswordEmptyError(password))}
          onFocus={() => setPasswordError(null)}
          invalid={!!passwordError}
          error={passwordError}
          required
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
          <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
          จดจำฉันไว้
        </label>
        <Link to="/auth/forgot" className="text-xs text-primary hover:underline">
          ลืมรหัสผ่าน?
        </Link>
      </div>

      <Button
        type="submit"
        disabled={busy}
        className="w-full h-11 rounded-xl text-base font-semibold bg-gradient-brand text-white hover:opacity-95 border-0 shadow-md shadow-primary/20"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        เข้าสู่ระบบ
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
        email: email.trim(),
        password,
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
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <ReferralSignupHint />
      <div className="space-y-1.5">
        <Label htmlFor="su-name" className="text-xs">ชื่อที่แสดง</Label>
        <div className="relative">
          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="su-name"
            placeholder="ภัสวุฒิ"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="pl-9 h-11 rounded-xl bg-background/60 backdrop-blur border-border/60 focus-visible:ring-primary/40"
            maxLength={80}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-email" className="text-xs">อีเมล</Label>
        <Input
          id="su-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setEmailTouched(true)}
          onFocus={() => setEmailTouched(false)}
          aria-invalid={!!emailError || undefined}
          aria-describedby={emailError ? "su-email-error" : undefined}
          className={cn(
            "h-11 rounded-xl bg-background/60 backdrop-blur border-border/60 focus-visible:ring-primary/40",
            emailError && "border-destructive"
          )}
          required
        />
        <FieldError id="su-email-error" message={emailError} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-pass" className="text-xs">รหัสผ่าน (อย่างน้อย 8 ตัว)</Label>
        <PasswordField
          id="su-pass"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setPassTouched(true)}
          onFocus={() => setPassTouched(false)}
          showStrength
          invalid={!!passError}
          error={passError}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-pass-confirm" className="text-xs">ยืนยันรหัสผ่าน</Label>
        <PasswordField
          id="su-pass-confirm"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={() => setConfirmTouched(true)}
          onFocus={() => setConfirmTouched(false)}
          error={confirmError}
          required
        />
      </div>

      <LegalSignupConsents value={consents} onChange={(v) => { setConsents(v); setConsentError(null); }} compact />
      <FieldError message={consentError} />

      <Button
        type="submit"
        disabled={busy || !consents.terms || !consents.privacy}
        className="w-full h-11 rounded-xl text-base font-semibold bg-gradient-brand text-white hover:opacity-95 border-0 shadow-md shadow-primary/20"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        สมัครสมาชิก
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

export default AuthPage;
