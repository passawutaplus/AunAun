import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, LogOut, MapPin, Shield, User } from "lucide-react";
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
import { InAppNotificationSection } from "@/components/settings/InAppNotificationSection";
import { LineNotificationSection } from "@/components/settings/LineNotificationSection";
import { ChatSettingsSection } from "@/components/settings/ChatSettingsSection";
import { ProfileVisibilitySection } from "@/components/settings/ProfileVisibilitySection";
import BillingSettingsPanel from "@/components/settings/BillingSettingsPanel";
import { FeedbackReportsSection } from "@/components/settings/PrivacySecuritySection";
import { AccountPrivacySection } from "@/components/settings/AccountPrivacySection";
import { CollabTagSettingsSection } from "@/components/settings/CollabTagSettingsSection";
import { SettingsCard, useSaveStatus } from "@/components/settings/SettingsCard";
import { ChangePasswordSection } from "@/components/settings/ChangePasswordSection";
import { isCommerceEnabled } from "@/lib/aplus1Launch";
import { AccountSecurityIntro } from "@/components/settings/AccountSecurityIntro";
import { WithdrawPinSettingsSection } from "@/components/settings/WithdrawPinSettingsSection";
import SettingsSideNav, { useSettingsPanelState } from "@/components/settings/SettingsSideNav";
import { ChangeUsernameDialog } from "@/components/settings/ChangeUsernameDialog";
import { ChangeDisplayNameDialog } from "@/components/settings/ChangeDisplayNameDialog";
import { normalizeUsername } from "@/hooks/useUsernameAvailability";
import { USERNAME_COOLDOWN_MS } from "@/lib/usernamePolicy";
import { DISPLAY_NAME_COOLDOWN_MS } from "@/lib/displayNamePolicy";
import { buildSettingsNavGroups } from "@/lib/settingsNav";

const addressSchema = profileSchema.pick({ location: true, profileAddress: true });
const ADDRESS_SAVE_DELAY_MS = 900;

/** Below lg the settings open as a list first, then one panel at a time (iOS-style). */
function useIsDesktop() {
  const query = "(min-width: 1024px)";
  const [desktop, setDesktop] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const on = () => setDesktop(mql.matches);
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, []);
  return desktop;
}

type SettingsFormInput = {
  displayName: string;
  username: string;
  location: string;
  profileAddress: z.infer<typeof addressSchema>["profileAddress"];
};

const empty: SettingsFormInput = {
  displayName: "",
  username: "",
  location: "",
  profileAddress: { ...EMPTY_PROFILE_ADDRESS },
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading, isError } = useProfile(user?.id);
  const updateMut = useUpdateProfile(user?.id);
  const { data: isAdmin } = useIsAdmin();
  const { panel, setPanel } = useSettingsPanelState(!!isAdmin);
  const isDesktop = useIsDesktop();
  const [mobileList, setMobileList] = useState(() => typeof window !== "undefined" && !window.location.hash);
  const addressStatus = useSaveStatus();
  const addressDirty = useRef(false);
  const showList = !isDesktop && mobileList;
  const navGroups = useMemo(() => buildSettingsNavGroups(!!isAdmin), [isAdmin]);
  const panelLabel = navGroups.flatMap((g) => g.items).find((i) => i.id === panel)?.label ?? "ตั้งค่า";

  const openPanel = (next: typeof panel) => {
    setPanel(next);
    setMobileList(false);
  };

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
      });
    }
  }, [profile]);

  const update = <K extends keyof SettingsFormInput>(k: K, v: SettingsFormInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const setAddress = (profileAddress: SettingsFormInput["profileAddress"]) => {
    addressDirty.current = true;
    update("profileAddress", profileAddress);
  };

  // Address saves itself shortly after the last change
  useEffect(() => {
    if (!addressDirty.current) return;
    const t = window.setTimeout(() => {
      addressDirty.current = false;
      const address = profileAddressToJson(form.profileAddress);
      const parsed = addressSchema.safeParse({
        profileAddress: address,
        location: formatProfileAddressShort(address) || form.location.trim(),
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "ที่อยู่ไม่ถูกต้อง");
        return;
      }
      void addressStatus.track(updateMut.mutateAsync(parsed.data));
    }, ADDRESS_SAVE_DELAY_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.profileAddress]);

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

  return (
    <main id="main-content" className="min-h-screen bg-app-ambient">
      <div className="sticky top-0 z-20 lg:hidden border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="relative mx-auto flex max-w-5xl items-center gap-2 px-2 py-2.5">
          {showList ? (
            <BackButton fallbackTo="/portfolio" label="ย้อนกลับ" />
          ) : (
            <button
              type="button"
              onClick={() => setMobileList(true)}
              className="relative z-10 inline-flex items-center gap-0.5 rounded-full px-2 py-1.5 text-sm text-foreground hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
              ตั้งค่า
            </button>
          )}
          <span className="pointer-events-none absolute inset-x-0 text-center text-sm font-medium text-foreground">
            {showList ? "ตั้งค่า" : panelLabel}
          </span>
        </div>
      </div>

      <div className="mx-auto hidden max-w-6xl items-center gap-3 px-4 pb-5 pt-7 lg:flex">
        <BackButton fallbackTo="/portfolio" label="ย้อนกลับ" />
        <h1 className="text-2xl font-medium text-foreground">ตั้งค่า</h1>
      </div>

      <div
        id="settings-body"
        className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-24 pt-4 lg:flex-row lg:items-start lg:gap-8 lg:pt-0"
      >
        <SettingsSideNav activePanel={panel} onSelect={openPanel} isAdmin={!!isAdmin} />

        {showList ? (
          <MobileSettingsList groups={navGroups} onPick={openPanel} onSignOut={handleSignOut} />
        ) : (
          <div className="min-w-0 flex-1 space-y-6">
            {panel === "profile" ? (
              <>
                <SettingsCard icon={User} title="ชื่อและลิงก์โปรไฟล์" id="settings-basic">
                  <div className="divide-y divide-border/50 rounded-xl border border-border/60">
                    <IdentityRow
                      label="ชื่อที่แสดง"
                      value={form.displayName || "—"}
                      onChange={() => setChangeDisplayNameOpen(true)}
                    />
                    <IdentityRow
                      label="ชื่อผู้ใช้"
                      value={form.username ? `@${form.username}` : "—"}
                      hint={normalizedUsername.length >= 2 ? `ลิงก์โปรไฟล์ /@${normalizedUsername}` : undefined}
                      onChange={() => setChangeUsernameOpen(true)}
                    />
                  </div>
                  <Link
                    to={ABOUT_ME_EDIT_HREF}
                    className="flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-3.5 py-3 text-sm transition-colors hover:bg-accent"
                  >
                    <span>
                      <span className="block font-medium text-foreground">แนะนำตัว ทักษะ ลิงก์ติดต่อ</span>
                      <span className="block text-xs text-muted-foreground">แก้ในแท็บ About Me บนโปรไฟล์</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </SettingsCard>

                <SettingsCard
                  icon={MapPin}
                  title="ที่อยู่"
                  id="settings-address"
                  status={addressStatus.status}
                  description="เลือกจังหวัด อำเภอ ตำบล แล้วรหัสไปรษณีย์จะขึ้นเอง"
                >
                  <ProfileAddressEditor
                    value={form.profileAddress}
                    onChange={setAddress}
                    idPrefix="settings-address"
                    hideHeader
                  />
                </SettingsCard>
              </>
            ) : null}

            {panel === "billing" && user?.id && isCommerceEnabled() ? (
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
                <LineNotificationSection />
              </>
            ) : null}

            {panel === "chat" ? <ChatSettingsSection /> : null}

            {panel === "visibility" ? (
              <>
                <ProfileVisibilitySection />
                <CollabTagSettingsSection />
              </>
            ) : null}

            {panel === "preferences" ? <SettingsPreferencesSection /> : null}

            {panel === "data" ? <AccountPrivacySection /> : null}

            {panel === "feedback" ? <FeedbackReportsSection /> : null}

            {panel === "admin" && isAdmin ? (
              <SettingsCard icon={Shield} title="ผู้ดูแลระบบ" description="เครื่องมือมอนิเตอร์และจัดการทั้งระบบ">
                <button
                  type="button"
                  onClick={() => navigate("/admin")}
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
                >
                  <Shield className="h-4 w-4" /> เปิดหน้าแอดมิน
                </button>
              </SettingsCard>
            ) : null}

            {panel === "account" ? (
              <div className="space-y-6">
                {user ? <ChangePasswordSection user={user} /> : null}
                {user && isCommerceEnabled() ? (
                  <>
                    <AccountSecurityIntro showWithdrawPin />
                    <WithdrawPinSettingsSection user={user} />
                  </>
                ) : null}
                <SettingsCard icon={LogOut} title="ออกจากระบบ" description="ออกจากอุปกรณ์นี้ ข้อมูลทั้งหมดยังอยู่ครบ">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
                  >
                    <LogOut className="h-4 w-4" /> ออกจากระบบ
                  </button>
                </SettingsCard>
              </div>
            ) : null}
          </div>
        )}
      </div>

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
    </main>
  );
};

function IdentityRow({
  label,
  value,
  hint,
  onChange,
}: {
  label: string;
  value: string;
  hint?: string;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
        {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-full" onClick={onChange}>
        เปลี่ยน
      </Button>
    </div>
  );
}

type NavGroups = ReturnType<typeof buildSettingsNavGroups>;

function MobileSettingsList({
  groups,
  onPick,
  onSignOut,
}: {
  groups: NavGroups;
  onPick: (id: NavGroups[number]["items"][number]["id"]) => void;
  onSignOut: () => void;
}) {
  return (
    <div className="space-y-5 lg:hidden">
      {groups.map((group) => (
        <div key={group.id}>
          <p className="px-1 pb-1.5 text-xs font-medium text-muted-foreground">{group.label}</p>
          <ul className="divide-y divide-border/50 overflow-hidden rounded-2xl glass-panel">
            {group.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onPick(item.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm text-foreground active:bg-accent"
                >
                  {item.label}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <button
        type="button"
        onClick={onSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl glass-panel px-4 py-3.5 text-sm font-medium text-destructive"
      >
        <LogOut className="h-4 w-4" />
        ออกจากระบบ
      </button>
    </div>
  );
}


export default SettingsPage;
