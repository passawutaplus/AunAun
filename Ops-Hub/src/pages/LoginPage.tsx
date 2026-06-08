import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { useHubAuth } from "@/hooks/useHubAuth";

export default function LoginPage() {
  const { signIn } = useHubAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex -space-x-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white">S1</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-an1hem text-sm font-bold text-white">a1</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold">So1o Ops Hub</h1>
            <p className="text-xs text-muted">hq.solofreelancer.com · Admin only</p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-lg bg-brand-soft/60 px-3 py-2 text-xs text-muted">
          <ShieldCheck className="h-4 w-4 text-brand" />
          ต้องมี role <strong className="text-ink">admin</strong> ใน user_roles
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium">อีเมล</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">รหัสผ่าน</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
              autoComplete="current-password"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    </div>
  );
}
