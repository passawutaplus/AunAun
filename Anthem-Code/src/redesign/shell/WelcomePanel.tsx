import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { saveWelcome } from "@/server/mutations/account";
import { SC_CATEGORIES } from "../lib/categories";
import { SC_LINKS } from "../routes";
import { AuthBox } from "../auth/AuthBox";

type Props = {
  userId: string;
  /** Name the account came with (Google / LINE / Apple name, or the e-mail name); the field starts with it. */
  initialName: string;
  onClose: () => void;
};

/**
 * Sign-up step 2 (mock Login "profile"): name + CATEGORY (optional), then the home page. Shown over the page for
 * an account that has not finished its first-login setup — after the e-mail code, Google, LINE or Apple.
 */
export default function WelcomePanel({ userId, initialName, onClose }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState(initialName);
  const [cats, setCats] = useState<string[]>([]);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const nameOk = !!name.trim();

  const start = async () => {
    setTried(true);
    if (!nameOk || busy) return;
    setBusy(true);
    setErr("");
    try {
      await saveWelcome(userId, name, cats);
      await qc.invalidateQueries({ queryKey: ["sc-onboarding", userId] });
      void qc.invalidateQueries({ queryKey: ["profile", userId] });
      onClose();
    } catch {
      setErr("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthBox heading="Nice to meet you" sub="ตั้งชื่อสำหรับโปรไฟล์ของคุณ" onClose={onClose}>
      <div className="lg-col">
        <div className="lg-field">
          <label className="lg-pfl" htmlFor="lg-name" data-bad={tried && !nameOk ? "" : undefined}>
            NAME
          </label>
          <input
            id="lg-name"
            className="lg-pf"
            type="text"
            autoComplete="name"
            maxLength={80}
            placeholder="ชื่อที่แสดงบนโปรไฟล์"
            value={name}
            aria-invalid={(tried && !nameOk) || undefined}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void start();
            }}
          />
        </div>
        <div role="group" aria-labelledby="lg-flab" className="lg-field">
          <span className="lg-lab-row">
            <span id="lg-flab" className="lg-pfl" lang="en">
              CATEGORY
            </span>
            <span className="lg-hint">ไม่บังคับ</span>
          </span>
          <div className="lg-chips">
            {SC_CATEGORIES.map((c) => {
              const on = cats.includes(c);
              return (
                <button key={c} type="button" className="lg-chip" lang="en" aria-pressed={on} onClick={() => setCats((s) => (on ? s.filter((x) => x !== c) : [...s, c]))}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>
        {tried && !nameOk ? (
          <p role="alert" className="lg-err">
            กรุณากรอกชื่อ
          </p>
        ) : err ? (
          <p role="alert" className="lg-err">
            {err}
          </p>
        ) : null}
        <button type="button" className="lg-main" aria-busy={busy} onClick={() => void start()}>
          เริ่มใช้งาน
        </button>
      </div>
      <p className="lg-note">
        การสมัครสมาชิกถือว่าท่านยอมรับ<Link to={SC_LINKS.terms}>ข้อกำหนดการใช้งาน</Link>และ<Link to={SC_LINKS.privacy}>นโยบายความเป็นส่วนตัว</Link>ของ Samecor
      </p>
    </AuthBox>
  );
}
