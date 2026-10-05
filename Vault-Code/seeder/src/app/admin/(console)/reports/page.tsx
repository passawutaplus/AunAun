import Link from "next/link";
import { fmtDate, safeRpc } from "@/lib/admin-rpc";
import { publicMediaUrl } from "@/seeder/repo";
import { ConfirmButton } from "../confirm-button";
import { resolveReport } from "../actions";
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
                  <form action={resolveReport}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="status" value="open" />
                    <button type="submit" className="small">
                      เปิดใหม่ ({r.status === "resolved" ? "จัดการแล้ว" : "ปัดตก"})
                    </button>
                  </form>
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
