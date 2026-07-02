import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { RouteError } from "@/components/RouteError";
import * as React from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { LineHeaderButton } from "@/components/LineContactButton";
import { Loader2, ArrowLeft, Mail, User as UserIcon, Info } from "lucide-react";
import logoUrl from "@/assets/solo-freelancer-logo.webp";
import { AuthBannerSlider } from "@/components/auth/AuthBannerSlider";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { FreelanceFieldSelect } from "@/components/auth/FreelanceFieldSelect";
import { LoginForm } from "@/components/auth/LoginForm";
import { SocialButtons, AuthEmailSeparator } from "@/components/auth/SocialButtons";
import { cn } from "@/lib/utils";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { isEarlyAccessMode } from "@/lib/publicAccess";
import { resolvePostAuthPath } from "@/lib/resolvePostAuthPath";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ — So1o Freelancer" },
      {
        name: "description",
        content: "เข้าสู่ระบบหรือสมัครสมาชิก So1o Freelancer หลังบ้านฟรีแลนซ์ครบวงจร",
      },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "https://www.solofreelancer.com/auth" }],
  }),
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: AuthPage,
});

function AuthPage() {
  const { signIn, signUp, user, isAdmin, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { redirect: rawRedirect } = Route.useSearch();
  const postAuthPath = resolvePostAuthPath({
    rawRedirect,
    isAdmin,
    testerApproved: profile?.tester_approved,
  });
  const [tab, setTab] = React.useState<"login" | "signup">("login");
  const [fadeOut, setFadeOut] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t === "login" || t === "signup") setTab(t);
  }, []);

  React.useEffect(() => {
    if (!loading && user && profile?.is_active === false) {
      toast.error("บัญชีนี้ถูกปิดใช้งานแล้ว หากคิดว่าเป็นความผิดพลาด กรุณาติดต่อแอดมิน");
      signOut();
      return;
    }
    if (!loading && user) {
      setFadeOut(true);
      const dest = resolvePostAuthPath({
        rawRedirect,
        isAdmin,
        testerApproved: profile?.tester_approved,
      });
      setTimeout(() => navigate({ to: dest }), 300);
    }
  }, [user, isAdmin, profile?.tester_approved, profile?.is_active, loading, navigate, signOut, rawRedirect]);

  return (
    <div
      className={cn(
        "relative min-h-screen bg-background overflow-hidden transition-opacity duration-300",
        fadeOut && "opacity-0",
      )}
    >
      <div className="ambient-blobs" aria-hidden="true" />

      <Link
        to="/"
        className="absolute top-4 left-4 z-30 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-background/80 backdrop-blur px-2.5 py-1.5 rounded-full"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> กลับหน้าแรก
      </Link>
      <div className="absolute top-4 right-4 z-30">
        <LineHeaderButton />
      </div>

      <div className="min-h-screen grid lg:grid-cols-2 gap-0">
        {/* LEFT: Banner */}
        <div className="hidden lg:block p-6 xl:p-8">
          <AuthBannerSlider className="h-full min-h-[600px]" />
        </div>

        {/* RIGHT: Form */}
        <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-md">
            <div className="flex flex-col items-center mb-6 lg:hidden">
              <img
                src={logoUrl}
                alt="So1o"
                className="h-12 w-12 rounded-2xl object-cover shadow-elevated"
              />
            </div>
            <div className="hidden lg:flex items-center gap-2 mb-6">
              <img
                src={logoUrl}
                alt="So1o"
                className="h-10 w-10 rounded-xl object-cover shadow-soft"
              />
              <span className="font-semibold tracking-tight">
                So<span className="text-primary">1</span>o Freelancer
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight mb-1">
              {tab === "login" ? "ยินดีต้อนรับกลับมา 👋" : "สร้างบัญชีใหม่"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {tab === "login"
                ? "เข้าสู่ระบบเพื่อจัดการงานฟรีแลนซ์ของคุณ"
                : "เริ่มต้นใช้งานฟรี — ใช้เวลาไม่ถึง 1 นาที"}
            </p>

            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-5">
                <TabsTrigger value="login" data-testid="auth-tab-login">
                  เข้าสู่ระบบ
                </TabsTrigger>
                <TabsTrigger value="signup" data-testid="auth-tab-signup">
                  สมัครสมาชิก
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <SocialButtons redirectTo={postAuthPath} />
                <AuthEmailSeparator />
                <LoginForm onSwitch={() => setTab("signup")} signIn={signIn} />
              </TabsContent>
              <TabsContent value="signup" className="space-y-4">
                <SocialButtons redirectTo={postAuthPath} />
                <AuthEmailSeparator />
                <SignupForm onSwitch={() => setTab("login")} signUp={signUp} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <SiteFooter variant="minimal" />
      <Toaster position="top-center" richColors />
    </div>
  );
}

function SignupForm({
  onSwitch,
  signUp,
}: {
  onSwitch: () => void;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
    freelanceField?: string,
  ) => Promise<{ error: Error | null }>;
}) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [field, setField] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = React.useState(false);
  const [shake, setShake] = React.useState(false);

  const emailValid = !email || /^\S+@\S+\.\S+$/.test(email.trim());
  const passValid = password.length >= 8;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!email || !emailValid || !passValid || !acceptedPolicy) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      if (!acceptedPolicy) toast.error("กรุณายอมรับนโยบายก่อนสมัคร");
      else if (!emailValid) toast.error("กรุณากรอกอีเมลให้ถูกต้อง");
      else if (!passValid) toast.error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    setBusy(true);
    const { error } = await signUp(
      email.trim(),
      password,
      name.trim() || undefined,
      field || undefined,
    );
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยัน");
    }
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-4", shake && "animate-input-shake")}>
      <div className="space-y-1.5">
        <Label htmlFor="su-name" className="text-xs">
          ชื่อ / ชื่อร้าน
        </Label>
        <div className="relative">
          <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="su-name"
            placeholder="Studio Mango"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pl-9 h-11 rounded-lg input-so1o"
            maxLength={80}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="su-email" className="text-xs">
          อีเมล
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="su-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            className={cn(
              "pl-9 h-11 rounded-lg input-so1o",
              touched && !emailValid && email && "border-destructive",
            )}
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="su-pass" className="text-xs">
          รหัสผ่าน (อย่างน้อย 8 ตัว)
        </Label>
        <PasswordInput
          id="su-pass"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched(true)}
          invalid={touched && !!password && !passValid}
          minLength={8}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">คุณทำงานฟรีแลนซ์สายไหน?</Label>
        <FreelanceFieldSelect value={field} onChange={setField} />
        <p className="text-[10px] text-muted-foreground">
          เพื่อให้ AI Mentor ปรับคำแนะนำให้เหมาะกับคุณ
        </p>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 space-y-2">
        {isEarlyAccessMode() && (
          <div className="flex gap-2">
            <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">นโยบาย Beta:</span> สิทธิ์มีจำกัด
              ขออนุญาตระงับสิทธิ์ผู้ที่ไม่มีความเคลื่อนไหวเกิน{" "}
              <span className="font-medium">7 วัน</span>
            </p>
          </div>
        )}
        <label className="flex gap-2 items-start cursor-pointer select-none">
          <Checkbox
            checked={acceptedPolicy}
            onCheckedChange={(v) => setAcceptedPolicy(v === true)}
            className="mt-0.5"
          />
          <span className="text-[11px] leading-relaxed text-foreground">
            ฉันยอมรับ{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              นโยบายความเป็นส่วนตัว (PDPA)
            </a>
            ,{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              ข้อกำหนดการใช้งาน
            </a>{" "}
            และ{" "}
            <a
              href="/cookies"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              นโยบายคุกกี้
            </a>
            {isEarlyAccessMode() ? " และนโยบายระงับสิทธิ์ Beta 7 วัน" : ""}
          </span>
        </label>
      </div>

      <Button
        type="submit"
        disabled={busy || !acceptedPolicy}
        className="w-full h-11 bg-primary hover:bg-primary/90 rounded-lg text-base font-medium"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        สมัครสมาชิก
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        มีบัญชีอยู่แล้ว?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="text-primary hover:underline font-medium"
        >
          เข้าสู่ระบบ
        </button>
      </p>
    </form>
  );
}
