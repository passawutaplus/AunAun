import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { User, Save, LogOut, Shield, CheckCircle2, Loader2, Briefcase, AlertTriangle } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { profileSchema, experienceItemSchema } from "@/lib/validators";
import type { ExperienceItem } from "@/lib/validators";
import { parseSocialLinks } from "@/lib/parseSocialLinks";
import ExperienceEditor from "@/components/profile/ExperienceEditor";
import SkillsEditor from "@/components/profile/SkillsEditor";
import WorkDisciplineEditor from "@/components/profile/WorkDisciplineEditor";
import ContactEditor from "@/components/profile/ContactEditor";
import ProfileLinksEditor from "@/components/profile/ProfileLinksEditor";
import ProfileAddressEditor from "@/components/profile/ProfileAddressEditor";
import { ChipMultiSelectWithOther } from "@/components/ui/ChipMultiSelectWithOther";
import {
  EMPTY_PROFILE_ADDRESS,
  formatProfileAddressShort,
  parseProfileAddress,
  profileAddressToJson,
} from "@/lib/profileAddress";
import {
  OPPORTUNITY_TYPE_KEYS,
  labelOpportunityType,
} from "@/lib/opportunity";
import { isReservedPublicHandle } from "@/lib/reservedHandles";
import { z } from "zod";
import PageLoader from "@/components/ui/PageLoader";
import { HttpErrorPage } from "@/components/HttpErrorPage";
import { supabase } from "@/integrations/supabase/client";
import { signOutApp } from "@/lib/signOutApp";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { SettingsPreferencesSection } from "@/components/settings/SettingsPreferencesSection";
import { ChangePasswordSection } from "@/components/settings/ChangePasswordSection";
import { EmailNotificationSection } from "@/components/settings/EmailNotificationSection";
import { ChatSettingsSection } from "@/components/settings/ChatSettingsSection";
import { BillingProfileSection } from "@/components/settings/BillingProfileSection";
import SettingsSideNav, { type SettingsNavItem } from "@/components/settings/SettingsSideNav";
import { cn } from "@/lib/utils";
import { useUsernameAvailability, normalizeUsername } from "@/hooks/useUsernameAvailability";
import { USERNAME_COOLDOWN_DAYS, USERNAME_COOLDOWN_MS } from "@/lib/usernamePolicy";
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

const SETTINGS_NAV: SettingsNavItem[] = [
  { id: "settings-basic", label: "ข้อมูลพื้นฐาน" },
  { id: "settings-address", label: "ที่อยู่" },
  { id: "settings-bio", label: "แนะนำตัว" },
  { id: "settings-disciplines", label: "สายงาน" },
  { id: "settings-opportunity", label: "กำลังมองหา" },
  { id: "settings-experience", label: "ประสบการณ์" },
  { id: "settings-skills", label: "ความชำนาญ" },
  { id: "settings-contact", label: "ข้อมูลติดต่อ" },
  { id: "settings-links", label: "ลิงก์โซเชียล" },
  { id: "billing-profile", label: "เอกสาร / ภาษี" },
  { id: "settings-email", label: "แจ้งเตือนอีเมล" },
  { id: "settings-chat", label: "แชท" },
  { id: "settings-preferences", label: "การตั้งค่าเพิ่มเติม" },
  { id: "settings-password", label: "รหัสผ่าน" },
  { id: "settings-account", label: "บัญชี" },
];
const settingsFormSchema = profileSchema.pick({
  displayName: true,
  username: true,
  bio: true,
  role: true,
  location: true,
  profileAddress: true,
  email: true,
  phone: true,
  website: true,
  lineId: true,
  facebook: true,
  instagram: true,
  socialLinks: true,
  skills: true,
  experience: true,
  preferredCategories: true,
  opportunityTypes: true,
  notifyEmail: true,
  notifyHire: true,
  notifyCollab: true,
});

type SettingsFormInput = z.infer<typeof settingsFormSchema>;

const parseExperience = (raw: unknown): ExperienceItem[] =>
  Array.isArray(raw) ? (raw as ExperienceItem[]) : [];

const parseSkills = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : [];

const empty: SettingsFormInput = {
  displayName: "",
  username: "",
  bio: "",
  role: "",
  location: "",
  profileAddress: { ...EMPTY_PROFILE_ADDRESS },
  email: "",
  phone: "",
  website: "",
  lineId: "",
  facebook: "",
  instagram: "",
  socialLinks: [],
  skills: [],
  experience: [],
  preferredCategories: [],
  opportunityTypes: [],
  notifyEmail: true,
  notifyHire: true,
  notifyCollab: true,
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading, isError } = useProfile(user?.id);
  const updateMut = useUpdateProfile(user?.id);
  const { data: isAdmin } = useIsAdmin();

  const handleSignOut = async () => {
    await signOutApp(qc);
    toast.success("ออกจากระบบแล้ว");
    navigate("/");
  };

  const [form, setForm] = useState<SettingsFormInput>(empty);
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [usernameConfirmOpen, setUsernameConfirmOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<SettingsFormInput | null>(null);
  const usernameChangedAt = (profile as { username_changed_at?: string | null } | null)
    ?.username_changed_at;
  const usernameCooldownUntil = useMemo(() => {
    if (!usernameChangedAt) return null;
    const until = new Date(usernameChangedAt).getTime() + USERNAME_COOLDOWN_MS;
    return until > Date.now() ? new Date(until) : null;
  }, [usernameChangedAt]);
  const usernameOnCooldown = !!usernameCooldownUntil;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedUsername(normalizeUsername(form.username)), 400);
    return () => window.clearTimeout(timer);
  }, [form.username]);

  const normalizedUsername = normalizeUsername(form.username);
  const savedUsername = normalizeUsername(profile?.username ?? "");
  const usernameUnchanged = normalizedUsername === savedUsername;
  const isAutoGeneratedUsername =
    !!profile?.user_id &&
    savedUsername.length > 7 &&
    savedUsername.endsWith(`_${profile.user_id.replace(/-/g, "").slice(0, 6)}`);
  const {
    data: usernameAvailability,
    isFetching: usernameChecking,
  } = useUsernameAvailability(debouncedUsername, user?.id);
  const usernameReserved = normalizedUsername.length >= 2 && isReservedPublicHandle(normalizedUsername);
  const usernameTaken =
    !usernameUnchanged &&
    !!usernameAvailability?.taken &&
    !usernameAvailability?.reserved;
  const usernamePending =
    normalizedUsername.length >= 2 &&
    !usernameUnchanged &&
    debouncedUsername !== normalizedUsername;
  const usernameInvalid = normalizedUsername.length > 0 && !/^[a-z0-9_.]+$/.test(normalizedUsername);
  const canSave = useMemo(() => {
    if (usernameUnchanged) return true;
    if (usernameOnCooldown) return false;
    return !(
      usernameInvalid ||
      usernameReserved ||
      usernameTaken ||
      usernamePending ||
      usernameChecking
    );
  }, [
    usernameUnchanged,
    usernameOnCooldown,
    usernameInvalid,
    usernameReserved,
    usernameTaken,
    usernamePending,
    usernameChecking,
  ]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?redirect=/settings");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, "");
    const id =
      raw === "profile-about" || raw === "settings-basic"
        ? "settings-basic"
        : SETTINGS_NAV.some((n) => n.id === raw)
          ? raw
          : null;
    if (!id) return;
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [profile, isAdmin]);

  useEffect(() => {
    if (profile) {
      setForm({
        displayName: profile.display_name ?? "",
        username: profile.username ?? "",
        bio: profile.bio ?? "",
        role: profile.role ?? "",
        location: profile.location ?? "",
        profileAddress: parseProfileAddress(
          (profile as { profile_address?: unknown }).profile_address,
        ),
        email: profile.email ?? user?.email ?? "",
        phone: profile.phone ?? "",
        website: profile.website ?? "",
        lineId: profile.line_id ?? "",
        facebook: profile.facebook ?? "",
        instagram: profile.instagram ?? "",
        socialLinks: parseSocialLinks((profile as { social_links?: unknown }).social_links),
        skills: parseSkills(profile.skills),
        experience: parseExperience(profile.experience),
        preferredCategories: parseSkills(
          (profile as { preferred_categories?: unknown }).preferred_categories,
        ),
        opportunityTypes: parseSkills(
          (profile as { opportunity_types?: unknown }).opportunity_types,
        ),
        notifyEmail: profile.notify_email ?? true,
        notifyHire: profile.notify_hire ?? true,
        notifyCollab: (profile as { notify_collab?: boolean }).notify_collab ?? true,
      });
    }
  }, [profile, user]);

  const update = <K extends keyof SettingsFormInput>(k: K, v: SettingsFormInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const persistProfile = async (payload: SettingsFormInput, usernameChanged: boolean) => {
    try {
      await updateMut.mutateAsync(payload);
      setUsernameConfirmOpen(false);
      setPendingSave(null);
      toast.success("บันทึกสำเร็จ", {
        description: usernameChanged
          ? `ลิงก์โปรไฟล์ใหม่: /@${normalizeUsername(payload.username)}`
          : "ข้อมูลโปรไฟล์ของคุณถูกอัปเดตแล้ว",
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedExperience = form.experience
      .map((it) => ({
        title: it.title.trim(),
        company: (it.company ?? "").trim(),
        period: (it.period ?? "").trim(),
        description: (it.description ?? "").trim(),
      }))
      .filter((it) => it.title);
    for (const item of cleanedExperience) {
      const parsedItem = experienceItemSchema.safeParse(item);
      if (!parsedItem.success) {
        toast.error(parsedItem.error.issues[0]?.message ?? "ข้อมูลประสบการณ์ไม่ถูกต้อง");
        return;
      }
    }
    const address = profileAddressToJson(form.profileAddress);
    const payload = {
      ...form,
      experience: cleanedExperience,
      profileAddress: address,
      location: formatProfileAddressShort(address) || form.location.trim(),
    };
    const parsed = settingsFormSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }
    if (!canSave) return;
    if (!usernameUnchanged) {
      setPendingSave(parsed.data);
      setUsernameConfirmOpen(true);
      return;
    }
    await persistProfile(parsed.data, false);
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

  const navItems = useMemo(() => {
    if (isAdmin) {
      return [
        ...SETTINGS_NAV.slice(0, -1),
        { id: "settings-admin", label: "ผู้ดูแลระบบ" },
        SETTINGS_NAV[SETTINGS_NAV.length - 1]!,
      ];
    }
    return SETTINGS_NAV;
  }, [isAdmin]);

  return (
    <div className="min-h-screen bg-app-ambient">
      <div className="sticky top-0 z-20 lg:hidden border-b border-border/40 bg-background/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <BackButton fallbackTo="/portfolio" label="ย้อนกลับ" />
          <span className="text-sm font-medium text-foreground">ตั้งค่าบัญชี</span>
          <span className="w-12" />
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
                ตั้งค่า<span className="text-primary">โปรไฟล์</span>ของคุณ
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                ปรับแต่งข้อมูลที่จะแสดงบนหน้าผลงานและคำขอจ้างงาน
              </p>
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="max-w-5xl mx-auto px-4 pb-24 grid grid-cols-1 lg:grid-cols-[13rem_1fr] xl:grid-cols-[14rem_1fr] gap-6 lg:gap-8"
      >
        <SettingsSideNav items={navItems} />

        <div className="min-w-0 space-y-6">
        <section id="settings-basic" className="rounded-2xl glass-panel p-6 space-y-5 scroll-mt-24">
          <SectionTitle icon={User} title="ข้อมูลพื้นฐาน" />
          <Field
            label="ชื่อที่แสดง"
            value={form.displayName}
            onChange={(v) => update("displayName", v)}
            hint="ชื่อที่คนอื่นเห็นในฟีด คอมเมนต์ และโปรไฟล์ — ไม่จำเป็นต้องไม่ซ้ำกับคนอื่น"
            id="settings-display-name"
          />
          <div>
            <label htmlFor="settings-username" className="text-sm font-medium text-foreground">
              ชื่อผู้ใช้ (username)
            </label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              ใช้ในลิงก์โปรไฟล์และ @mention — ต้องไม่ซ้ำกับคนอื่น (a-z, 0-9, _ และ .)
            </p>
            {usernameOnCooldown && usernameCooldownUntil ? (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                เปลี่ยนชื่อผู้ใช้ได้ทุก {USERNAME_COOLDOWN_DAYS} วัน — ครั้งถัดไปได้หลัง{" "}
                {usernameCooldownUntil.toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            ) : null}
            <div
              className={cn(
                "mt-1 flex items-center rounded-xl bg-secondary border border-border focus-within:ring-2 focus-within:ring-primary/40",
                (usernameTaken || usernameReserved || usernameInvalid) && "border-destructive focus-within:ring-destructive/40",
                usernameOnCooldown && "opacity-80",
              )}
            >
              <span className="pl-3 text-muted-foreground text-sm">@</span>
              <input
                id="settings-username"
                type="text"
                value={form.username}
                onChange={(e) => update("username", e.target.value.toLowerCase())}
                disabled={usernameOnCooldown}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
              />
            </div>
            {normalizedUsername.length >= 2 && !usernameUnchanged && (
              <p
                className={cn(
                  "mt-1 text-xs flex items-center gap-1",
                  usernamePending || (usernameChecking && debouncedUsername === normalizedUsername)
                    ? "text-muted-foreground"
                    : usernameInvalid
                      ? "text-destructive"
                      : usernameReserved
                        ? "text-destructive"
                        : usernameTaken
                          ? "text-destructive"
                          : "text-emerald-600 dark:text-emerald-400",
                )}
              >
                {usernamePending || (usernameChecking && debouncedUsername === normalizedUsername) ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> กำลังตรวจสอบชื่อผู้ใช้…
                  </>
                ) : usernameInvalid ? (
                  "ใช้ได้เฉพาะ a-z, 0-9, _ และ ."
                ) : usernameReserved ? (
                  "ชื่อผู้ใช้นี้สงวนไว้ — ลองชื่ออื่น"
                ) : usernameTaken ? (
                  "ชื่อผู้ใช้นี้ถูกใช้แล้ว — ลองชื่ออื่น"
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3" /> ชื่อผู้ใช้นี้ใช้ได้
                  </>
                )}
              </p>
            )}
            {isAutoGeneratedUsername && usernameUnchanged && (
              <p className="mt-1 text-xs text-muted-foreground">
                ตอนนี้ใช้ชื่อที่ระบบสร้างให้ — เปลี่ยนเป็น @username ที่จำง่ายได้ เช่น ชื่อเล่นหรือชื่อสตูดิโอ
              </p>
            )}
          </div>
          {normalizedUsername.length >= 2 && (
            <p className="text-xs text-muted-foreground -mt-2">
              ลิงก์โปรไฟล์สาธารณะ:{" "}
              <span className="text-primary font-medium">/@{normalizedUsername}</span>
            </p>
          )}
          {!usernameUnchanged && normalizedUsername.length >= 2 && canSave && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 -mt-2">
              <p className="text-xs text-foreground flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <span>
                  เปลี่ยนชื่อผู้ใช้แล้วลิงก์โปรไฟล์จะเปลี่ยนจาก{" "}
                  <span className="font-medium">/@{savedUsername}</span> เป็น{" "}
                  <span className="font-medium">/@{normalizedUsername}</span> — ลิงก์เก่าที่แชร์ไว้จะเปิดไม่ได้
                </span>
              </p>
            </div>
          )}
          <Field
            label="ตำแหน่ง / สาขา"
            value={form.role}
            onChange={(v) => update("role", v)}
            icon={Briefcase}
            placeholder="เช่น Graphic Designer, UX/UI"
            id="settings-role"
          />
        </section>

        <section id="settings-address" className="rounded-2xl glass-panel p-6 space-y-5 scroll-mt-24">
          <ProfileAddressEditor
            value={form.profileAddress}
            onChange={(profileAddress) => update("profileAddress", profileAddress)}
            idPrefix="settings-address"
          />
        </section>

        <section id="settings-bio" className="rounded-2xl glass-panel p-6 space-y-3 scroll-mt-24">
          <SectionTitle icon={User} title="แนะนำตัว" />
          <textarea
            id="settings-bio"
            value={form.bio ?? ""}
            onChange={(e) => update("bio", e.target.value)}
            rows={4}
            maxLength={500}
            className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            placeholder="เล่าสั้น ๆ เกี่ยวกับตัวคุณและงานที่ทำ"
          />
          <p className="text-xs text-muted-foreground text-right">{(form.bio ?? "").length}/500 ตัวอักษร</p>
        </section>

        <section id="settings-disciplines" className="rounded-2xl glass-panel p-6 space-y-3 scroll-mt-24">
          <h2 className="font-semibold text-foreground">สายงาน</h2>
          <p className="text-xs text-muted-foreground -mt-1">หมวดงานที่คุณทำ — แสดงบนโปรไฟล์และแชท</p>
          <WorkDisciplineEditor
            value={form.preferredCategories}
            onChange={(preferredCategories) => update("preferredCategories", preferredCategories)}
          />
        </section>

        <section id="settings-opportunity" className="rounded-2xl glass-panel p-6 space-y-3 scroll-mt-24">
          <h2 className="font-semibold text-foreground">กำลังมองหา</h2>
          <p className="text-xs text-muted-foreground -mt-1">เลือกอย่างน้อย 1 — แสดงบนโปรไฟล์และแชท</p>
          <ChipMultiSelectWithOther
            options={OPPORTUNITY_TYPE_KEYS.map((id) => ({
              id,
              label: labelOpportunityType(id),
            }))}
            selected={form.opportunityTypes}
            onChange={(opportunityTypes) => update("opportunityTypes", opportunityTypes)}
            knownIds={OPPORTUNITY_TYPE_KEYS}
            otherPlaceholder="พิมพ์สิ่งที่มองหาแล้วกด Enter"
          />
        </section>

        <section id="settings-experience" className="rounded-2xl glass-panel p-6 space-y-4 scroll-mt-24">
          <h2 className="font-semibold text-foreground">ประสบการณ์ทำงาน</h2>
          <ExperienceEditor
            value={form.experience}
            onChange={(experience) => update("experience", experience)}
          />
        </section>

        <section id="settings-skills" className="rounded-2xl glass-panel p-6 space-y-3 scroll-mt-24">
          <h2 className="font-semibold text-foreground">ความชำนาญ</h2>
          <p className="text-xs text-muted-foreground -mt-1">เครื่องมือและสไตล์ที่ถนัด</p>
          <SkillsEditor value={form.skills} onChange={(skills) => update("skills", skills)} />
        </section>

        <section id="settings-contact" className="rounded-2xl glass-panel p-6 space-y-3 scroll-mt-24">
          <h2 className="font-semibold text-foreground">ข้อมูลติดต่อ</h2>
          <ContactEditor
            value={{
              email: form.email,
              phone: form.phone,
              website: form.website,
              lineId: form.lineId,
              facebook: form.facebook,
              instagram: form.instagram,
            }}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          />
        </section>

        <section id="settings-links" className="rounded-2xl glass-panel p-6 space-y-3 scroll-mt-24">
          <h2 className="font-semibold text-foreground">ลิงก์โซเชียล / ติดต่อ</h2>
          <p className="text-xs text-muted-foreground -mt-1">
            Facebook · Instagram · X · TikTok · Lemon8 และช่องทางติดต่ออื่น
          </p>
          <ProfileLinksEditor
            value={form.socialLinks}
            onChange={(socialLinks) => update("socialLinks", socialLinks)}
          />
        </section>

        {user?.id ? (
          <BillingProfileSection
            userId={user.id}
            profile={profile as Record<string, unknown> | null | undefined}
            onSaved={() => {
              void qc.invalidateQueries({ queryKey: ["profile", user.id] });
            }}
          />
        ) : null}

        <div id="settings-email" className="scroll-mt-24">
          <EmailNotificationSection
            value={{
              notifyEmail: form.notifyEmail,
              notifyHire: form.notifyHire,
              notifyCollab: form.notifyCollab,
            }}
            onChange={update}
          />
        </div>

        <div
          id="settings-chat"
          className="scroll-mt-24"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
              e.preventDefault();
            }
          }}
        >
          <ChatSettingsSection />
        </div>

        <div id="settings-preferences" className="scroll-mt-24">
          <SettingsPreferencesSection />
        </div>

        <div id="settings-password" className="scroll-mt-24">
          {user && <ChangePasswordSection user={user} />}
        </div>

        {isAdmin && (
          <section id="settings-admin" className="rounded-2xl glass-panel p-6 space-y-3 scroll-mt-24">
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
        )}

        <section id="settings-account" className="rounded-2xl glass-panel p-6 space-y-4 scroll-mt-24">
          <SectionTitle icon={LogOut} title="บัญชี" />
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive px-4 py-2 text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" /> ออกจากระบบ
          </button>
        </section>

        <div className="sticky bottom-4 flex justify-end">
          <Button type="submit" size="lg" disabled={updateMut.isPending || !canSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-lg px-8">
            <Save className="w-4 h-4 mr-1" /> {updateMut.isPending ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </Button>
        </div>
        </div>
      </form>

      <AlertDialog open={usernameConfirmOpen} onOpenChange={setUsernameConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันเปลี่ยนชื่อผู้ใช้?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                <p>
                  ลิงก์โปรไฟล์จะเปลี่ยนจาก{" "}
                  <span className="font-medium text-foreground">/@{savedUsername}</span> เป็น{" "}
                  <span className="font-medium text-foreground">/@{normalizedUsername}</span>
                </p>
                <p>ลิงก์เก่าที่แชร์ไว้จะเปิดไม่ได้ — ชื่อที่แสดงในฟีดจะไม่เปลี่ยนตาม</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMut.isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              disabled={updateMut.isPending || !pendingSave}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={(e) => {
                e.preventDefault();
                if (pendingSave) void persistProfile(pendingSave, true);
              }}
            >
              {updateMut.isPending ? "กำลังบันทึก..." : "ยืนยันเปลี่ยน"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const SectionTitle = ({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) => (
  <div className="flex items-center gap-2"><Icon className="w-5 h-5 text-primary" /><h2 className="font-semibold text-foreground">{title}</h2></div>
);

interface FieldProps {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; prefix?: string; placeholder?: string; hint?: string;
  icon?: React.ComponentType<{ className?: string }>; id?: string;
}
const Field = ({ label, value, onChange, type = "text", prefix, icon: Icon, placeholder, hint, id }: FieldProps) => {
  const fieldId = id ?? `settings-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
  <div>
    <label htmlFor={fieldId} className="text-sm font-medium text-foreground">{label}</label>
    {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    <div className="mt-1 flex items-center rounded-xl bg-secondary border border-border focus-within:ring-2 focus-within:ring-primary/40">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground ml-3" />}
      {prefix && <span className="pl-3 text-muted-foreground text-sm">{prefix}</span>}
      <input id={fieldId} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
    </div>
  </div>
  );
};

export default SettingsPage;
