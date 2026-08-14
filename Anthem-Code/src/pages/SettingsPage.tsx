import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { User, Save, LogOut, Shield, Briefcase, Layers, Search, Monitor, Link2 } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { profileSchema, experienceItemSchema, formatExperiencePeriod, normalizeExperienceItem } from "@/lib/validators";
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
import SettingsSideNav, { useSettingsPanelState } from "@/components/settings/SettingsSideNav";
import { ChangeUsernameDialog } from "@/components/settings/ChangeUsernameDialog";
import { ChangeDisplayNameDialog } from "@/components/settings/ChangeDisplayNameDialog";
import { normalizeUsername } from "@/hooks/useUsernameAvailability";
import { USERNAME_COOLDOWN_MS } from "@/lib/usernamePolicy";
import { DISPLAY_NAME_COOLDOWN_MS } from "@/lib/displayNamePolicy";

const settingsFormSchema = profileSchema.pick({
  displayName: true,
  username: true,
  bio: true,
  role: true,
  location: true,
  profileAddress: true,
  email: true,
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
  notifyJobMatch: true,
});

type SettingsFormInput = z.infer<typeof settingsFormSchema>;

const parseExperience = (raw: unknown): ExperienceItem[] =>
  Array.isArray(raw)
    ? raw.map(normalizeExperienceItem).filter((x): x is ExperienceItem => !!x)
    : [];

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
    if (!authLoading && !user) navigate("/auth?redirect=/settings");
  }, [authLoading, user, navigate]);

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
        notifyJobMatch: (profile as { notify_job_match?: boolean }).notify_job_match ?? true,
      });
    }
  }, [profile, user]);

  const update = <K extends keyof SettingsFormInput>(k: K, v: SettingsFormInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const persistProfile = async (payload: SettingsFormInput) => {
    try {
      // ชื่อที่แสดง / username เปลี่ยนผ่าน dialog เท่านั้น (มี cooldown)
      const { displayName: _dn, username: _un, ...rest } = payload;
      await updateMut.mutateAsync(rest);
      toast.success("บันทึกสำเร็จ", {
        description: "ข้อมูลโปรไฟล์ของคุณถูกอัปเดตแล้ว",
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedExperience = form.experience
      .map((it) => {
        const isCurrent = !!it.isCurrent;
        const composed = formatExperiencePeriod(it);
        return {
          title: it.title.trim(),
          company: (it.company ?? "").trim(),
          periodStart: (it.periodStart ?? "").trim(),
          periodEnd: isCurrent ? "" : (it.periodEnd ?? "").trim(),
          isCurrent,
          employmentType: it.employmentType ?? null,
          period: composed || (it.period ?? "").trim(),
          description: (it.description ?? "").trim(),
        };
      })
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
                ตั้งค่า<span className="text-primary">บัญชี</span>ของคุณ
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                เลือกหมวดด้านซ้าย — โปรไฟล์ การแจ้งเตือน ความเป็นส่วนตัว และการใช้งาน
              </p>
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="max-w-5xl mx-auto px-4 pb-24 grid grid-cols-1 lg:grid-cols-[14rem_1fr] xl:grid-cols-[15rem_1fr] gap-6 lg:gap-8"
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
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" aria-hidden />
              <label htmlFor="settings-role" className="text-sm font-medium text-foreground">
                ตำแหน่งงาน
              </label>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              ตำแหน่งหรือบทบาทที่แสดงบนโปรไฟล์ — ไม่ใช่สายงาน (เลือกสายงานด้านล่าง)
            </p>
            <div className="mt-1 flex items-center rounded-xl bg-secondary border border-border focus-within:ring-2 focus-within:ring-primary/40">
              <input
                id="settings-role"
                type="text"
                value={form.role}
                onChange={(e) => update("role", e.target.value)}
                placeholder="เช่น Senior UX/UI, Brand Communication, Project Manager"
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-xs placeholder:font-light placeholder:text-muted-foreground/40 focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section id="settings-address" className="rounded-2xl glass-panel p-6 space-y-5">
          <ProfileAddressEditor
            value={form.profileAddress}
            onChange={(profileAddress) => update("profileAddress", profileAddress)}
            idPrefix="settings-address"
          />
        </section>

        <section id="settings-bio" className="rounded-2xl glass-panel p-6 space-y-3">
          <SectionTitle icon={User} title="แนะนำตัว" />
          <textarea
            id="settings-bio"
            value={form.bio ?? ""}
            onChange={(e) => update("bio", e.target.value)}
            rows={4}
            maxLength={500}
            className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none placeholder:text-xs placeholder:font-light placeholder:text-muted-foreground/40"
            placeholder="เล่าสั้น ๆ เกี่ยวกับตัวคุณและงานที่ทำ"
          />
          <p className="text-xs text-muted-foreground text-right">{(form.bio ?? "").length}/500 ตัวอักษร</p>
        </section>

        <section id="settings-disciplines" className="rounded-2xl glass-panel p-6 space-y-3">
          <SectionTitle icon={Layers} title="สายงาน" />
          <p className="text-xs text-muted-foreground -mt-1">หมวดงานที่คุณทำ — แสดงบนโปรไฟล์และแชท</p>
          <WorkDisciplineEditor
            value={form.preferredCategories}
            onChange={(preferredCategories) => update("preferredCategories", preferredCategories)}
          />
        </section>

        <section id="settings-opportunity" className="rounded-2xl glass-panel p-6 space-y-3">
          <SectionTitle icon={Search} title="กำลังมองหา" />
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

        <section id="settings-experience" className="rounded-2xl glass-panel p-6 space-y-4">
          <div>
            <SectionTitle icon={Briefcase} title="ประสบการณ์ทำงาน" />
            <p className="text-xs text-muted-foreground mt-0.5">
              กรอกแล้วกดยืนยันเพิ่ม — แก้/ลบรายการได้ แล้วกดบันทึกการเปลี่ยนแปลงด้านล่าง
            </p>
          </div>
          <ExperienceEditor
            value={form.experience}
            onChange={(experience) => update("experience", experience)}
          />
        </section>

        <section id="settings-skills" className="rounded-2xl glass-panel p-6 space-y-3">
          <SectionTitle icon={Monitor} title="ความชำนาญ" />
          <p className="text-xs text-muted-foreground -mt-1">เครื่องมือและสไตล์ที่ถนัด</p>
          <SkillsEditor value={form.skills} onChange={(skills) => update("skills", skills)} />
        </section>

        <section id="settings-contact" className="rounded-2xl glass-panel p-6 space-y-5">
          <div className="space-y-3">
            <SectionTitle icon={Link2} title="ลิงก์โซเชียล / ติดต่อ" />
            <p className="text-xs text-muted-foreground -mt-1">
              อีเมล · เว็บไซต์ · Facebook · Instagram · X · TikTok · Lemon8 และช่องทางอื่น
            </p>
            <ContactEditor
              value={{
                email: form.email,
                website: form.website,
              }}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            />
          </div>
          <div id="settings-links" className="space-y-3 pt-1 border-t border-border/60">
            <ProfileLinksEditor
              value={form.socialLinks}
              onChange={(socialLinks) => update("socialLinks", socialLinks)}
            />
          </div>
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
            {user ? <ChangePasswordSection user={user} /> : null}
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
    </main>
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
        className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-xs placeholder:font-light placeholder:text-muted-foreground/40 focus:outline-none" />
    </div>
  </div>
  );
};

export default SettingsPage;
