import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { checkUsernameAvailability } from "@/hooks/useUsernameAvailability";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { markSensitiveActionVerified, userHasEmailPassword, verifyEmailConfirmation, verifyUserPassword } from "@/lib/sensitiveActionAuth";
import {
  cancelAccountDeletion,
  changeHandle,
  requestAccountDeletion,
  requestEmailChange,
  resendEmailChange,
  sendPasswordLink,
  signOutOtherDevices,
} from "@/server/mutations/account";
import { getMyAccount, getMyDeleteRequest, getMySessionCount } from "@/server/queries/account";
import { SC_LINKS } from "../routes";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/reset.css";
import "../styles/settings.css";

const TABS = ["Account"] as const;
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

/** `/settings` (mock: Settings.dc.html). Account now; Notifications and Privacy arrive with their switches. */
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
  const [params, setParams] = useSearchParams();
  const asked = params.get("tab") as Tab | null;
  const tab: Tab = asked && TABS.includes(asked) ? asked : "Account";
  const account = useQuery({ queryKey: ["sc-account", uid], queryFn: () => getMyAccount(uid), staleTime: 30_000 });
  const handle = account.data?.username ?? "";

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
          {tab === "Account" ? <AccountTab key={account.data ? "ready" : "wait"} handle={handle} changedAt={account.data?.username_changed_at ?? null} /> : null}
        </section>
      </div>
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

function AccountTab({ handle: savedHandle, changedAt }: { handle: string; changedAt: string | null }) {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();
  const email = user?.email ?? "";
  const pendingEmail = (user as { new_email?: string } | null)?.new_email ?? "";
  const hasPassword = userHasEmailPassword(user);

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
        if (hasPassword) await verifyUserPassword(email, delProof);
        else verifyEmailConfirmation(email, delProof);
        markSensitiveActionVerified();
      } catch (e) {
        setDelErr(errMessage(e) || (hasPassword ? "รหัสผ่านไม่ถูกต้อง" : "อีเมลไม่ตรงกับบัญชี"));
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
            <button type="button" className="st-ln" aria-busy={busy === "verify"} onClick={() => void act("verify", async () => resendEmailChange(pendingEmail).then(() => setVSent(true)).catch(() => undefined))}>
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
            onClick={() => void act("pw", async () => sendPasswordLink(email).then(() => setPwSent(true)).catch(() => undefined))}
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
                    await signOutOtherDevices().catch(() => undefined);
                    setOutOpen(false);
                    setOutDone(true);
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
                  await cancelAccountDeletion().catch(() => false);
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
          <label className="st-rl st-proof">
            <span>{hasPassword ? "ใส่รหัสผ่านเพื่อยืนยัน" : "พิมพ์อีเมลของบัญชีเพื่อยืนยัน"}</span>
            <input
              className="st-inp"
              type={hasPassword ? "password" : "email"}
              autoComplete={hasPassword ? "current-password" : "off"}
              value={delProof}
              aria-invalid={!!delErr || undefined}
              onChange={(e) => {
                setDelProof(e.target.value);
                setDelErr("");
              }}
            />
            {delErr ? (
              <span role="alert" data-bad="">
                {delErr}
              </span>
            ) : null}
          </label>
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
