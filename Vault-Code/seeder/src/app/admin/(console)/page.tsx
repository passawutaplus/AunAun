import Link from "next/link";
import { fmtBytes, safeRpc } from "@/lib/admin-rpc";
import { SupabaseSeederRepo } from "@/seeder/repo";

type Overview = Record<string, number | string | null>;
type Day = { day: string; signups: number; items: number; captures: number };

function Spark({ days, k, label }: { days: Day[]; k: "signups" | "items" | "captures"; label: string }) {
  const max = Math.max(1, ...days.map((d) => d[k]));
  const total = days.reduce((s, d) => s + d[k], 0);
  return (
    <div className="panel">
      <h2>
        {label} <small className="muted">รวม {total.toLocaleString()} ใน {days.length} วัน</small>
      </h2>
      <div className="spark" role="img" aria-label={label}>
        {days.map((d) => (
          <span key={d.day} title={`${d.day}: ${d[k]}`} style={{ height: `${Math.max(4, (d[k] / max) * 100)}%` }} />
        ))}
      </div>
    </div>
  );
}

export default async function OverviewPage() {
  const [ov, att, act] = await Promise.all([
    safeRpc<Overview>("vault_admin_overview", {}, {}),
    safeRpc<Record<string, number>>("vault_admin_attention", {}, {}),
    safeRpc<Day[]>("vault_admin_activity", { p_days: 14 }, []),
  ]);
  let paused: boolean | null = null;
  let published = 0;
  let pending = 0;
  try {
    const repo = new SupabaseSeederRepo();
    const [p, progress] = await Promise.all([repo.isPaused(), repo.progress()]);
    paused = p;
    published = progress.reduce((s, r) => s + r.published, 0);
    pending = progress.reduce((s, r) => s + r.pending, 0);
  } catch {
    /* seeder tables not reachable: leave the card empty */
  }

  const n = (v: unknown) => Number(v ?? 0).toLocaleString();
  const a = att.data;
  const o = ov.data;
  const todo = [
    { n: a.open_reports ?? 0, label: "รายงานรอตรวจ", href: "/admin/reports" },
    { n: a.new_feedback ?? 0, label: "Feedback ใหม่", href: "/admin/feedback" },
    { n: a.suspended_users ?? 0, label: "ผู้ใช้ที่ถูกระงับ", href: "/admin/users" },
  ];

  return (
    <>
      <header className="page-head">
        <h1>ภาพรวม</h1>
        <p className="muted">สิ่งที่ต้องดูวันนี้ และสุขภาพของระบบ</p>
      </header>

      {(ov.error || att.error) && (
        <p className="notice">
          โหลดข้อมูลบางส่วนไม่ได้ ตรวจว่ารัน <code>supabase-feedback-admin.sql</code> และ <code>supabase-admin-console.sql</code> แล้ว ({att.error ?? ov.error})
        </p>
      )}

      <section className="todo">
        {todo.map((t) => (
          <Link key={t.label} href={t.href} className={t.n > 0 ? "todo-card hot" : "todo-card"}>
            <strong>{t.n}</strong>
            <span>{t.label}</span>
          </Link>
        ))}
        <Link href="/admin/seeder" className={paused ? "todo-card hot" : "todo-card"}>
          <strong>{paused === null ? "—" : paused ? "หยุด" : "ทำงาน"}</strong>
          <span>
            Seeder · เผยแพร่ {published.toLocaleString()} · ค้าง {pending.toLocaleString()}
          </span>
        </Link>
      </section>

      <section className="stats">
        <div className="stat accent">
          <span>ผู้ใช้ทั้งหมด</span>
          <strong>
            {n(a.users_total)} <small>+{n(a.users_7d)} / 7 วัน</small>
          </strong>
        </div>
        <div className="stat">
          <span>Items</span>
          <strong>{n(o.items)}</strong>
        </div>
        <div className="stat">
          <span>Boards</span>
          <strong>
            {n(o.boards)} <small>แชร์ {n(a.active_shares)}</small>
          </strong>
        </div>
        <div className="stat">
          <span>Projects / Collections</span>
          <strong>
            {n(o.projects)} <small>/ {n(o.collections)}</small>
          </strong>
        </div>
        <div className="stat">
          <span>Captures 24 ชม.</span>
          <strong>
            {n(o.captures_24h)} <small>7 วัน {n(o.captures_7d)}</small>
          </strong>
        </div>
        <div className="stat">
          <span>Storage</span>
          <strong>
            {fmtBytes(Number(o.storage_bytes ?? 0))} <small>{n(o.storage_objects)} ไฟล์</small>
          </strong>
        </div>
        <div className="stat">
          <span>Feedback เฉลี่ย</span>
          <strong>
            {o.feedback_avg ?? "—"} <small>/ 5 · {n(o.feedback_total)} รายการ</small>
          </strong>
        </div>
      </section>

      <div className="charts">
        <Spark days={act.data} k="signups" label="สมัครใหม่" />
        <Spark days={act.data} k="items" label="Items ใหม่" />
        <Spark days={act.data} k="captures" label="Captures จาก extension" />
      </div>
    </>
  );
}
