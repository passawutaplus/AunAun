import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, User, Save, LogOut, Shield, Menu } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { profileSchema } from "@/lib/validators";
import ProfileAddressEditor from "@/components/profile/ProfileAddressEditor";
import {
  EMPTY_PROFILE_ADDRESS,
  formatProfileAddressShort,
  parseProfileAddress,
  profileAddressToJson,
} from "@/lib/profileAddress";
import { ABOUT_ME_EDIT_HREF, isAboutMeSettingsHash } from "@/lib/settingsNav";
import { z } from "zod";
import PageLoader from "@/components/ui/PageLoader";
import { HttpErrorPage } from "@/components/HttpErrorPage";
import { signOutApp } from "@/lib/signOutApp";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { SettingsPreferencesSection } from "@/components/settings/SettingsPreferencesSection";
import { EmailNotificationSection } from "@/components/settings/EmailNotificationSection";
import { InAppNotificationSection } from "@/components/settings/InAppNotificationSection";
import { LineNotificationSection } from "@/components/settings/LineNotificationSection";
import { ChatSettingsSection } from "@/components/settings/ChatSettingsSection";
import { ProfileVisibilitySection } from "@/components/settings/ProfileVisibilitySection";
import BillingSettingsPanel from "@/components/settings/BillingSettingsPanel";
import { PrivacySecuritySection } from "@/components/settings/PrivacySecuritySection";
import { ChangePasswordSection } from "@/components/settings/ChangePasswordSection";
import { AccountSecurityIntro } from "@/components/settings/AccountSecurityIntro";
import { WithdrawPinSettingsSection } from "@/components/settings/WithdrawPinSettingsSection";
import SettingsSideNav, { useSettingsPanelState } from "@/components/settings/SettingsSideNav";
import { ChangeUsernameDialog } from "@/components/settings/ChangeUsernameDialog";
import { ChangeDisplayNameDialog } from "@/components/settings/ChangeDisplayNameDialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { normalizeUsername } from "@/hooks/useUsernameAvailability";
import { USERNAME_COOLDOWN_MS } from "@/lib/usernamePolicy";
import { DISPLAY_NAME_COOLDOWN_MS } from "@/lib/displayNamePolicy";

const settingsFormSchema = profileSchema.pick({
  displayName: true,
  username: true,
  location: true,
  profileAddress: true,
  notifyEmail: true,
  notifyHire: true,
  notifyCollab: true,
  notifyJobMatch: true,
});

type SettingsFormInput = z.infer<typeof settingsFormSchema>;

const empty: SettingsFormInput = {
  displayName: "",
  username: "",
  location: "",
  profileAddress: { ...EMPTY_PROFILE_ADDRESS },
  notifyEmail: true,
  notifyHire: true,
  notifyCollab: true,
  notifyJobMatch: true,
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading, isError } = useProfile(user?.id);
  const updateMut = useUpdateProfile(user?.id);
  const { data: isAdmin } = useIsAdmin();
  const { panel, setPanel } = useSettingsPanelState(!!isAdmin);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("recover") === "pin" && panel !== "account") {
      setPanel("account");
    }
  }, [panel, setPanel]);

  useEffect(() => {
    const redirectAbout = () => {
      if (isAboutMeSettingsHash(window.location.hash)) {
        navigate(ABOUT_ME_EDIT_HREF, { replace: true });
      }
    };
    redirectAbout();
    window.addEventListener("hashchange", redirectAbout);
    return () => window.removeEventListener("hashchange", redirectAbout);
  }, [navigate]);

  const handleSignOut = async () => {
    await signOutApp(qc);
    toast.success("ออกจากระบบแล้ว");
    navigate("/");
  };

  const [form, setForm] = useState<SettingsFormInput>(empty);
  const [changeUsernameOpen, setChangeUsernameOpen] = useState(false);
  const [changeDisplayNameOpen, setChangeDisplayNameOpen] = useState(false);
  const usernameChangedAt = (profile as { username_changed_at?: string | null } | null)
    ?.username_changed_at;
  const usernameCooldownUntil = useMemo(() => {
    if (!usernameChangedAt) return null;
    const until = new Date(usernameChangedAt).getTime() + USERNAME_COOLDOWN_MS;
    return until > Date.now() ? new Date(until) : null;
  }, [usernameChangedAt]);
  const displayNameChangedAt = (profile as { display_name_changed_at?: string | null } | null)
    ?.display_name_changed_at;
  const displayNameCooldownUntil = useMemo(() => {
    if (!displayNameChangedAt) return null;
    const until = new Date(displayNameChangedAt).getTime() + DISPLAY_NAME_COOLDOWN_MS;
    return until > Date.now() ? new Date(until) : null;
  }, [displayNameChangedAt]);
  const normalizedUsername = normalizeUsername(form.username);

  useEffect(() => {
    if (!authLoading && !user) {
      const dest = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      navigate(`/auth?redirect=${encodeURIComponent(dest)}`);
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setForm({
        displayName: profile.display_name ?? "",
        username: profile.username ?? "",
        location: profile.location ?? "",
        profileAddress: parseProfileAddress(
          (profile as { profile_address?: unknown }).profile_address,
        ),
        notifyEmail: profile.notify_email ?? true,
        notifyHire: profile.notify_hire ?? true,
        notifyCollab: (profile as { notify_collab?: boolean }).notify_collab ?? true,
        notifyJobMatch: (profile as { notify_job_match?: boolean }).notify_job_match ?? true,
      });
    }
  }, [profile]);

  const update = <K extends keyof SettingsFormInput>(k: K, v: SettingsFormInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const persistProfile = async (payload: SettingsFormInput) => {
    try {
      // ชื่อที่แสดง / username เปลี่ยนผ่าน dialog เท่านั้น (มี cooldown)
      // ไม่ส่งฟิลด์ About Me — แก้ที่แท็บ About Me บนโปรไฟล์
      const { displayName: _dn, username: _un, ...rest } = payload;
      await updateMut.mutateAsync(rest);
      toast.success("บันทึกสำเร็จ", {
        description: "ข้อมูลบัญชีของคุณถูกอัปเดตแล้ว",
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = profileAddressToJson(form.profileAddress);
    const payload = {
      ...form,
      profileAddress: address,
      location: formatProfileAddressShort(address) || form.location.trim(),
    };
    const parsed = settingsFormSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }
    await persistProfile(parsed.data);
  };

  if (authLoading || isLoading) {
    return <PageLoader />;
  }

  if (isError) {
    return <HttpErrorPage kind="500" homeTo="/portfolio" />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-app-ambient flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-muted-foreground">ยังโหลดโปรไฟล์ไม่ได้ — ลองรีเฟรชอีกครั้ง</p>
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          รีเฟรช
        </Button>
        <Button type="button" variant="ghost" onClick={() => navigate("/portfolio")}>
          กลับพอร์ตโฟลิโอ
        </Button>
      </div>
    );
  }

  const showProfileSave = panel === "profile" || panel === "notifications";

  return (
    <main id="main-content" className="min-h-screen bg-app-ambient">
      <div className="sticky top-0 z-20 lg:hidden border-b border-border/40 bg-background/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <BackButton fallbackTo="/portfolio" label="ย้อนกลับ" />
          <span className="text-sm font-medium text-foreground">ตั้งค่าบัญชี</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            aria-label="เปิดเมนูตั้งค่า"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-4 w-4" />
            เมนู
          </Button>
        </div>
      </div>

      <div className="bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="max-w-5xl mx-auto px-4 pt-8 pb-6">
          <div className="flex items-start gap-3">
            <BackButton
              fallbackTo="/portfolio"
              label="ย้อนกลับ"
              className="hidden lg:inline-flex mt-1.5"
            />
            <div className="min-w-0">
              <h1 className="text-3xl md:text-4xl font-medium text-foreground">
                ตั้งค่า<span className="text-primary">บัญชี</span>ของคุณ
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                เลือกหมวดจากเมนู — โปรไฟล์ การแจ้งเตือน ความเป็นส่วนตัว และการใช้งาน
              </p>
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="mx-auto max-w-6xl px-4 pb-24 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8"
      >
        <SettingsSideNav
          activePanel={panel}
          onSelect={setPanel}
          isAdmin={!!isAdmin}
        />

        <div className="min-w-0 space-y-6">
        {panel === "profile" ? (
          <>
        <section id="settings-basic" className="rounded-2xl glass-panel p-6 space-y-5">
          <SectionTitle icon={User} title="ข้อมูลพื้นฐาน" />
          <div>
            <label htmlFor="settings-display-name" className="text-sm font-medium text-foreground">
              ชื่อที่แสดง
            </label>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex flex-1 items-center rounded-xl bg-secondary border border-border opacity-90">
                <input
                  id="settings-display-name"
                  type="text"
                  value={form.displayName}
                  readOnly
                  className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground focus:outline-none cursor-default"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-full shrink-0"
                onClick={() => setChangeDisplayNameOpen(true)}
              >
                ขอเปลี่ยน
              </Button>
            </div>
          </div>
          <div>
            <label htmlFor="settings-username" className="text-sm font-medium text-foreground">
              ชื่อผู้ใช้ (username)
            </label>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex flex-1 items-center rounded-xl bg-secondary border border-border opacity-90">
                <span className="pl-3 text-muted-foreground text-sm">@</span>
                <input
                  id="settings-username"
                  type="text"
                  value={form.username}
                  readOnly
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground focus:outline-none cursor-default"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-full shrink-0"
                onClick={() => setChangeUsernameOpen(true)}
              >
                ขอเปลี่ยน
              </Button>
            </div>
          </div>
          {normalizedUsername.length >= 2 && (
            <p className="text-xs text-muted-foreground -mt-2">
              ลิงก์โปรไฟล์สาธารณะ:{" "}
              <span className="text-primary font-medium">/@{normalizedUsername}</span>
            </p>
          )}
        </section>

        <section id="settings-about-me" className="rounded-2xl glass-panel p-6 space-y-3">
          <SectionTitle icon={User} title="About Me" />
          <p className="text-sm text-muted-foreground">
            แนะนำตัว ประสบการณ์ ทักษะ และลิงก์ติดต่อ แก้ได้ที่แท็บ About Me บนโปรไฟล์
          </p>
          <Button asChild variant="outline" className="rounded-full">
            <Link to={ABOUT_ME_EDIT_HREF}>
              ไปแก้ไข About Me
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>

        <section id="settings-address" className="rounded-2xl glass-panel p-6 space-y-5">
          <ProfileAddressEditor
            value={form.profileAddress}
            onChange={(profileAddress) => update("profileAddress", profileAddress)}
            idPrefix="settings-address"
          />
        </section>
        <ProfileVisibilitySection />
          </>
        ) : null}

        {panel === "billing" && user?.id ? (
          <BillingSettingsPanel
            userId={user.id}
            profile={profile as Record<string, unknown> | null | undefined}
            onSaved={() => {
              void qc.invalidateQueries({ queryKey: ["profile", user.id] });
            }}
          />
        ) : null}

        {panel === "notifications" ? (
          <>
            <InAppNotificationSection />
            <EmailNotificationSection
              value={{
                notifyEmail: form.notifyEmail,
                notifyHire: form.notifyHire,
                notifyCollab: form.notifyCollab,
                notifyJobMatch: form.notifyJobMatch,
              }}
              onChange={update}
            />
            <LineNotificationSection />
          </>
        ) : null}

        {panel === "chat" ? (
          <div
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                e.preventDefault();
              }
            }}
          >
            <ChatSettingsSection />
          </div>
        ) : null}

        {panel === "preferences" ? <SettingsPreferencesSection /> : null}

        {panel === "privacy" ? <PrivacySecuritySection user={user ?? null} /> : null}

        {panel === "admin" && isAdmin ? (
          <section className="rounded-2xl glass-panel p-6 space-y-3">
            <SectionTitle icon={Shield} title="ผู้ดูแลระบบ" />
            <p className="text-xs text-muted-foreground">เข้าถึงเครื่องมือมอนิเตอร์และจัดการทั้งระบบ</p>
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="inline-flex items-center gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90 px-4 py-2 text-sm font-medium transition-colors"
            >
              <Shield className="w-4 h-4" /> เปิดหน้าแอดมิน
            </button>
          </section>
        ) : null}

        {panel === "account" ? (
          <div className="space-y-6">
            <AccountSecurityIntro />
            {user ? <ChangePasswordSection user={user} /> : null}
            {user ? <WithdrawPinSettingsSection user={user} /> : null}
            <section className="rounded-2xl glass-panel p-6 space-y-4">
              <SectionTitle icon={LogOut} title="บัญชี" />
              <p className="text-xs text-muted-foreground">
                ออกจากระบบบนอุปกรณ์นี้ — ข้อมูลโปรไฟล์ยังอยู่ครบ
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive px-4 py-2 text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" /> ออกจากระบบ
              </button>
            </section>
          </div>
        ) : null}

        {showProfileSave ? (
          <div className="sticky bottom-4 flex justify-end">
            <Button type="submit" size="lg" disabled={updateMut.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-lg px-8">
              <Save className="w-4 h-4 mr-1" /> {updateMut.isPending ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
            </Button>
          </div>
        ) : null}
        </div>
      </form>

      {user?.id ? (
        <>
          <ChangeDisplayNameDialog
            open={changeDisplayNameOpen}
            onOpenChange={setChangeDisplayNameOpen}
            userId={user.id}
            currentDisplayName={form.displayName}
            cooldownUntil={displayNameCooldownUntil}
            onChanged={(displayName) => update("displayName", displayName)}
          />
          <ChangeUsernameDialog
            open={changeUsernameOpen}
            onOpenChange={setChangeUsernameOpen}
            userId={user.id}
            currentUsername={form.username}
            cooldownUntil={usernameCooldownUntil}
            onChanged={(username) => update("username", username)}
          />
        </>
      ) : null}

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[min(20rem,90vw)] p-0">
          <SheetHeader className="border-b border-border/70 px-4 py-4 text-left">
            <SheetTitle>ตั้งค่าบัญชี</SheetTitle>
            <SheetDescription>เลือกหมวดที่ต้องการแก้ไข</SheetDescription>
          </SheetHeader>
          <div className="p-3">
            <SettingsSideNav
              variant="plain"
              activePanel={panel}
              onSelect={setPanel}
              isAdmin={!!isAdmin}
              onNavigate={() => setMenuOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
};

const SectionTitle = ({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) => (
  <div className="flex items-center gap-2"><Icon className="w-5 h-5 text-primary" /><h2 className="font-semibold text-foreground">{title}</h2></div>
);

export default SettingsPage;
