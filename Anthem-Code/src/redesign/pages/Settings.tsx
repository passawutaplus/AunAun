import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { checkUsernameAvailability } from "@/hooks/useUsernameAvailability";
import { requestOpenCookiePreferences } from "@/lib/cookieConsent";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { PROFILE_PUBLIC_FIELDS, saveProfileVisibility, type ProfilePublicField } from "@/lib/profileVisibility";
import {
  disablePush,
  enablePush,
  getPushState,
  getRecommendationPushes,
  pushBlockedMessage,
  setRecommendationPushes,
  type PushState,
} from "@/lib/pushNotifications";
import {
  isSensitiveActionVerified,
  markSensitiveActionVerified,
  userHasEmailPassword,
  verifyEmailConfirmation,
  verifyUserPassword,
} from "@/lib/sensitiveActionAuth";
import { userFacingError } from "@/lib/userFacingError";
import {
  cancelAccountDeletion,
  changeHandle,
  requestAccountDeletion,
  requestEmailChange,
  resendEmailChange,
  sendPasswordLink,
  setMySetting,
  setVisibilitySwitch,
  signOutOtherDevices,
  unblockPerson,
} from "@/server/mutations/account";
import {
  DEFAULT_SETTINGS,
  getBlockedPeople,
  getMyAccount,
  getMyDeleteRequest,
  getMySessionCount,
  getMySettings,
  getMyVisibility,
  type MySettings,
} from "@/server/queries/account";
import { exportMyData } from "../lib/exportMyData";
import { SC_LINKS } from "../routes";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/reset.css";
import "../styles/settings.css";

const TABS = ["Account", "Notifications", "Privacy"] as const;
type Tab = (typeof TABS)[number];

const HANDLE_LOCK_DAYS = 30;
const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
/** "18 ธ.ค. 2026" (mock). */
const thDate = (d: Date) => `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mock rule: a–z 0–9 . _ and 3–30 characters; reserved and taken names come from the old checker. */
function handleFormatError(h: string): string {
  return /^[a-z0-9._]{3,30}$/.test(h) ? "" : "ใช้ได้เฉพาะ a–z 0–9 . _ (3–30 ตัว)";
}

const errMessage = (e: unknown) => String((e as { message?: string } | null)?.message ?? "");

/** Short message at the bottom of the page; `bad` = something failed. */
type Say = (text: string, bad?: boolean) => void;

/**
 * Tab from the address: `?tab=` (any case), the push button's `?mute=recommendations`, and the old site's
 * hashes that e-mail footers still use (`/settings#notifications`).
 */
function tabFromUrl(params: URLSearchParams, hash: string): Tab {
  const raw = (params.get("tab") ?? "").toLowerCase();
  const byParam = TABS.find((t) => t.toLowerCase() === raw);
  if (byParam) return byParam;
  if (params.get("mute") === "recommendations") return "Notifications";
  return TABS.find((t) => `#${t.toLowerCase()}` === hash.toLowerCase()) ?? "Account";
}

/**
 * How a sensitive step (delete account, download my data) is confirmed: the password, else the account's e-mail,
 * else — accounts with no e-mail (LINE sign-up) — the @handle.
 */
type ProofKind = "password" | "email" | "handle";

function proofKindOf(hasPassword: boolean, email: string): ProofKind {
  if (hasPassword && email) return "password";
  return email ? "email" : "handle";
}

async function checkProof(kind: ProofKind, typed: string, email: string, handle: string): Promise<void> {
  if (kind === "password") {
    await verifyUserPassword(email, typed);
    return;
  }
  if (kind === "email") {
    verifyEmailConfirmation(email, typed);
    return;
  }
  if (!handle || typed.trim().replace(/^@/, "").toLowerCase() !== handle.toLowerCase()) throw new Error("handle ไม่ตรงกับบัญชีนี้");
  markSensitiveActionVerified();
}

const PROOF_FALLBACK: Record<ProofKind, string> = {
  password: "รหัสผ่านไม่ถูกต้อง",
  email: "อีเมลไม่ตรงกับบัญชี",
  handle: "handle ไม่ตรงกับบัญชีนี้",
};

function ProofField({ kind, handle, value, error, onChange }: { kind: ProofKind; handle: string; value: string; error: string; onChange: (v: string) => void }) {
  return (
    <label className="st-rl st-proof">
      <span>{kind === "password" ? "ใส่รหัสผ่านเพื่อยืนยัน" : kind === "email" ? "พิมพ์อีเมลของบัญชีเพื่อยืนยัน" : `พิมพ์ @${handle} เพื่อยืนยัน`}</span>
      <input
        className="st-inp"
        type={kind === "password" ? "password" : kind === "email" ? "email" : "text"}
        autoComplete={kind === "password" ? "current-password" : "off"}
        autoCapitalize="off"
        spellCheck={false}
        placeholder={kind === "handle" && handle ? `@${handle}` : undefined}
        value={value}
        aria-invalid={!!error || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <span role="alert" data-bad="">
          {error}
        </span>
      ) : null}
    </label>
  );
}

/** `/settings` (mock: Settings.dc.html): Account, Notifications, Privacy. Plan is hidden with the Pro page. */
export default function SettingsPage() {
  const { user, loading } = useAuth();
  if (loading) return <main className="sc-main st-m" aria-busy="true" style={{ minHeight: "70vh" }} />;
  if (!user) return <Navigate to={`${SC_LINKS.login}?redirect=${encodeURIComponent(SC_LINKS.settings)}`} replace />;
  return <SettingsView />;
}

function SettingsView() {
  const { user } = useAuth();
  const uid = user!.id;
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [params, setParams] = useSearchParams();
  const tab = tabFromUrl(params, hash);
  const account = useQuery({ queryKey: ["sc-account", uid], queryFn: () => getMyAccount(uid), staleTime: 30_000 });
  const handle = account.data?.username ?? "";

  // Arrived from a hash or `?mute=` link: write the tab into `?tab=`, so it stays when those go away.
  useEffect(() => {
    if (tab === "Account" || params.get("tab")) return;
    const next = new URLSearchParams(params);
    next.set("tab", tab);
    navigate({ search: `?${next}`, hash: "" }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);

  const [toast, setToast] = useState<{ text: string; bad: boolean } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const say = useCallback<Say>((text, bad = true) => {
    window.clearTimeout(toastTimer.current);
    setToast({ text, bad });
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const goBack = () => {
    if (((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0) navigate(-1);
    else navigate(SC_LINKS.myProfile);
  };

  return (
    <main className="sc-main st-m">
      <div className="st-lay">
        <aside className="st-side" aria-label="ตั้งค่า">
          <span aria-hidden="true" className="st-av" style={account.data?.avatar_url ? { backgroundImage: `url(${JSON.stringify(proxiedImageUrl(account.data.avatar_url, 224))})` } : undefined} />
          <h1 lang="en">Settings</h1>
          {handle ? <p>@{handle}</p> : null}
        </aside>

        <div className="st-top">
          <button type="button" className="st-back" aria-label="ย้อนกลับ" onClick={goBack}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
          </button>
          <h1 lang="en">Settings</h1>
        </div>

        <section className="st-card" aria-label="ตั้งค่า">
          <nav className="st-tabs" aria-label="หมวดตั้งค่า">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                lang="en"
                aria-pressed={tab === t}
                onClick={() => {
                  const next = new URLSearchParams(params);
                  if (t === "Account") next.delete("tab");
                  else next.set("tab", t);
                  setParams(next, { replace: true });
                }}
              >
                {t}
              </button>
            ))}
          </nav>
          {tab === "Account" ? <AccountTab key={account.data ? "ready" : "wait"} handle={handle} changedAt={account.data?.username_changed_at ?? null} say={say} /> : null}
          {tab === "Notifications" ? <NotificationsTab say={say} /> : null}
          {tab === "Privacy" ? <PrivacyTab handle={handle} say={say} /> : null}
        </section>
      </div>
      {toast ? (
        <div className="st-toast" role={toast.bad ? "alert" : "status"} data-bad={toast.bad ? "" : undefined}>
          {toast.text}
        </div>
      ) : null}
    </main>
  );
}

function Row({ label, sub, subBad, htmlFor, children }: { label: string; sub?: ReactNode; subBad?: boolean; htmlFor?: string; children?: ReactNode }) {
  const Label = htmlFor ? "label" : "span";
  return (
    <div className="st-row">
      <Label className="st-rl" {...(htmlFor ? { htmlFor } : {})}>
        <b>{label}</b>
        {sub ? <span data-bad={subBad ? "" : undefined}>{sub}</span> : null}
      </Label>
      {children}
    </div>
  );
}

function AccountTab({ handle: savedHandle, changedAt, say }: { handle: string; changedAt: string | null; say: Say }) {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const email = user?.email ?? "";
  const pendingEmail = (user as { new_email?: string } | null)?.new_email ?? "";
  const hasPassword = userHasEmailPassword(user);
  const proofKind = proofKindOf(hasPassword, email);

  const lockEnds = changedAt ? new Date(new Date(changedAt).getTime() + HANDLE_LOCK_DAYS * 86_400_000) : null;
  const locked = !!lockEnds && lockEnds.getTime() > Date.now();

  const [h, setH] = useState(savedHandle);
  const [mail, setMail] = useState(email);
  const [hErr, setHErr] = useState("");
  const [mailErr, setMailErr] = useState("");
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);
  const [pwSent, setPwSent] = useState(false);
  const [vSent, setVSent] = useState(false);
  const [outOpen, setOutOpen] = useState(false);
  const [outDone, setOutDone] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delProof, setDelProof] = useState("");
  const [delErr, setDelErr] = useState("");
  const [busy, setBusy] = useState("");

  const sessions = useQuery({ queryKey: ["sc-sessions", uid], queryFn: getMySessionCount, staleTime: 60_000 });
  const delReq = useQuery({ queryKey: ["sc-delete-request", uid], queryFn: getMyDeleteRequest, staleTime: 30_000 });

  useEffect(() => setMail(email), [email]);

  const hClean = h.trim().replace(/^@/, "").toLowerCase();
  const hFormat = hClean === savedHandle ? "" : handleFormatError(hClean);
  const hShownErr = hFormat || hErr;
  const mailChanged = mail.trim().toLowerCase() !== email.toLowerCase();

  const save = async () => {
    setSaved("");
    setHErr("");
    setMailErr("");
    if (saving) return;
    const wantHandle = !locked && hClean !== savedHandle;
    if (wantHandle && hFormat) return;
    if (mailChanged && !MAIL_RE.test(mail.trim())) {
      setMailErr("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }
    if (!wantHandle && !mailChanged) {
      setSaved("บันทึกแล้ว");
      return;
    }
    setSaving(true);
    const notes: string[] = [];
    try {
      if (wantHandle) {
        const check = await checkUsernameAvailability(hClean, uid);
        if (!check.ok) {
          setHErr(check.reason === "taken" ? "มีผู้ใช้ชื่อนี้แล้ว" : check.message);
          return;
        }
        try {
          await changeHandle(uid, hClean);
          notes.push("บันทึกแล้ว");
          await qc.invalidateQueries({ queryKey: ["sc-account", uid] });
          void qc.invalidateQueries({ queryKey: ["profile", uid] });
        } catch (e) {
          setHErr(errMessage(e).includes("USERNAME_COOLDOWN") ? `เปลี่ยน handle ได้ทุก ${HANDLE_LOCK_DAYS} วัน` : errMessage(e).includes("duplicate") ? "มีผู้ใช้ชื่อนี้แล้ว" : "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
          return;
        }
      }
      if (mailChanged) {
        try {
          await requestEmailChange(mail);
          notes.push("ส่งลิงก์ยืนยันไปที่อีเมลใหม่แล้ว");
        } catch (e) {
          setMailErr(errMessage(e).toLowerCase().includes("already") ? "อีเมลนี้มีบัญชีอื่นใช้อยู่" : "เปลี่ยนอีเมลไม่สำเร็จ ลองใหม่อีกครั้ง");
        }
      }
      setSaved(notes.join(" · "));
    } finally {
      setSaving(false);
    }
  };

  const act = async (key: string, task: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try {
      await task();
    } finally {
      setBusy("");
    }
  };

  const deleteAccount = () =>
    act("del", async () => {
      setDelErr("");
      try {
        await checkProof(proofKind, delProof, email, savedHandle);
      } catch (e) {
        setDelErr(errMessage(e) || PROOF_FALLBACK[proofKind]);
        return;
      }
      try {
        await requestAccountDeletion();
        setDelOpen(false);
        setDelProof("");
        await qc.invalidateQueries({ queryKey: ["sc-delete-request", uid] });
      } catch {
        setDelErr("ส่งคำขอไม่สำเร็จ ลองใหม่อีกครั้ง");
      }
    });

  const purge = delReq.data?.status === "approved" && delReq.data.scheduled_purge_at ? thDate(new Date(delReq.data.scheduled_purge_at)) : null;

  return (
    <>
      <div>
        <Row
          label="Handle"
          htmlFor={locked ? undefined : "st-handle"}
          sub={hShownErr || `samecor.com/@${locked ? savedHandle : hClean || savedHandle}${locked && lockEnds ? ` · เปลี่ยนได้อีกครั้ง ${thDate(lockEnds)}` : ""}`}
          subBad={!!hShownErr}
        >
          {locked ? (
            <span className="st-inp st-inp-lock">@{savedHandle}</span>
          ) : (
            <span className="st-at">
              <span aria-hidden="true">@</span>
              <input
                id="st-handle"
                className="st-inp"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={h}
                aria-invalid={!!hShownErr || undefined}
                onChange={(e) => {
                  setH(e.target.value.replace(/^@/, "").toLowerCase());
                  setHErr("");
                  setSaved("");
                }}
              />
            </span>
          )}
        </Row>

        <Row label="อีเมล" htmlFor="st-mail" sub={mailErr || "ใช้เข้าสู่ระบบและรับแจ้งเตือน"} subBad={!!mailErr}>
          <input
            id="st-mail"
            className="st-inp"
            type="email"
            autoComplete="email"
            value={mail}
            aria-invalid={!!mailErr || undefined}
            onChange={(e) => {
              setMail(e.target.value);
              setMailErr("");
              setSaved("");
            }}
          />
        </Row>

        {pendingEmail ? (
          <Row label="ยืนยันอีเมลใหม่" sub={vSent ? "ส่งลิงก์ยืนยันแล้ว · ตรวจสอบอีเมล" : `รอยืนยัน ${pendingEmail}`} subBad={!vSent}>
            <button
              type="button"
              className="st-ln"
              aria-busy={busy === "verify"}
              onClick={() =>
                void act("verify", async () =>
                  resendEmailChange(pendingEmail)
                    .then(() => setVSent(true))
                    .catch(() => say("ส่งลิงก์ไม่สำเร็จ ลองใหม่อีกทีนะ")),
                )
              }
            >
              ส่งลิงก์ยืนยัน
            </button>
          </Row>
        ) : null}

        <Row
          label="รหัสผ่าน"
          sub={
            !email
              ? "บัญชีนี้ยังไม่มีอีเมล ใส่อีเมลก่อนจึงตั้งรหัสผ่านได้"
              : pwSent
                ? hasPassword
                  ? "ส่งลิงก์เปลี่ยนรหัสผ่านไปที่อีเมลแล้ว"
                  : "ส่งลิงก์ตั้งรหัสผ่านไปที่อีเมลแล้ว"
                : hasPassword
                  ? "ส่งลิงก์ไปที่อีเมล เพื่อตั้งรหัสผ่านใหม่"
                  : "เข้าสู่ระบบด้วย Google / LINE · ยังไม่มีรหัสผ่าน"
          }
        >
          <button
            type="button"
            className="st-ln"
            disabled={!email}
            aria-busy={busy === "pw"}
            onClick={() =>
              void act("pw", async () =>
                sendPasswordLink(email)
                  .then(() => setPwSent(true))
                  .catch(() => say("ส่งลิงก์ไม่สำเร็จ ลองใหม่อีกทีนะ")),
              )
            }
          >
            {hasPassword ? "เปลี่ยนรหัสผ่าน" : "ตั้งรหัสผ่าน"}
          </button>
        </Row>

        <Row
          label="อุปกรณ์ที่เข้าสู่ระบบ"
          sub={outDone ? "ออกจากอุปกรณ์อื่นแล้ว · เหลือเครื่องนี้" : sessions.data ? `${sessions.data} อุปกรณ์ · รวมเครื่องนี้` : "เครื่องนี้"}
        >
          <button type="button" className="st-ln" aria-expanded={outOpen} onClick={() => setOutOpen((v) => !v)}>
            ออกจากอุปกรณ์อื่น
          </button>
        </Row>
        {outOpen ? (
          <div className="st-confirm">
            <span className="st-rl">
              <b>ออกจากอุปกรณ์อื่นทั้งหมด?</b>
              <span>อุปกรณ์อื่นต้องเข้าสู่ระบบใหม่ · เครื่องนี้ยังใช้งานต่อได้</span>
            </span>
            <div className="st-confirm-btns">
              <button type="button" className="st-ln" onClick={() => setOutOpen(false)}>
                ยกเลิก
              </button>
              <button
                type="button"
                className="st-pri"
                aria-busy={busy === "out"}
                onClick={() =>
                  void act("out", async () => {
                    try {
                      await signOutOtherDevices();
                      setOutOpen(false);
                      setOutDone(true);
                    } catch {
                      say("ออกจากอุปกรณ์อื่นไม่สำเร็จ ลองใหม่อีกทีนะ");
                    }
                    void qc.invalidateQueries({ queryKey: ["sc-sessions", uid] });
                  })
                }
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="st-foot">
        {delReq.data ? (
          <span className="st-del-pending">
            {purge ? `ลบบัญชีถาวร ${purge}` : "ส่งคำขอลบบัญชีแล้ว"}
            <button
              type="button"
              className="st-ln"
              aria-busy={busy === "cancel"}
              onClick={() =>
                void act("cancel", async () => {
                  const cancelled = await cancelAccountDeletion().catch(() => false);
                  if (!cancelled) say("ยกเลิกคำขอไม่สำเร็จ ลองใหม่อีกทีนะ");
                  await qc.invalidateQueries({ queryKey: ["sc-delete-request", uid] });
                })
              }
            >
              ยกเลิกคำขอ
            </button>
          </span>
        ) : (
          <button type="button" className="st-del" aria-expanded={delOpen} onClick={() => setDelOpen((v) => !v)}>
            ลบบัญชี
          </button>
        )}
        <div className="st-save">
          <span role="status">{saved}</span>
          <button type="button" className="st-pri" aria-busy={saving} onClick={() => void save()}>
            บันทึก
          </button>
        </div>
      </div>

      {delOpen && !delReq.data ? (
        <div className="st-confirm st-confirm-del">
          <span className="st-rl">
            <b>ลบบัญชีถาวร?</b>
            <span>ทีมงานจะซ่อนโปรไฟล์และผลงานภายใน 7 วันทำการ แล้วลบถาวรหลัง 30 วัน · ยกเลิกได้ก่อนถึงวันนั้น</span>
          </span>
          <ProofField
            kind={proofKind}
            handle={savedHandle}
            value={delProof}
            error={delErr}
            onChange={(v) => {
              setDelProof(v);
              setDelErr("");
            }}
          />
          <div className="st-confirm-btns">
            <button type="button" className="st-ln" onClick={() => setDelOpen(false)}>
              ยกเลิก
            </button>
            <button type="button" className="st-pri st-pri-red" aria-busy={busy === "del"} disabled={!delProof.trim()} onClick={() => void deleteAccount()}>
              ลบบัญชี
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Switch({ label, on, disabled, onToggle }: { label: string; on: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="st-sw" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onToggle}>
      <i />
    </button>
  );
}

type SwitchKey = "chat" | "comment" | "follow" | "event" | "weekly";

/**
 * Mock rows. "อีเมลสรุปรายสัปดาห์" = the weekly-digest edge function (Mondays 09:00), off by default like the
 * mock; the row shows once its SQL (20261129120000) has run.
 */
const NOTI_ROWS: Array<[SwitchKey, string, string]> = [
  ["chat", "ข้อความใหม่", "มีคนทักทายหรือตอบแชท"],
  ["comment", "คอมเมนต์", "มีคนคอมเมนต์บนงานของฉัน"],
  ["follow", "ผู้ติดตามใหม่", "มีคนกดติดตาม"],
  ["event", "Open call ใกล้ปิดรับ", "งานที่กดสนใจไว้ เหลือ 3 วัน"],
  ["weekly", "อีเมลสรุปรายสัปดาห์", "ส่งทุกวันจันทร์"],
];

/** Settings shared by the Notifications and Privacy tabs, saved one switch at a time (optimistic). */
function useMySettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["sc-settings", user?.id];
  const q = useQuery({ queryKey: key, queryFn: getMySettings, staleTime: 60_000 });
  const [err, setErr] = useState("");
  const set = async <K extends keyof MySettings>(k: K, v: MySettings[K]) => {
    const before = qc.getQueryData<MySettings & { ready: boolean; weeklyReady: boolean }>(key);
    qc.setQueryData(key, { ...(before ?? { ...DEFAULT_SETTINGS, ready: false, weeklyReady: false }), [k]: v });
    setErr("");
    try {
      await setMySetting(k, v as never);
    } catch {
      qc.setQueryData(key, before);
      setErr("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  };
  return { settings: q.data ?? { ...DEFAULT_SETTINGS, ready: false, weeklyReady: false }, set, err };
}

/** Push on this device (web push, or APNs / FCM inside the store apps — lib/pushNotifications). Old PushNotificationSection. */
function usePushState(say: Say) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void getPushState()
      .then((s) => alive && setState(s))
      .catch(() => alive && setState("unsupported"));
    return () => {
      alive = false;
    };
  }, []);

  const set = async (on: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const next = on ? await enablePush() : await disablePush();
      setState(next);
      if (on && next === "on") say("เปิดแจ้งเตือนแล้ว", false);
      if (on && next === "denied") say(pushBlockedMessage());
    } catch (e) {
      say(userFacingError(e, "เปิดแจ้งเตือนไม่สำเร็จ ลองใหม่อีกทีนะ"));
    } finally {
      setBusy(false);
    }
  };

  return { state, busy, set };
}

/** Recommendation pushes for the account; the push's own button opens `?mute=recommendations`, which turns them off. */
function useRecommendationPushes(say: Say) {
  const [, setParams] = useSearchParams();
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const set = async (next: boolean) => {
    setBusy(true);
    try {
      await setRecommendationPushes(next);
      setOn(next);
      say(next ? "เปิดแจ้งเตือนแนะนำผลงานแล้ว" : "ปิดแจ้งเตือนแนะนำผลงานแล้ว", false);
    } catch (e) {
      say(userFacingError(e, "บันทึกไม่สำเร็จ ลองใหม่อีกทีนะ"));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let alive = true;
    void getRecommendationPushes().then((value) => {
      if (!alive) return;
      setOn(value);
      // The address as it is now (the tab may have been written into it meanwhile).
      const url = new URLSearchParams(window.location.search);
      if (value !== null && url.get("mute") === "recommendations") {
        url.delete("mute");
        setParams(url, { replace: true });
        if (value) void set(false);
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once on open
  }, []);

  return { on, busy, set };
}

function NotificationsTab({ say }: { say: Say }) {
  const { settings, set, err } = useMySettings();
  const push = usePushState(say);
  const recs = useRecommendationPushes(say);
  const pushShown = push.state === "on" || push.state === "off" || push.state === "denied";
  return (
    <div>
      {pushShown ? (
        <Row
          label="แจ้งเตือนบนเครื่องนี้"
          sub={push.state === "denied" ? pushBlockedMessage() : "เด้งบอกทันทีเมื่อมีคนทัก ติดตาม หรือถูกใจงาน"}
          subBad={push.state === "denied"}
        >
          <Switch label="แจ้งเตือนบนเครื่องนี้" on={push.state === "on"} disabled={push.busy || push.state === "denied"} onToggle={() => void push.set(push.state !== "on")} />
        </Row>
      ) : null}
      {pushShown && recs.on !== null ? (
        <Row label="แนะนำผลงาน" sub="งานใหม่จากคนที่ติดตาม · ไม่เกินวันละครั้ง">
          <Switch label="แนะนำผลงาน" on={recs.on} disabled={recs.busy} onToggle={() => void recs.set(!recs.on)} />
        </Row>
      ) : null}
      {NOTI_ROWS.filter(([k]) => k !== "weekly" || settings.weeklyReady).map(([k, label, sub]) => (
        <Row key={k} label={label} sub={sub}>
          <Switch label={label} on={settings[k]} onToggle={() => void set(k, !settings[k])} />
        </Row>
      ))}
      {err ? (
        <p role="alert" className="st-err">
          {err}
        </p>
      ) : null}
    </div>
  );
}

const GREET_OPTIONS = [
  ["everyone", "ทุกคน"],
  ["following", "คนที่ฉันติดตาม"],
] as const;

/** "ดาวน์โหลดข้อมูลของฉัน" (PDPA): confirmed like the old site (password / e-mail / @handle; skipped for 10 minutes after). */
function useExportMyData(handle: string, say: Say) {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const kind = proofKindOf(userHasEmailPassword(user), email);
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (withProof: boolean) => {
    if (busy || !user) return;
    setBusy(true);
    setErr("");
    try {
      if (withProof) {
        try {
          await checkProof(kind, proof, email, handle);
        } catch (e) {
          setErr(errMessage(e) || PROOF_FALLBACK[kind]);
          return;
        }
      }
      try {
        await exportMyData(user);
        setOpen(false);
        setProof("");
        say("ดาวน์โหลดไฟล์แล้ว", false);
      } catch {
        say("ดาวน์โหลดไม่สำเร็จ ลองใหม่อีกทีนะ");
      }
    } finally {
      setBusy(false);
    }
  };

  const start = () => {
    if (isSensitiveActionVerified()) void run(false);
    else setOpen((v) => !v);
  };

  return { kind, open, setOpen, proof, setProof, err, setErr, busy, start, confirm: () => void run(true) };
}

type VisKey = "creators" | "search" | ProfilePublicField;

function PrivacyTab({ handle, say }: { handle: string; say: Say }) {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const { settings, set, err } = useMySettings();
  const dl = useExportMyData(handle, say);
  const vis = useQuery({ queryKey: ["sc-visibility", uid], queryFn: () => getMyVisibility(uid), staleTime: 60_000 });
  const blocked = useQuery({ queryKey: ["sc-blocked", uid], queryFn: () => getBlockedPeople(uid), staleTime: 60_000 });
  const [blockOpen, setBlockOpen] = useState(false);
  const [visErr, setVisErr] = useState("");
  const pv = vis.data ?? {};
  // Every key is on unless saved as false (same default as lib/profileVisibility).
  const isOn = (k: VisKey) => pv[k] !== false;

  const toggleVis = async (k: VisKey) => {
    const before = vis.data;
    const on = !isOn(k);
    const next = { ...(before ?? {}), [k]: on };
    qc.setQueryData(["sc-visibility", uid], next);
    setVisErr("");
    try {
      await setVisibilitySwitch(uid, k, on);
      if (k === "creators" || k === "search") void qc.invalidateQueries({ queryKey: ["sc-creators"] });
      else {
        // The old site's copy for this browser (its fallback), and the profile pages that read it.
        saveProfileVisibility(uid, Object.fromEntries(PROFILE_PUBLIC_FIELDS.map((f) => [f.key, next[f.key] !== false])) as Record<ProfilePublicField, boolean>);
        void qc.invalidateQueries({ queryKey: ["sc-my-profile", uid] });
        void qc.invalidateQueries({ queryKey: ["sc-profile"] });
        void qc.invalidateQueries({ queryKey: ["profile", uid] });
      }
    } catch {
      qc.setQueryData(["sc-visibility", uid], before);
      setVisErr("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  };

  const unblock = async (id: string) => {
    try {
      await unblockPerson(uid, id);
    } finally {
      void qc.invalidateQueries({ queryKey: ["sc-blocked", uid] });
      void qc.invalidateQueries({ queryKey: ["blocked-user-ids"] });
    }
  };

  const people = blocked.data ?? [];
  return (
    <div>
      <Row label="ใครทักทายฉันได้" sub="ข้อความแรกในแชท">
        <div className="st-seg" role="group" aria-label="ใครทักทายฉันได้">
          {GREET_OPTIONS.map(([v, label]) => (
            <button key={v} type="button" aria-pressed={settings.greet_from === v} onClick={() => void set("greet_from", v)}>
              {label}
            </button>
          ))}
        </div>
      </Row>
      <Row label="โชว์โปรไฟล์ในหน้า Creators" sub="ปิดแล้วคนยังเข้าโปรไฟล์ได้จากลิงก์">
        <Switch label="โชว์โปรไฟล์ในหน้า Creators" on={isOn("creators")} onToggle={() => void toggleVis("creators")} />
      </Row>
      <Row label="ให้ค้นเจอจาก Google" sub="โปรไฟล์และผลงานที่เปิดสาธารณะ">
        <Switch label="ให้ค้นเจอจาก Google" on={isOn("search")} onToggle={() => void toggleVis("search")} />
      </Row>
      <Row label="คนที่บล็อกไว้" sub={`${people.length} คน`}>
        <button type="button" className="st-ln" aria-expanded={blockOpen} disabled={!people.length} onClick={() => setBlockOpen((v) => !v)}>
          {blockOpen ? "ซ่อน" : "ดูรายชื่อ"}
        </button>
      </Row>
      {blockOpen
        ? people.map((b) => (
            <div key={b.user_id} className="st-row st-blocked">
              <span className="st-person">
                <span aria-hidden="true" style={b.avatar_url ? { backgroundImage: `url(${JSON.stringify(proxiedImageUrl(b.avatar_url, 72))})` } : undefined} />
                {b.name}
              </span>
              <button type="button" className="st-ln st-ln-sm" onClick={() => void unblock(b.user_id)}>
                เลิกบล็อก
              </button>
            </div>
          ))
        : null}
      <Row label="ดาวน์โหลดข้อมูลของฉัน" sub="ไฟล์ JSON ข้อมูลบัญชีของคุณ">
        <button type="button" className="st-ln" aria-expanded={dl.open} aria-busy={dl.busy && !dl.open} onClick={dl.start}>
          ดาวน์โหลด
        </button>
      </Row>
      {dl.open ? (
        <div className="st-confirm">
          <ProofField
            kind={dl.kind}
            handle={handle}
            value={dl.proof}
            error={dl.err}
            onChange={(v) => {
              dl.setProof(v);
              dl.setErr("");
            }}
          />
          <div className="st-confirm-btns">
            <button type="button" className="st-ln" onClick={() => dl.setOpen(false)}>
              ยกเลิก
            </button>
            <button type="button" className="st-pri" aria-busy={dl.busy} disabled={!dl.proof.trim()} onClick={dl.confirm}>
              ดาวน์โหลด
            </button>
          </div>
        </div>
      ) : null}
      <Row label="คุกกี้" sub="เลือกว่าจะให้เว็บเก็บอะไรในเครื่องนี้">
        <button type="button" className="st-ln" aria-haspopup="dialog" onClick={() => requestOpenCookiePreferences()}>
          ตั้งค่าคุกกี้
        </button>
      </Row>

      {/* Old ProfileVisibilitySection: the same public_visibility keys, which the profile pages respect. */}
      <div className="st-group">
        <h2>ใครเห็นอะไรบนโปรไฟล์</h2>
        <Link to={handle ? `/@${handle}` : `/u/${uid}`} target="_blank" rel="noopener" className="st-group-ln">
          ดูแบบคนอื่นเห็น
        </Link>
      </div>
      {PROFILE_PUBLIC_FIELDS.map((f) => (
        <Row key={f.key} label={f.label} sub={isOn(f.key) ? "ทุกคนเห็น" : "ซ่อนอยู่"}>
          <Switch label={`โชว์${f.label}บนโปรไฟล์`} on={isOn(f.key)} onToggle={() => void toggleVis(f.key)} />
        </Row>
      ))}
      {err || visErr ? (
        <p role="alert" className="st-err">
          {err || visErr}
        </p>
      ) : null}
    </div>
  );
}
