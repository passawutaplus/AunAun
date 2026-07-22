import { useState, useEffect } from "react";
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
import {
  User as UserIcon, Eye, EyeOff, Loader2,
  Sparkles, Info, Bookmark, Share2,
} from "lucide-react";
import { PlusOneMark } from "@/components/brand/PlusOneMark";
import { BackButton } from "@/components/ui/BackButton";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { DemoLoginHint, DemoSignupBlocked } from "@/components/DemoAuthHints";
import { ReferralSignupHint } from "@/components/referral/ReferralSignupHint";
import LegalSignupConsents from "@/components/legal/LegalSignupConsents";
import { recordSignupConsents, markPendingSignupConsent } from "@/lib/legalCompliance";
import {
  BRAND_HERO_SUBTITLE,
  BRAND_NAME,
  BRAND_STORAGE_NO_PERSIST,
  BRAND_TAGLINE,
} from "@/lib/brandConfig";
import SeoHead from "@/components/SeoHead";
import { hasCompletedProfileOnboarding } from "@/hooks/useFeedInterests";

const PasswordInput = ({ id, value, onChange, placeholder, autoComplete, minLength, required, invalid }: {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  invalid?: boolean;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
        className={cn(
          "h-11 rounded-xl pr-10 bg-background/60 backdrop-blur border-border/60 focus-visible:ring-primary/40",
          invalid && "border-destructive focus-visible:ring-destructive/30"
        )}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};

const AuthPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rawRedirect = params.get("redirect");
  const redirect = safeRelativePath(rawRedirect, "/");

  const { user } = useAuth();
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
    <div className={cn(
      "relative min-h-screen overflow-hidden bg-background transition-opacity duration-300",
      fadeOut && "opacity-0"
    )}>
      <SeoHead title="เข้าสู่ระบบ" path="/auth" noindex />
      {/* Ambient blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-30 bg-gradient-brand" />
        <div className="absolute top-1/3 -right-24 w-[380px] h-[380px] rounded-full blur-3xl opacity-25 bg-gradient-brand" />
        <div className="absolute bottom-0 left-1/3 w-[320px] h-[320px] rounded-full blur-3xl opacity-20 bg-gradient-brand" />
      </div>

      <BackButton to="/" label="กลับหน้าแรก" className="absolute top-4 left-4 z-30" />

      <div className="relative min-h-screen grid lg:grid-cols-2">
        {/* LEFT: Brand banner */}
        <div className="hidden lg:flex relative p-8 xl:p-10">
          <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-brand p-10 flex flex-col justify-between text-white shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.25),transparent_40%),radial-gradient(circle_at_80%_90%,rgba(255,255,255,0.18),transparent_50%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" /> {BRAND_NAME} · {BRAND_HERO_SUBTITLE}
              </div>
              <h2 className="mt-8 text-4xl xl:text-5xl font-semibold thai-display whitespace-pre-line">
                {BRAND_TAGLINE.replace(/ /, "\n")}
              </h2>
              <p className="mt-4 text-white/85 text-sm xl:text-base thai-body max-w-md">
                สร้างโปรไฟล์ ลงผลงาน ไถฟีดหาแรงบันดาลใจ คอลแลป และรับงาน ในที่เดียว
              </p>
            </div>

            <div className="relative grid grid-cols-3 gap-3 mt-10">
              {[
                { label: "+1 ผลงาน", plusOne: true },
                { icon: Bookmark, label: "บันทึกไอเดีย" },
                { icon: Share2, label: "แชร์โปรเจกต์" },
              ].map(({ icon: Icon, label, plusOne }) => (
                <div key={label} className="rounded-2xl bg-white/12 backdrop-blur border border-white/15 p-3.5">
                  {plusOne ? (
                    <PlusOneMark className="text-sm mb-2" />
                  ) : Icon ? (
                    <Icon className="w-4 h-4 mb-2" />
                  ) : null}
                  <p className="text-xs font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Form */}
        <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-md">
            <div className="flex justify-center mb-6 lg:hidden">
              <BrandLogo />
            </div>
            <div className="hidden lg:flex mb-8">
              <BrandLogo size="sm" />
            </div>

            <h1 className="text-2xl font-medium tracking-tight mb-1.5 thai-display">
              {tab === "login" ? "ยินดีต้อนรับกลับมา 👋" : "สร้างบัญชีใหม่"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6 thai-body">
              {tab === "login"
                ? "เข้าสู่ระบบเพื่อจัดการพอร์ตโฟลิโอของคุณ — ใช้อีเมลเดียวกับ So1o เพื่อรับสิทธิ์ Pro ร่วมกัน"
                : "เริ่มต้นใช้งานฟรี — ใช้อีเมลเดียวกับ So1o ถ้ามีแพ็ก Pro แล้ว"}
            </p>

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
    </div>
  );
};

const LoginForm = ({ redirect, onSwitch }: { redirect: string; onSwitch: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (!remember) sessionStorage.setItem(BRAND_STORAGE_NO_PERSIST, "1");
      else sessionStorage.removeItem(BRAND_STORAGE_NO_PERSIST);

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setErr(error.message.toLowerCase().includes("invalid")
          ? "อ๊ะ! อีเมลหรือรหัสผ่านไม่ถูกต้อง"
          : error.message);
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
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-xl bg-background/60 backdrop-blur border-border/60 focus-visible:ring-primary/40"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-pass" className="text-xs">รหัสผ่าน</Label>
        <PasswordInput
          id="login-pass"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={!!err}
          required
        />
      </div>

      {err && <p className="text-xs text-destructive">{err}</p>}

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
  const [touched, setTouched] = useState(false);

  const emailValid = !email || /^\S+@\S+\.\S+$/.test(email.trim());
  const passValid = password.length >= 8;
  const confirmValid = password === confirmPassword && confirmPassword.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!emailValid) { toast.error("กรุณากรอกอีเมลให้ถูกต้อง"); return; }
    if (!passValid) { toast.error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"); return; }
    if (!confirmValid) { toast.error("รหัสผ่านยืนยันไม่ตรงกัน"); return; }
    if (!consents.terms || !consents.privacy) {
      toast.error("กรุณายืนยันข้อกำหนดและความเป็นส่วนตัวก่อนสมัคร");
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
          onBlur={() => setTouched(true)}
          className={cn(
            "h-11 rounded-xl bg-background/60 backdrop-blur border-border/60 focus-visible:ring-primary/40",
            touched && email && !emailValid && "border-destructive"
          )}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-pass" className="text-xs">รหัสผ่าน (อย่างน้อย 8 ตัว)</Label>
        <PasswordInput
          id="su-pass"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          invalid={touched && !!password && !passValid}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="su-pass-confirm" className="text-xs">ยืนยันรหัสผ่าน</Label>
        <PasswordInput
          id="su-pass-confirm"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          invalid={touched && !!confirmPassword && !confirmValid}
          required
        />
      </div>

      <LegalSignupConsents value={consents} onChange={setConsents} compact />

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
