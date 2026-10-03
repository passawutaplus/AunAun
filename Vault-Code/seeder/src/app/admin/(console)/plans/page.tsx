import { safeRpc } from "@/lib/admin-rpc";
import { updatePlan } from "../actions";

type Plan = { id: string; name: string; max_items: number; max_storage_mb: number; max_boards: number; max_shares: number; users: number };

export default async function PlansPage() {
  const res = await safeRpc<Plan[]>("vault_admin_list_plans", {}, []);

  return (
    <>
      <header className="page-head">
        <h1>แพ็กเกจ & โควตา</h1>
        <p className="muted">กำหนดเพดานต่อแพ็กเกจ แล้วกำหนดให้ผู้ใช้แต่ละคนที่หน้า “ผู้ใช้”</p>
      </header>
      <p className="notice">
        ตอนนี้โควตาใช้ <strong>แสดงเตือนในหน้าผู้ใช้</strong> (ตัวเลขเหลือง ≥ 80%, แดงเมื่อเกิน) ยังไม่ได้บังคับในแอป Vault ฝั่งผู้ใช้ และยังไม่ต่อระบบชำระเงิน
      </p>
      {res.error && <p className="notice">โหลดไม่ได้: {res.error}</p>}
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>แพ็กเกจ</th>
              <th className="num">ผู้ใช้</th>
              <th>Items</th>
              <th>Storage (MB)</th>
              <th>Boards</th>
              <th>แชร์</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {res.data.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong> <span className="muted small">({p.id})</span>
                </td>
                <td className="num">{p.users}</td>
                <td colSpan={5}>
                  <form action={updatePlan} className="inline wrap">
                    <input type="hidden" name="id" value={p.id} />
                    <input name="max_items" type="number" min={0} defaultValue={p.max_items} className="narrow" aria-label="Items" />
                    <input name="max_storage_mb" type="number" min={0} defaultValue={p.max_storage_mb} className="narrow" aria-label="Storage MB" />
                    <input name="max_boards" type="number" min={0} defaultValue={p.max_boards} className="narrow" aria-label="Boards" />
                    <input name="max_shares" type="number" min={0} defaultValue={p.max_shares} className="narrow" aria-label="แชร์" />
                    <button type="submit" className="small">
                      บันทึก
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
