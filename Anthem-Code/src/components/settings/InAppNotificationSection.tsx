import { useEffect, useState } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import {
  DEFAULT_IN_APP_NOTIFY_PREFS,
  IN_APP_NOTIFY_OPTIONS,
  loadInAppNotifyPrefs,
  saveInAppNotifyPrefs,
  type InAppNotifyKey,
} from "@/lib/inAppNotifyPrefs";
import {
  MUTE_DURATIONS_MS,
  loadNotifyDeliveryPrefs,
  notifyMuteRemainingLabel,
  saveNotifyDeliveryPrefs,
} from "@/lib/notifyDeliveryPrefs";
import { pushCloudPrefs } from "@/lib/settingsCloudPrefs";
import { SettingsCard, SettingsSwitch, useSaveStatus } from "@/components/settings/SettingsCard";

type EmailField = "notifyHire" | "notifyCollab" | "notifyJobMatch";

/** Email kinds the server actually honours (see _shared/enqueue-anthem-email.ts). */
const EMAIL_FOR: Partial<Record<InAppNotifyKey, EmailField>> = {
  hire: "notifyHire",
  collab: "notifyCollab",
};

type EmailState = { notifyEmail: boolean; notifyHire: boolean; notifyCollab: boolean; notifyJobMatch: boolean };

/** One table: kind × in-web bell × email. Everything saves as soon as it is switched. */
export function InAppNotificationSection() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const updateMut = useUpdateProfile(user?.id);
  const { status, track, saved } = useSaveStatus();
  const [prefs, setPrefs] = useState<Record<InAppNotifyKey, boolean>>(DEFAULT_IN_APP_NOTIFY_PREFS);
  const [email, setEmail] = useState<EmailState>({
    notifyEmail: true,
    notifyHire: true,
    notifyCollab: true,
    notifyJobMatch: true,
  });

  const [muteUntil, setMuteUntil] = useState<number | null>(null);

  useEffect(() => {
    setPrefs(loadInAppNotifyPrefs(user?.id));
    const until = loadNotifyDeliveryPrefs(user?.id).muteUntil;
    setMuteUntil(until && until > Date.now() ? until : null);
  }, [user?.id]);

  const setMute = (until: number | null) => {
    if (!user?.id) return;
    setMuteUntil(until);
    saveNotifyDeliveryPrefs(user.id, { ...loadNotifyDeliveryPrefs(user.id), muteUntil: until });
    saved();
  };

  useEffect(() => {
    if (!profile) return;
    const p = profile as { notify_email?: boolean; notify_hire?: boolean; notify_collab?: boolean; notify_job_match?: boolean };
    setEmail({
      notifyEmail: p.notify_email ?? true,
      notifyHire: p.notify_hire ?? true,
      notifyCollab: p.notify_collab ?? true,
      notifyJobMatch: p.notify_job_match ?? true,
    });
  }, [profile]);

  const setInApp = (key: InAppNotifyKey, value: boolean) => {
    if (!user?.id) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveInAppNotifyPrefs(user.id, next);
    void pushCloudPrefs(user.id, { inApp: next });
    saved();
  };

  const setEmailField = (key: keyof EmailState, value: boolean) => {
    const prev = email;
    setEmail({ ...prev, [key]: value });
    void track(
      updateMut.mutateAsync({ [key]: value }).catch((err) => {
        setEmail(prev);
        throw err;
      }),
    );
  };

  const emailOff = !email.notifyEmail;

  return (
    <SettingsCard
      icon={Bell}
      title="การแจ้งเตือน"
      status={status}
      description={
        <>
          เลือกว่าอยากรู้เรื่องไหน ทางกระดิ่งในเว็บหรืออีเมล ·{" "}
          <Link to="/notifications" className="inline-flex items-center gap-0.5 text-primary hover:underline">
            ดูกล่องแจ้งเตือน
            <ChevronRight className="h-3 w-3" />
          </Link>
        </>
      }
    >
      <div className="flex items-center justify-between gap-4 rounded-xl bg-secondary/50 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">รับอีเมลแจ้งเตือน</p>
          <p className="text-xs text-muted-foreground">อีเมลสำคัญ เช่น ยืนยันอีเมล หรือรีเซ็ตรหัสผ่าน ยังส่งถึงเสมอ</p>
        </div>
        <SettingsSwitch
          checked={email.notifyEmail}
          label="รับอีเมลแจ้งเตือน"
          onChange={(v) => setEmailField("notifyEmail", v)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">พักกระดิ่งชั่วคราว</p>
          <p className="text-xs text-muted-foreground">{notifyMuteRemainingLabel(muteUntil) ?? "เงียบจนครบเวลาที่เลือก"}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {muteUntil ? (
            <button
              type="button"
              onClick={() => setMute(null)}
              className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              เปิดเสียง
            </button>
          ) : (
            MUTE_DURATIONS_MS.map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => setMute(Date.now() + d.ms)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
              >
                {d.label}
              </button>
            ))
          )}
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] text-muted-foreground">
            <th className="py-2 pr-3 font-medium">เรื่อง</th>
            <th className="w-16 py-2 text-center font-medium">ในเว็บ</th>
            <th className="w-16 py-2 text-center font-medium">อีเมล</th>
          </tr>
        </thead>
        <tbody>
          {IN_APP_NOTIFY_OPTIONS.map((opt) => {
            const emailKey = EMAIL_FOR[opt.key];
            return (
              <tr key={opt.key} className="border-t border-border/50">
                <td className="py-2.5 pr-3">
                  <p className="font-medium text-foreground">{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground">{opt.description}</p>
                </td>
                <td className="text-center">
                  <div className="flex justify-center">
                    <SettingsSwitch
                      size="sm"
                      checked={prefs[opt.key]}
                      label={`${opt.label} ในเว็บ`}
                      onChange={(v) => setInApp(opt.key, v)}
                    />
                  </div>
                </td>
                <td className="text-center">
                  {emailKey ? (
                    <div className="flex justify-center">
                      <SettingsSwitch
                        size="sm"
                        checked={email[emailKey] && !emailOff}
                        disabled={emailOff}
                        label={`${opt.label} อีเมล`}
                        onChange={(v) => setEmailField(emailKey, v)}
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground" aria-label="ไม่มีอีเมล">
                      —
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-border/50">
            <td className="py-2.5 pr-3">
              <p className="font-medium text-foreground">งานที่ตรงสาย</p>
              <p className="text-[11px] text-muted-foreground">ประกาศงานที่ตรงกับสายงานของคุณ</p>
            </td>
            <td className="text-center">
              <span className="text-xs text-muted-foreground" aria-label="ไม่มีในเว็บ">
                —
              </span>
            </td>
            <td className="text-center">
              <div className="flex justify-center">
                <SettingsSwitch
                  size="sm"
                  checked={email.notifyJobMatch && !emailOff}
                  disabled={emailOff}
                  label="งานที่ตรงสาย อีเมล"
                  onChange={(v) => setEmailField("notifyJobMatch", v)}
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </SettingsCard>
  );
}
