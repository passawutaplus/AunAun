import Link from "next/link";
import { fmtDate, safeRpc } from "@/lib/admin-rpc";
import { publicMediaUrl } from "@/seeder/repo";
import { ConfirmButton } from "../confirm-button";
import { resolveReport } from "../actions";
import { takedownAndReply } from "./actions";
import { takedownReplyText } from "@/ops/email";
import { deleteItemPermanently, restoreItem } from "../review/actions";

type Report = {
  id: string;
  item_id: string;
  reason: string;
  details: string;
  email: string | null;
  status: string;
  created_at: string;
  item_title: string;
  item_status: string;
  source: string;
  source_url: string;
  image_sm_path: string | null;
  replied_at: string | null;
  resolution_note: string | null;
};

const REASONS: Record<string, string> = {
  copyright: "ลิขสิทธิ์",
  credit: "เครดิต/ที่มา",
  offensive: "ไม่เหมาะสม",
  broken: "รูปเสีย",
  duplicate: "ซ้ำ",
  other: "อื่น ๆ",
};
const TABS = [
  ["open", "รอตรวจ"],
  ["resolved", "จัดการแล้ว"],
  ["dismissed", "ปัดตก"],
  ["all", "ทั้งหมด"],
] as const;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "open" } = await searchParams;
  const res = await safeRpc<Report[]>("vault_admin_list_reports", { p_status: status, p_limit: 100 }, []);

  return (
    <>
      <header className="page-head">
        <h1>รายงานจาก Discover</h1>
        <p className="muted">ผู้ใช้กด “รายงานรูปนี้” จะมาอยู่ที่นี่ รายงานลิขสิทธิ์ควรจัดการเร็วที่สุด</p>
      </header>
      {res.error && <p className="notice">โหลดไม่ได้: {res.error}</p>}
      <section className="panel">
        <h2>ได้รับอีเมลแจ้งลบ?</h2>
        <p className="muted small">
          วางลิงก์หรือ ID ของรูปบน Discover ระบบจะลบไฟล์ถาวร กันไม่ให้นำกลับมาอีก ปิดรายงานที่เกี่ยวข้อง และส่งเมลตอบกลับว่าลบแล้ว
          (ถ้ายังไม่ได้ตั้ง RESEND_API_KEY จะไม่ส่งอัตโนมัติ ให้กดลิงก์ตอบกลับที่รายงานแทน)
        </p>
        <form action={takedownAndReply} className="row">
          <input name="item" placeholder="ลิงก์หรือ ID ของรูป" required />
          <input name="email" type="email" placeholder="อีเมลผู้แจ้ง (ถ้ามี)" />
          <input name="note" placeholder="หมายเหตุถึงผู้แจ้ง (ไม่บังคับ)" />
          <ConfirmButton message="ลบรูปนี้ถาวรและตอบกลับผู้แจ้ง?" className="danger small">ลบ + ตอบกลับ</ConfirmButton>
        </form>
      </section>
      <div className="tabs">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/reports?status=${k}`} className={status === k ? "active" : undefined}>
            {label}
          </Link>
        ))}
      </div>

      <div className="stack-list">
        {res.data.map((r) => (
          <article key={r.id} className="panel report">
            {r.image_sm_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={publicMediaUrl(r.image_sm_path)} alt={r.item_title} loading="lazy" />
            ) : (
              <div className="noimg">ไม่มีรูป</div>
            )}
            <div className="report-body">
              <div className="row">
                <span className={r.reason === "copyright" ? "tag" : "source"}>{REASONS[r.reason] ?? r.reason}</span>
                <span className="source">{r.source.toUpperCase()}</span>
                <span className="muted small">{fmtDate(r.created_at)}</span>
                <span className="muted small">รูป: {r.item_status === "hidden" ? "ซ่อนอยู่" : r.item_status}</span>
              </div>
              <strong>{r.item_title || "(ไม่มีชื่อ)"}</strong>
              {r.details && <p>{r.details}</p>}
              <p className="muted small">
                {r.email ? <a href={`mailto:${r.email}`}>{r.email}</a> : "ไม่ระบุอีเมล"} ·{" "}
                <a href={r.source_url} target="_blank" rel="noreferrer">
                  ต้นทาง
                </a>
              </p>
              <div className="row">
                {r.status === "open" ? (
                  <>
                    {r.item_status === "hidden" && (
                      <>
                        <form action={restoreItem}>
                          <input type="hidden" name="id" value={r.item_id} />
                          <ConfirmButton message="คืนรูปนี้กลับขึ้น Discover?" className="small">คืนรูป</ConfirmButton>
                        </form>
                        <form action={deleteItemPermanently}>
                          <input type="hidden" name="id" value={r.item_id} />
                          <ConfirmButton message="ลบถาวร? ไฟล์รูปจะถูกลบจาก Storage และไม่นำกลับมาอีก" className="danger small">ลบถาวร</ConfirmButton>
                        </form>
                      </>
                    )}
                    {r.reason === "copyright" && r.item_status !== "rejected" && (
                      <form action={takedownAndReply}>
                        <input type="hidden" name="report_id" value={r.id} />
                        <input type="hidden" name="item" value={r.item_id} />
                        <input type="hidden" name="email" value={r.email ?? ""} />
                        <ConfirmButton message="ลบถาวร กันกลับมา และตอบกลับผู้แจ้งว่าลบแล้ว?" className="danger small">
                          ลบถาวร + ตอบกลับเมล
                        </ConfirmButton>
                      </form>
                    )}
                    {r.item_status !== "hidden" && (
                      <form action={resolveReport}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="resolved" />
                        <input type="hidden" name="hide_item" value="true" />
                        <ConfirmButton message="ซ่อนรูปนี้จาก Discover และปิดรายงาน?" className="danger small">
                          ซ่อนรูป + ปิดรายงาน
                        </ConfirmButton>
                      </form>
                    )}
                    <form action={resolveReport}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="resolved" />
                      <button type="submit" className="small">
                        แก้แล้ว
                      </button>
                    </form>
                    <form action={resolveReport}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="dismissed" />
                      <button type="submit" className="small">
                        ปัดตก
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    {r.email && r.replied_at && <span className="muted small">ส่งเมลตอบกลับแล้ว {fmtDate(r.replied_at)}</span>}
                    {r.email && !r.replied_at && r.item_status === "rejected" && (
                      <a
                        className="small"
                        href={`mailto:${r.email}?subject=${encodeURIComponent(takedownReplyText(r.item_title).subject)}&body=${encodeURIComponent(takedownReplyText(r.item_title).text)}`}
                      >
                        เปิดเมลตอบกลับ (ยังไม่ได้ส่ง)
                      </a>
                    )}
                  <form action={resolveReport}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="status" value="open" />
                    <button type="submit" className="small">
                      เปิดใหม่ ({r.status === "resolved" ? "จัดการแล้ว" : "ปัดตก"})
                    </button>
                  </form>
                  </>
                )}
              </div>
            </div>
          </article>
        ))}
        {!res.error && res.data.length === 0 && <p className="panel muted">ไม่มีรายงานในหมวดนี้ 🎉</p>}
      </div>
    </>
  );
}
