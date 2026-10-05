import { fmtDate, safeRpc } from "@/lib/admin-rpc";
import { ConfirmButton } from "../confirm-button";
import { purgeCaptures } from "../actions";

type Capture = { id: string; object_id: string | null; user_id: string | null; bearer_prefix: string; item_type: string; title: string; created_at: string };

export default async function OpsPage() {
  const res = await safeRpc<Capture[]>("vault_admin_list_captures", { p_limit: 60 }, []);

  return (
    <>
      <header className="page-head">
        <h1>ระบบ & Captures</h1>
        <p className="muted">ที่เก็บรายการที่ extension ส่งเข้ามา (ชั่วคราว) ล้างรายการเก่าเพื่อลดขนาดฐานข้อมูล</p>
      </header>
      {res.error && <p className="notice">โหลดไม่ได้: {res.error}</p>}

      <section className="panel">
        <h2>ล้าง captures เก่า</h2>
        <form action={purgeCaptures} className="inline">
          <label className="check">
            เก่ากว่า
            <input name="days" type="number" min={1} max={3650} defaultValue={30} className="narrow" aria-label="จำนวนวัน" /> วัน
          </label>
          <ConfirmButton message="ลบ captures ที่เก่ากว่าที่ระบุอย่างถาวร? (ของที่ผู้ใช้บันทึกเข้า Vault แล้วไม่ถูกลบ)" className="danger">
            ล้างเลย
          </ConfirmButton>
        </form>
      </section>

      <section className="panel">
        <h2>ล่าสุด {res.data.length} รายการ</h2>
        <table>
          <thead>
            <tr>
              <th>เวลา</th>
              <th>ชนิด</th>
              <th>ชื่อ</th>
              <th>token</th>
              <th>ผู้ใช้</th>
            </tr>
          </thead>
          <tbody>
            {res.data.map((c) => (
              <tr key={c.id}>
                <td className="small">{fmtDate(c.created_at)}</td>
                <td>
                  <span className="source">{c.item_type}</span>
                </td>
                <td>{c.title || <span className="muted">—</span>}</td>
                <td>
                  <code>{c.bearer_prefix || "—"}</code>
                </td>
                <td className="muted small">{c.user_id ? c.user_id.slice(0, 8) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
