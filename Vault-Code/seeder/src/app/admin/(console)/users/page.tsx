import Link from "next/link";
import { fmtBytes, fmtDate, safeRpc } from "@/lib/admin-rpc";
import { ConfirmButton } from "../confirm-button";
import { saveUser } from "../actions";

type UserRow = {
  id: string;
  email: string | null;
  name: string;
  created_at: string;
  last_sign_in_at: string | null;
  plan_id: string;
  suspended: boolean;
  note: string;
  items: number;
  boards: number;
  shares: number;
  storage_bytes: number;
};
type Plan = { id: string; name: string; max_items: number; max_storage_mb: number; max_boards: number; max_shares: number };

const PAGE = 25;

function usage(used: number, max: number): string {
  if (!max) return "";
  const pct = used / max;
  return pct >= 1 ? "over" : pct >= 0.8 ? "warn" : "";
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q = "", page = "1" } = await searchParams;
  const p = Math.max(1, Number.parseInt(page, 10) || 1);
  const [users, plans] = await Promise.all([
    safeRpc<{ total: number; rows: UserRow[] }>("vault_admin_list_users", { p_search: q, p_limit: PAGE, p_offset: (p - 1) * PAGE }, { total: 0, rows: [] }),
    safeRpc<Plan[]>("vault_admin_list_plans", {}, []),
  ]);
  const { total, rows } = users.data;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const planById = new Map(plans.data.map((x) => [x.id, x]));
  const href = (n: number) => `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) })}`;

  return (
    <>
      <header className="page-head">
        <h1>ผู้ใช้</h1>
        <p className="muted">ดูการใช้งาน เปลี่ยนแพ็กเกจ ระงับบัญชี (ไม่เห็นเนื้อหา private ของผู้ใช้)</p>
      </header>
      {users.error && <p className="notice">โหลดไม่ได้: {users.error}. รัน supabase-admin-console.sql แล้วหรือยัง?</p>}

      <form className="panel toolbar" action="/admin/users">
        <input name="q" defaultValue={q} placeholder="ค้นหาอีเมล…" aria-label="ค้นหาอีเมล" />
        <button type="submit" className="primary">
          ค้นหา
        </button>
        {q && (
          <Link href="/admin/users" className="muted">
            ล้าง
          </Link>
        )}
        <span className="muted small push">{total.toLocaleString()} บัญชี</span>
      </form>

      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>ผู้ใช้</th>
              <th>สมัคร / เข้าล่าสุด</th>
              <th className="num">Items</th>
              <th className="num">Boards</th>
              <th className="num">Storage</th>
              <th>แพ็กเกจ · สถานะ · โน้ต</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const plan = planById.get(u.plan_id);
              return (
                <tr key={u.id} className={u.suspended ? "disabled" : ""}>
                  <td>
                    <strong>{u.email ?? "(ไม่มีอีเมล)"}</strong>
                    {u.name && <div className="muted small">{u.name}</div>}
                    {u.suspended && <span className="tag">ถูกระงับ</span>}
                  </td>
                  <td className="small">
                    {fmtDate(u.created_at)}
                    <div className="muted">{fmtDate(u.last_sign_in_at)}</div>
                  </td>
                  <td className={`num ${plan ? usage(u.items, plan.max_items) : ""}`}>
                    {u.items}
                    {plan && <small className="muted"> / {plan.max_items}</small>}
                  </td>
                  <td className={`num ${plan ? usage(u.boards, plan.max_boards) : ""}`}>
                    {u.boards}
                    {plan && <small className="muted"> / {plan.max_boards}</small>}
                    {u.shares > 0 && <div className="muted small">แชร์ {u.shares}</div>}
                  </td>
                  <td className={`num ${plan ? usage(u.storage_bytes, plan.max_storage_mb * 1024 * 1024) : ""}`}>{fmtBytes(Number(u.storage_bytes))}</td>
                  <td>
                    <form action={saveUser} className="inline wrap">
                      <input type="hidden" name="user_id" value={u.id} />
                      <input type="hidden" name="was_suspended" value={String(u.suspended)} />
                      <select name="plan_id" defaultValue={u.plan_id} aria-label="แพ็กเกจ">
                        {plans.data.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name}
                          </option>
                        ))}
                        {!plan && <option value={u.plan_id}>{u.plan_id}</option>}
                      </select>
                      <label className="check">
                        <input type="checkbox" name="suspended" defaultChecked={u.suspended} /> ระงับ
                      </label>
                      <input name="note" defaultValue={u.note} placeholder="โน้ตภายใน" aria-label="โน้ต" className="note" />
                      <ConfirmButton message={`บันทึกการเปลี่ยนแปลงของ ${u.email}? (การระงับ/ปลดระงับมีผลกับการล็อกอินทันที)`} className="small">
                        บันทึก
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  ไม่พบผู้ใช้
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="pager">
            {p > 1 && <Link href={href(p - 1)}>← ก่อนหน้า</Link>}
            <span className="muted small">
              หน้า {p} / {pages}
            </span>
            {p < pages && <Link href={href(p + 1)}>ถัดไป →</Link>}
          </div>
        )}
      </section>
    </>
  );
}
