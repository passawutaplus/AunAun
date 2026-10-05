import { fmtDate, safeRpc } from "@/lib/admin-rpc";

type Log = { id: number; admin_email: string; action: string; target_type: string; target_id: string; detail: Record<string, unknown>; created_at: string };

export default async function AuditPage() {
  const res = await safeRpc<Log[]>("vault_admin_list_audit", { p_limit: 200 }, []);

  return (
    <>
      <header className="page-head">
        <h1>Audit log</h1>
        <p className="muted">ทุกการแก้ไขจากหลังบ้านถูกบันทึกไว้ที่นี่ (อ่านอย่างเดียว)</p>
      </header>
      {res.error && <p className="notice">โหลดไม่ได้: {res.error}</p>}
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>เวลา</th>
              <th>แอดมิน</th>
              <th>การกระทำ</th>
              <th>เป้าหมาย</th>
              <th>รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {res.data.map((l) => (
              <tr key={l.id}>
                <td className="small">{fmtDate(l.created_at)}</td>
                <td className="small">{l.admin_email}</td>
                <td>
                  <span className="source">{l.action}</span>
                </td>
                <td className="small">
                  {l.target_type} <code>{l.target_id.slice(0, 8)}</code>
                </td>
                <td className="muted small">
                  <code>{JSON.stringify(l.detail)}</code>
                </td>
              </tr>
            ))}
            {res.data.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  ยังไม่มีบันทึก
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
