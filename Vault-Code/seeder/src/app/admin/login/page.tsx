import { signInWithGoogle, signInWithPassword } from "./actions";

const ERRORS: Record<string, string> = {
  missing: "กรอกอีเมลและรหัสผ่าน",
  invalid: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  oauth: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ",
  callback: "ลิงก์เข้าสู่ระบบหมดอายุ ลองอีกครั้ง",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login">
      <h1>Vault Seeder</h1>
      <p className="muted">สำหรับผู้ดูแลระบบเท่านั้น</p>
      {error && <p className="error">{ERRORS[error] ?? "เข้าสู่ระบบไม่สำเร็จ"}</p>}
      <form action={signInWithGoogle}>
        <button type="submit" className="primary wide">
          เข้าสู่ระบบด้วย Google
        </button>
      </form>
      <form action={signInWithPassword} className="stack">
        <label>
          อีเมล
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          รหัสผ่าน
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit" className="wide">
          เข้าสู่ระบบด้วยอีเมล
        </button>
      </form>
    </main>
  );
}
