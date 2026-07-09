import BriefcaseIcon from "../components/icons/BriefcaseIcon";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Camera, Save, MapPin, LogOut, Shield, CheckCircle2, Loader2 } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile, useUpdateProfileMedia } from "@/hooks/useProfile";
import { useUsernameAvailability, normalizeUsername } from "@/hooks/useUsernameAvailability";
import { uploadProjectImage } from "@/lib/uploadImage";
import { profileSchema } from "@/lib/validators";
import { isReservedPublicHandle } from "@/lib/reservedHandles";
import { z } from "zod";
import { HttpErrorPage } from "@/components/HttpErrorPage";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { TierMembershipCard } from "@/components/tier/TierMembershipCard";
import { StorageUsageSection } from "@/components/settings/StorageUsageSection";
import { AiUsageSettingsSection } from "@/components/settings/AiUsageSettingsSection";
import { SettingsPreferencesSection } from "@/components/settings/SettingsPreferencesSection";
import { ChangePasswordSection } from "@/components/settings/ChangePasswordSection";
import { LineNotificationSection } from "@/components/settings/LineNotificationSection";
import { EmailNotificationSection } from "@/components/settings/EmailNotificationSection";
import { useSubscription } from "@/core/subscription";
import { cn } from "@/lib/utils";

const settingsFormSchema = profileSchema.pick({
  displayName: true,
  username: true,
  bio: true,
  role: true,
  location: true,
  notifyEmail: true,
  notifyHire: true,
  notifyJobMatch: true,
  preferredCategories: true,
  preferredEmploymentTypes: true,
});

type SettingsFormInput = z.infer<typeof settingsFormSchema>;

const empty: SettingsFormInput = {
  displayName: "",
  username: "",
  bio: "",
  role: "",
  location: "",
  notifyEmail: true,
  notifyHire: true,
  notifyJobMatch: true,
  preferredCategories: [],
  preferredEmploymentTypes: [],
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading, isError } = useProfile(user?.id);
  const updateMut = useUpdateProfile(user?.id);
  const updateMedia = useUpdateProfileMedia(user?.id);
  const avatarInput = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const { data: isAdmin } = useIsAdmin();
  const { tier } = useSubscription();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("ออกจากระบบแล้ว");
    navigate("/");
  };

  const [form, setForm] = useState<SettingsFormInput>(empty);
  const [debouncedUsername, setDebouncedUsername] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedUsername(normalizeUsername(form.username)), 400);
    return () => window.clearTimeout(timer);
  }, [form.username]);

  const normalizedUsername = normalizeUsername(form.username);
  const usernameUnchanged = normalizedUsername === normalizeUsername(profile?.username ?? "");
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
    return !(
      usernameInvalid ||
      usernameReserved ||
      usernameTaken ||
      usernamePending ||
      usernameChecking
    );
  }, [
    usernameUnchanged,
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
    if (profile) {
      setForm({
        displayName: profile.display_name ?? "",
        username: profile.username ?? "",
        bio: profile.bio ?? "",
        role: profile.role ?? "",
        location: profile.location ?? "",
        notifyEmail: profile.notify_email ?? true,
        notifyHire: profile.notify_hire ?? true,
        notifyJobMatch: (profile as any).notify_job_match ?? true,
        preferredCategories: (profile as any).preferred_categories ?? [],
        preferredEmploymentTypes: (profile as any).preferred_employment_types ?? [],
      });
    }
  }, [profile, user]);

  const update = <K extends keyof SettingsFormInput>(k: K, v: SettingsFormInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleAvatarPick = async (file?: File) => {
    if (!file || !user) return;
    setAvatarBusy(true);
    try {
      const url = await uploadProjectImage(file, user.id, "avatar", tier);
      await updateMedia.mutateAsync({ avatar_url: url });
      toast.success("อัปเดตรูปโปรไฟล์แล้ว");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = settingsFormSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }
    if (!canSave) return;
    try {
      await updateMut.mutateAsync(parsed.data);
      toast.success("บันทึกสำเร็จ", { description: "ข้อมูลโปรไฟล์ของคุณถูกอัปเดตแล้ว" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    }
  };

  if (authLoading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">กำลังโหลด...</div>;
  }

  if (isError || !profile) {
    return <HttpErrorPage kind="500" homeTo="/portfolio" />;
  }

  return (
    <div className="min-h-screen bg-app-ambient">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <BackButton />
          <span className="text-sm font-medium text-foreground">ตั้งค่าบัญชี</span>
          <span className="w-12" />
        </div>
      </div>

      <div className="bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="max-w-3xl mx-auto px-4 pt-8 pb-6">
          <h1 className="text-3xl md:text-4xl font-medium text-foreground">
            ตั้งค่า<span className="text-primary">โปรไฟล์</span>ของคุณ
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">ปรับแต่งข้อมูลที่จะแสดงบนหน้าผลงานและคำขอจ้างงาน</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="max-w-3xl mx-auto px-4 pb-24 space-y-6">
        <TierMembershipCard />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          <StorageUsageSection />
          <AiUsageSettingsSection />
        </div>
        <div className="space-y-4">
          <LineNotificationSection />
          <EmailNotificationSection
            value={{
              notifyEmail: form.notifyEmail,
              notifyHire: form.notifyHire,
              notifyJobMatch: form.notifyJobMatch,
              preferredCategories: form.preferredCategories,
              preferredEmploymentTypes: form.preferredEmploymentTypes,
            }}
            onChange={update}
          />
        </div>

        <section className="rounded-2xl glass-panel p-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover ring-2 ring-primary/20" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-3xl font-medium text-primary-foreground">
                  {(form.displayName || "?")[0]}
                </div>
              )}
              <button
                type="button"
                disabled={avatarBusy}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full glass-panel flex items-center justify-center hover:bg-secondary disabled:opacity-60"
                aria-label="เปลี่ยนรูปโปรไฟล์"
                onClick={() => avatarInput.current?.click()}
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={avatarInput}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="อัปโหลดรูปโปรไฟล์"
                onChange={(e) => {
                  handleAvatarPick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{form.displayName || "ยังไม่ได้ตั้งชื่อ"}</p>
              <p className="text-sm text-muted-foreground">@{form.username || "username"}</p>
              <p className="text-xs text-primary mt-1">{form.role}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl glass-panel p-6 space-y-5">
          <SectionTitle icon={User} title="ข้อมูลส่วนตัว" />
          <Field label="ชื่อที่แสดง" value={form.displayName} onChange={(v) => update("displayName", v)} />
          <div>
            <label htmlFor="settings-username" className="text-sm font-medium text-foreground">
              ชื่อผู้ใช้ (username)
            </label>
            <div
              className={cn(
                "mt-1 flex items-center rounded-xl bg-secondary border border-border focus-within:ring-2 focus-within:ring-primary/40",
                (usernameTaken || usernameReserved || usernameInvalid) && "border-destructive focus-within:ring-destructive/40",
              )}
            >
              <span className="pl-3 text-muted-foreground text-sm">@</span>
              <input
                id="settings-username"
                type="text"
                value={form.username}
                onChange={(e) => update("username", e.target.value.toLowerCase())}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
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
          </div>
          {form.username.trim() && (
            <p className="text-xs text-muted-foreground -mt-2">
              ลิงก์โปรไฟล์สาธารณะ:{" "}
              <span className="text-primary font-medium">/@{normalizedUsername || form.username.trim().toLowerCase()}</span>
            </p>
          )}
          <Field label="ตำแหน่ง / สาขา" value={form.role ?? ""} onChange={(v) => update("role", v)} icon={BriefcaseIcon} />
          <Field label="เมือง / ที่อยู่" value={form.location ?? ""} onChange={(v) => update("location", v)} icon={MapPin} placeholder="กรุงเทพฯ, ประเทศไทย" />
          <div>
            <label htmlFor="settings-bio" className="text-sm font-medium text-foreground">แนะนำตัว</label>
            <textarea
              id="settings-bio"
              value={form.bio ?? ""}
              onChange={(e) => update("bio", e.target.value)}
              rows={4}
              maxLength={500}
              className="mt-1 w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
            <p className="mt-1 text-xs text-muted-foreground">{(form.bio ?? "").length}/500 ตัวอักษร</p>
          </div>
        </section>

        <SettingsPreferencesSection />

        {user && <ChangePasswordSection user={user} />}

        {isAdmin && (
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
        )}

        <section className="rounded-2xl glass-panel p-6 space-y-4">
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
      </form>
    </div>
  );
};

const SectionTitle = ({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) => (
  <div className="flex items-center gap-2"><Icon className="w-5 h-5 text-primary" /><h2 className="font-semibold text-foreground">{title}</h2></div>
);

interface FieldProps {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; prefix?: string; placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>; id?: string;
}
const Field = ({ label, value, onChange, type = "text", prefix, icon: Icon, placeholder, id }: FieldProps) => {
  const fieldId = id ?? `settings-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
  <div>
    <label htmlFor={fieldId} className="text-sm font-medium text-foreground">{label}</label>
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
