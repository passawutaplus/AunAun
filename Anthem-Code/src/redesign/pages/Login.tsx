import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { safeRelativePath } from "@/lib/oauthRedirect";
import {
  AuthFlowError,
  openRecoveryLink,
  resendSignupCode,
  sendPasswordReset,
  setNewPassword,
  signInWithEmail,
  signUpWithEmail,
  verifySignupCode,
} from "@/server/mutations/auth";
import { SC_LINKS } from "../routes";
import { AuthBox, CheckIcon, ClockIcon, MailIcon, PasswordInput, SsoButtons } from "../auth/AuthBox";
import { useResendTimer } from "../auth/useResendTimer";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/reset.css";

type Mode = "login" | "signup" | "verify" | "forgot" | "sent" | "checking" | "reset" | "resetDone" | "expired";

/** Heading (English) and line (Thai) of every step, from the mock; "verify" asks for the code (owner 2026-11-28). */
const HEAD: Record<Mode, [string, string]> = {
  login: ["Welcome back", "เข้าสู่ระบบบัญชี Samecor"],
  signup: ["Join Samecor", "สร้างบัญชี Samecor ไม่มีค่าใช้จ่าย"],
  verify: ["Verify your email", "กรอกรหัส 6 หลักจากอีเมล เพื่อเริ่มใช้งาน"],
  forgot: ["Reset password", "กรอกอีเมลที่ใช้สมัคร เพื่อรับลิงก์ตั้งรหัสผ่านใหม่"],
  sent: ["Check your email", "เปิดลิงก์ในอีเมลเพื่อตั้งรหัสผ่านใหม่"],
  checking: ["New password", "กำลังตรวจสอบลิงก์"],
  reset: ["New password", "ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ"],
  resetDone: ["Password updated", "ตั้งรหัสผ่านใหม่แล้ว"],
  expired: ["Link expired", "ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว"],
};

const MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_LEN = 6;

const errorText = (e: unknown): string => {
  const kind = e instanceof AuthFlowError ? e.kind : "other";
  if (kind === "bad_login") return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (kind === "rate_limited") return "ลองหลายครั้งเกินไป พักสักครู่แล้วลองใหม่";
  if (kind === "email_taken") return "อีเมลนี้มีบัญชีแล้ว เข้าสู่ระบบแทนได้เลย";
  if (kind === "bad_code") return "รหัสไม่ถูกต้องหรือหมดอายุ";
  if (kind === "weak_password") return "รหัสผ่านนี้คาดเดาง่ายเกินไป ลองรหัสอื่น";
  if (kind === "same_password") return "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม";
  return "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง";
};

/** `/auth` (login, ?tab=signup), `/auth/forgot`, `/reset-password` (link from the e-mail). */
export default function LoginPage() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const redirect = safeRelativePath(params.get("redirect"), SC_LINKS.home);
  const onReset = pathname.startsWith("/reset-password");

  const [mode, setMode] = useState<Mode>(() =>
    onReset ? "checking" : pathname.startsWith("/auth/forgot") ? "forgot" : params.get("tab") === "signup" ? "signup" : "login",
  );
  const [mail, setMail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [code, setCode] = useState("");
  const [eye, setEye] = useState(false);
  const [tried, setTried] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const resend = useResendTimer(60);

  useEffect(() => {
    if (!onReset) return;
    let live = true;
    void openRecoveryLink().then((ok) => {
      if (live) setMode(ok ? "reset" : "expired");
    });
    return () => {
      live = false;
    };
  }, [onReset]);

  const go = (m: Mode) => {
    setMode(m);
    setTried(false);
    setErr("");
    setPw("");
    setPw2("");
  };

  const close = () => {
    if (((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0) navigate(-1);
    else navigate(SC_LINKS.home, { replace: true });
  };

  // Signed in (also right after the code, Google, LINE or Apple): leave for where the visitor was going.
  // The welcome step (name + CATEGORY) shows over the page for new accounts (shell).
  if (!loading && user && !["checking", "reset", "resetDone", "expired"].includes(mode)) return <Navigate to={redirect} replace />;

  const mailOk = MAIL_RE.test(mail.trim());
  const mailBad = tried && !mailOk;
  const mailErr = !mail.trim() ? "กรุณากรอกอีเมล" : "รูปแบบอีเมลไม่ถูกต้อง";

  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      await task();
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const tryLogin = () => {
    setTried(true);
    if (!mailOk || !pw) return;
    void run(() => signInWithEmail(mail, pw));
  };

  const trySignup = () => {
    setTried(true);
    if (!mailOk || pw.length < 8) return;
    void run(async () => {
      const { signedIn } = await signUpWithEmail(mail, pw);
      if (!signedIn) {
        setCode("");
        resend.start();
        go("verify");
      }
    });
  };

  const tryCode = (value: string) => {
    if (value.length < CODE_LEN) return;
    void run(() => verifySignupCode(mail, value)).then(() => setCode(""));
  };

  const sendReset = () => {
    setTried(true);
    if (!mailOk) return;
    void run(async () => {
      await sendPasswordReset(mail);
      resend.start();
      go("sent");
    });
  };

  const tryReset = () => {
    setTried(true);
    if (pw.length < 8 || pw !== pw2) return;
    void run(async () => {
      await setNewPassword(pw);
      go("resetDone");
    });
  };

  const [heading, sub] = HEAD[mode];
  const mailField = (id: string, onEnter: () => void) => (
    <div className="lg-field">
      <label className="lg-pfl" htmlFor={id} data-bad={mailBad ? "" : undefined}>
        EMAIL
      </label>
      <input
        id={id}
        className="lg-pf"
        type="email"
        autoComplete="email"
        placeholder="you@email.com"
        value={mail}
        aria-invalid={mailBad || undefined}
        onChange={(e) => setMail(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter();
        }}
      />
    </div>
  );
  const errLine = (text: string) =>
    text ? (
      <p role="alert" className="lg-err">
        {text}
      </p>
    ) : null;
  const mainBtn = (label: string, onClick: () => void) => (
    <button type="button" className="lg-main" aria-busy={busy} onClick={onClick}>
      {label}
    </button>
  );
  const resendLink = (label: string, action: () => Promise<void>) => (
    <p className="lg-foot">
      ไม่ได้รับอีเมล?{" "}
      <button
        type="button"
        className="lg-ln"
        disabled={resend.left > 0}
        onClick={() =>
          void run(async () => {
            await action();
            resend.start();
          })
        }
      >
        {resend.left > 0 ? `${label}ได้ใน ${resend.left} วินาที` : label}
      </button>
    </p>
  );
  const backToLogin = (
    <p className="lg-foot">
      <button type="button" className="lg-ln" onClick={() => go("login")}>
        ← กลับไปเข้าสู่ระบบ
      </button>
    </p>
  );
  const pwLen = (value: string) => (value.length && value.length < 8 ? "" : undefined);

  return (
    <main className="sc-main lg-page">
      <AuthBox heading={heading} sub={sub} onClose={close}>
        {mode === "login" ? (
          <>
            <SsoButtons verb="Continue" redirectTo={redirect} onError={setErr} />
            <div className="lg-col">
              {mailField("lg-mail", tryLogin)}
              <div className="lg-field">
                <span className="lg-lab-row">
                  <label className="lg-pfl" htmlFor="lg-pw" data-bad={tried && !pw ? "" : undefined}>
                    PASSWORD
                  </label>
                  <button type="button" className="lg-ln lg-ln-quiet" onClick={() => go("forgot")}>
                    ลืมรหัสผ่าน?
                  </button>
                </span>
                <PasswordInput id="lg-pw" value={pw} onChange={setPw} onEnter={tryLogin} autoComplete="current-password" show={eye} onToggle={() => setEye((v) => !v)} invalid={tried && !pw} />
              </div>
              {errLine(tried && !mailOk ? mailErr : tried && !pw ? "กรุณากรอกรหัสผ่าน" : err)}
              {mainBtn("เข้าสู่ระบบ", tryLogin)}
            </div>
            <p className="lg-foot">
              ยังไม่มีบัญชี?{" "}
              <button type="button" className="lg-ln" onClick={() => go("signup")}>
                สมัคร
              </button>
            </p>
          </>
        ) : null}

        {mode === "signup" ? (
          <>
            <SsoButtons verb="Sign up" redirectTo={redirect} onError={setErr} />
            <div className="lg-col">
              {mailField("lg-smail", trySignup)}
              <div className="lg-field">
                <span className="lg-lab-row">
                  <label className="lg-pfl" htmlFor="lg-spw" data-bad={tried && pw.length < 8 ? "" : undefined}>
                    PASSWORD
                  </label>
                  <span className="lg-hint" data-bad={pwLen(pw)} data-ok={pw.length >= 8 ? "" : undefined}>
                    อย่างน้อย 8 ตัวอักษร
                  </span>
                </span>
                <PasswordInput id="lg-spw" value={pw} onChange={setPw} onEnter={trySignup} autoComplete="new-password" show={eye} onToggle={() => setEye((v) => !v)} invalid={tried && pw.length < 8} />
              </div>
              {errLine(tried && !mailOk ? mailErr : tried && pw.length < 8 ? "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" : err)}
              {mainBtn("สร้างบัญชี", trySignup)}
            </div>
            <p className="lg-note">
              การสมัครสมาชิกถือว่าท่านยอมรับ<Link to={SC_LINKS.terms}>ข้อกำหนดการใช้งาน</Link>และ<Link to={SC_LINKS.privacy}>นโยบายความเป็นส่วนตัว</Link>ของ Samecor
            </p>
            <p className="lg-foot">
              มีบัญชีแล้ว?{" "}
              <button type="button" className="lg-ln" onClick={() => go("login")}>
                เข้าสู่ระบบ
              </button>
            </p>
          </>
        ) : null}

        {mode === "verify" ? (
          <>
            <div role="status" className="lg-status">
              <MailIcon />
              <span>
                ส่งรหัสยืนยันไปที่ <b>{mail.trim()}</b> แล้ว
              </span>
            </div>
            <div className="lg-col">
              <div className="lg-field">
                <label className="lg-pfl" htmlFor="lg-code">
                  CODE
                </label>
                <input
                  id="lg-code"
                  className="lg-pf lg-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={CODE_LEN}
                  value={code}
                  aria-invalid={!!err || undefined}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, CODE_LEN);
                    setCode(v);
                    if (v.length === CODE_LEN) tryCode(v);
                  }}
                  autoFocus
                />
              </div>
              {errLine(err)}
              {mainBtn("ยืนยัน", () => tryCode(code))}
            </div>
            {resendLink("ส่งอีกครั้ง", () => resendSignupCode(mail))}
            <p className="lg-foot">
              <button type="button" className="lg-ln" onClick={() => go("signup")}>
                แก้ไขอีเมล
              </button>
            </p>
          </>
        ) : null}

        {mode === "forgot" ? (
          <>
            <div className="lg-col">
              {mailField("lg-fmail", sendReset)}
              {errLine(tried && !mailOk ? mailErr : err)}
              {mainBtn("ส่งลิงก์ตั้งรหัสผ่านใหม่", sendReset)}
            </div>
            {backToLogin}
          </>
        ) : null}

        {mode === "sent" ? (
          <>
            <div role="status" className="lg-status">
              <MailIcon />
              <span>
                หากมีบัญชีที่ใช้ <b>{mail.trim()}</b>
                <br />
                ระบบจะส่งลิงก์ไปให้ · ลิงก์มีอายุ 30 นาที ใช้ได้ครั้งเดียว
              </span>
            </div>
            {errLine(err)}
            {mainBtn("กลับไปเข้าสู่ระบบ", () => go("login"))}
            {resendLink("ส่งอีกครั้ง", () => sendPasswordReset(mail))}
          </>
        ) : null}

        {mode === "checking" ? <div className="lg-status" aria-busy="true" style={{ minHeight: 96 }} /> : null}

        {mode === "reset" ? (
          <div className="lg-col">
            <div className="lg-field">
              <span className="lg-lab-row">
                <label className="lg-pfl" htmlFor="lg-npw" data-bad={tried && pw.length < 8 ? "" : undefined}>
                  NEW PASSWORD
                </label>
                <span className="lg-hint" data-bad={pwLen(pw)} data-ok={pw.length >= 8 ? "" : undefined}>
                  อย่างน้อย 8 ตัวอักษร
                </span>
              </span>
              <PasswordInput id="lg-npw" value={pw} onChange={setPw} autoComplete="new-password" show={eye} onToggle={() => setEye((v) => !v)} invalid={tried && pw.length < 8} />
            </div>
            <div className="lg-field">
              <label className="lg-pfl" htmlFor="lg-npw2" data-bad={tried && pw.length >= 8 && pw !== pw2 ? "" : undefined}>
                CONFIRM PASSWORD
              </label>
              <input
                id="lg-npw2"
                className="lg-pf"
                type={eye ? "text" : "password"}
                autoComplete="new-password"
                value={pw2}
                aria-invalid={(tried && pw.length >= 8 && pw !== pw2) || undefined}
                onChange={(e) => setPw2(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") tryReset();
                }}
              />
            </div>
            {errLine(tried && pw.length < 8 ? "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" : tried && pw !== pw2 ? "รหัสผ่านไม่ตรงกัน" : err)}
            {mainBtn("ตั้งรหัสผ่านใหม่", tryReset)}
          </div>
        ) : null}

        {mode === "resetDone" ? (
          <>
            <div role="status" className="lg-status">
              <CheckIcon />
              <span>อุปกรณ์อื่นถูกออกจากระบบแล้ว</span>
            </div>
            {mainBtn("เริ่มใช้งาน", () => navigate(SC_LINKS.home, { replace: true }))}
          </>
        ) : null}

        {mode === "expired" ? (
          <>
            <div role="alert" className="lg-status">
              <ClockIcon />
              <span>กรุณาขอลิงก์ใหม่</span>
            </div>
            {mainBtn("ส่งลิงก์ใหม่", () => go("forgot"))}
            {backToLogin}
          </>
        ) : null}
      </AuthBox>
    </main>
  );
}
