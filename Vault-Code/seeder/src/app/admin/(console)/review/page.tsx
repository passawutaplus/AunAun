import { fmtDate } from "@/lib/admin-rpc";
import { OpsRepo, publicMediaUrl } from "@/ops/repo";
import { ConfirmButton } from "../confirm-button";
import { approveItem, ignoreTerm, proposeSynonym, rejectItem } from "./actions";

export default async function ReviewPage() {
  let error: string | null = null;
  const ops = new OpsRepo();
  const [items, unknown, reports, events] = await Promise.all([
    ops.reviewItems(40).catch((e) => { error = e.message; return []; }),
    ops.topUnknown(30).catch(() => []),
    ops.latestReports(3).catch(() => []),
    ops.recentEvents(15).catch(() => []),
  ]);

  return (
    <>
      <header className="page-head">
        <h1>คิวตรวจ & รายงานประจำวัน</h1>
        <p className="muted">ภาพที่ระบบไม่แน่ใจ (คะแนนต่ำกว่าเกณฑ์ แท็กน้อย หรือ AI ตอบเพี้ยน) รออนุมัติ ไม่มีภาพไหนขึ้น Discover จนกว่าจะผ่านกติกา</p>
      </header>
      {error && <p className="notice">โหลดไม่ได้: {error}</p>}

      <section className="panel">
        <h2>รายงานล่าสุด</h2>
        {reports.length === 0 && <p className="muted">ยังไม่มีรายงาน (สร้างอัตโนมัติ 08:00 น. ทุกวัน)</p>}
        {reports.map((r) => (
          <details key={r.day} open={r === reports[0]}>
            <summary>
              {r.day} {r.body?.alerts?.some((a) => a.severity === "urgent") ? "· มีเรื่องด่วน" : ""} {r.emailed_at ? "· ส่งอีเมลแล้ว" : "· ยังไม่ส่งอีเมล (ตั้ง RESEND_API_KEY และ OWNER_REPORT_EMAIL)"}
            </summary>
            <pre className="small" style={{ whiteSpace: "pre-wrap" }}>{r.body?.text ?? ""}</pre>
          </details>
        ))}
      </section>

      <section className="panel">
        <h2>รอตรวจ ({items.length})</h2>
        <div className="stack-list">
          {items.map((it) => (
            <article key={it.id} className="panel report">
              {it.image_sm_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={publicMediaUrl(it.image_sm_path)} alt={it.title} loading="lazy" />
              ) : (
                <div className="noimg">ไม่มีรูป</div>
              )}
              <div className="report-body">
                <div className="row">
                  <span className="source">{it.source.toUpperCase()}</span>
                  <span className="muted small">คะแนน {it.quality_score ?? "-"}</span>
                  <span className="muted small">{it.category}</span>
                </div>
                <strong>{it.title || "(ไม่มีชื่อ)"}</strong>
                <p className="muted small">{it.status_reason}</p>
                <div className="row">
                  <form action={approveItem}>
                    <input type="hidden" name="id" value={it.id} />
                    <ConfirmButton message="อนุมัติและขึ้น Discover?" className="primary small">อนุมัติ</ConfirmButton>
                  </form>
                  <form action={rejectItem}>
                    <input type="hidden" name="id" value={it.id} />
                    <button type="submit" className="danger small">ปฏิเสธ</button>
                  </form>
                  <a className="small" href={it.source_url} target="_blank" rel="noreferrer">ต้นทาง</a>
                </div>
              </div>
            </article>
          ))}
          {items.length === 0 && !error && <p className="panel muted">ไม่มีภาพรอตรวจ</p>}
        </div>
      </section>

      <section className="panel">
        <h2>คำค้นที่ระบบยังไม่รู้จัก</h2>
        <p className="muted small">เสนอเป็น synonym ของคำใน taxonomy (ใส่ id เช่น <code>sty.minimal</code>) ระบบจะบันทึกเป็นข้อเสนอ ไม่แก้พจนานุกรมเอง คุณ export แล้ว build ใหม่เอง</p>
        <table>
          <thead><tr><th>คำ</th><th>ภาษา</th><th>จำนวน</th><th>ล่าสุด</th><th></th></tr></thead>
          <tbody>
            {unknown.map((u) => (
              <tr key={`${u.term}-${u.lang}`}>
                <td>
                  {u.term}
                  {u.example_queries && u.example_queries.length > 0 && <div className="muted small">เช่น: {u.example_queries.join(" | ")}</div>}
                </td>
                <td>{u.lang}</td>
                <td>{u.count}</td>
                <td className="small">{fmtDate(u.last_seen)}</td>
                <td>
                  <form action={proposeSynonym} className="inline">
                    <input type="hidden" name="term" value={u.term} />
                    <input type="hidden" name="lang" value={u.lang} />
                    <input name="term_id" placeholder="id ของคำ" defaultValue={u.suggested_term_id ?? ""} className="narrow" aria-label={`id ของคำสำหรับ ${u.term}`} />
                    <button type="submit" className="small">{u.suggested_term_id ? `ตั้งเป็น alias ของ ${u.suggested_term_id}` : "เสนอ"}</button>
                  </form>
                  <form action={ignoreTerm} className="inline">
                    <input type="hidden" name="term" value={u.term} />
                    <input type="hidden" name="lang" value={u.lang} />
                    <button type="submit" className="small">ข้าม</button>
                  </form>
                </td>
              </tr>
            ))}
            {unknown.length === 0 && <tr><td colSpan={5} className="muted">ยังไม่มีคำที่ระบบไม่รู้จัก</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>เหตุการณ์ระบบล่าสุด</h2>
        <table>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td className="small">{fmtDate(e.created_at)}</td>
                <td><span className={e.severity === "urgent" ? "tag" : "source"}>{e.kind}</span></td>
                <td className="small muted">{JSON.stringify(e.detail).slice(0, 120)}</td>
              </tr>
            ))}
            {events.length === 0 && <tr><td className="muted">ยังไม่มีเหตุการณ์</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
