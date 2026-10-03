import { fmtDate, safeRpc } from "@/lib/admin-rpc";
import { ConfirmButton } from "../confirm-button";
import { revokeShare } from "../actions";

type Share = { id: string; name: string; share_token: string | null; updated_at: string; owner_email: string | null };

export default async function SharesPage() {
  const res = await safeRpc<Share[]>("vault_admin_list_shares", { p_limit: 200 }, []);

  return (
    <>
      <header className="page-head">
        <h1>บอร์ดที่แชร์สาธารณะ</h1>
        <p className="muted">ถอนลิงก์ได้ทันทีหากพบเนื้อหาที่ละเมิด (เจ้าของยังเก็บบอร์ดไว้เป็น private)</p>
      </header>
      {res.error && <p className="notice">โหลดไม่ได้: {res.error}</p>}
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>บอร์ด</th>
              <th>เจ้าของ</th>
              <th>อัปเดต</th>
              <th>โทเคน</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {res.data.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.name}</strong>
                </td>
                <td>{s.owner_email ?? "—"}</td>
                <td className="small">{fmtDate(s.updated_at)}</td>
                <td>
                  <code>{s.share_token ? s.share_token.slice(0, 8) : "—"}</code>
                </td>
                <td>
                  <form action={revokeShare}>
                    <input type="hidden" name="id" value={s.id} />
                    <ConfirmButton message={`ถอนลิงก์แชร์ของ “${s.name}”?`} className="danger small">
                      ถอนลิงก์
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
            {res.data.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  ไม่มีบอร์ดที่แชร์อยู่
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
