import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { AppleIcon, FacebookIcon } from "@/components/auth/ProviderIcons";
import { openOAuthPopup, signInWithApple, signInWithOAuth, type OAuthProviderId } from "@/integrations/oauth";
import { isWebViewApp } from "@/lib/appShell";
import { signInProviders } from "@/lib/authProviders";
import { hasShellFeature } from "@/lib/nativeShell";
import logoUrl from "../assets/logo.svg";
import { onEscape } from "../shell/panels";
import "../styles/login.css";

type BoxProps = {
  heading: string;
  sub: string;
  onClose?: () => void;
  children: ReactNode;
};

/** The centre box of Login.dc.html: logo, English heading, Thai line, then the step. */
export function AuthBox({ heading, sub, onClose, children }: BoxProps) {
  useEffect(() => (onClose ? onEscape(onClose) : undefined), [onClose]);
  return (
    <div className="lg-wrap">
      <div className="pv-veil" aria-hidden="true" onClick={onClose} />
      <div className="pv-box lg-box" role="dialog" aria-modal="true" aria-labelledby="sc-lg-h">
        {onClose ? (
          <button type="button" aria-label="ปิด" className="lg-x" onClick={onClose}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        ) : null}
        <div className="lg-hd">
          <img src={logoUrl} alt="samecor." />
          <h2 id="sc-lg-h" lang="en">
            {heading}
          </h2>
          <p>{sub}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

/* Brand marks from the mock (23 พ.ย.): Google "G" in four colours, LINE in #06C755. */
const GoogleMark = () => (
  <svg aria-hidden="true" viewBox="0 0 256 262">
    <path fill="#4285f4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" />
    <path fill="#34a853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" />
    <path fill="#fbbc05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z" />
    <path fill="#eb4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" />
  </svg>
);

const LineMark = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="#06C755">
    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
  </svg>
);

const MARK: Record<string, ComponentType> = { google: GoogleMark, line: LineMark, facebook: FacebookIcon, apple: AppleIcon };

/**
 * Google, LINE, Facebook and Apple (owner 2026-11-28), each shown once it is set up (VITE_AUTH_EXTRA_PROVIDERS).
 * Order of the mock: Google first, then LINE, Facebook, Apple; inside the iOS app Apple's native sheet comes first
 * (App Review 4.8). Old app builds that cannot open sign-in in the phone's browser get none (Google refuses
 * embedded web views).
 */
export function SsoButtons({ verb, redirectTo, onError }: { verb: "Continue" | "Sign up"; redirectTo: string; onError: (text: string) => void }) {
  const [busy, setBusy] = useState<OAuthProviderId | null>(null);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  if (isWebViewApp() && !hasShellFeature("auth")) return null;
  const nativeApple = hasShellFeature("apple");
  const ORDER = nativeApple ? ["apple", "google", "line", "facebook"] : ["google", "line", "facebook", "apple"];
  const providers = signInProviders(nativeApple).sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));

  const start = async (id: OAuthProviderId, name: string) => {
    if (busy) return;
    setBusy(id);
    // The popup must open inside the click, before any await, or the browser blocks it.
    const popup = id === "apple" && nativeApple ? null : openOAuthPopup();
    try {
      const res = id === "apple" && nativeApple ? await signInWithApple({ redirectTo }) : await signInWithOAuth({ redirectTo, popup, provider: id });
      if (res.error) onError(`เข้าสู่ระบบด้วย ${name} ไม่สำเร็จ ลองใหม่อีกครั้ง`);
    } finally {
      if (alive.current) setBusy(null);
    }
  };

  return (
    <>
      <div className="lg-sso-list">
        {providers.map((p) => {
          const Mark = MARK[p.key];
          return (
            <button key={p.key} type="button" className="lg-sso" aria-busy={busy === p.id} onClick={() => void start(p.id, p.name)}>
              <Mark />
              <span lang="en">{`${verb} with ${p.name}`}</span>
            </button>
          );
        })}
      </div>
      {providers.some((p) => p.key === "line") ? (
        // LINE's e-mail permission requires saying why the address is asked for.
        <p className="lg-note">เข้าสู่ระบบด้วย LINE เราขออีเมลของคุณ เพื่อสร้างบัญชีและแจ้งเรื่องบัญชีเท่านั้น</p>
      ) : null}
      <div className="lg-or" aria-hidden="true">
        หรือใช้อีเมล
      </div>
    </>
  );
}

/** Password field with the mock's eye button. */
export function PasswordInput({
  id,
  value,
  onChange,
  onEnter,
  autoComplete,
  show,
  onToggle,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  autoComplete: string;
  show: boolean;
  onToggle: () => void;
  invalid?: boolean;
}) {
  return (
    <div className="lg-pw">
      <input
        id={id}
        className="lg-pf"
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) onEnter();
        }}
      />
      <button type="button" className="lg-eye" aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={show} onClick={onToggle}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
          <circle cx="12" cy="12" r="2.5" />
          {show ? null : <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  );
}

export const MailIcon = () => (
  <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
    <path d="M4 6.5l8 6 8-6" />
  </svg>
);

export const CheckIcon = () => (
  <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8 12.5l2.8 2.8L16 9.8" />
  </svg>
);

export const ClockIcon = () => (
  <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);
