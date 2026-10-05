import Link from "next/link";
import { fmtDate, safeRpc } from "@/lib/admin-rpc";

type Source = {
  source: string;
  published: number;
  pending: number;
  rejected: number;
  hidden: number;
  last_published_at: string | null;
  last_seen_at: string | null;
  reports: number;
  open_reports: number;
  copyright_reports: number;
};
type Health = {
  sources: Source[];
  licenses: { license: string; n: number }[];
  violations: { published_not_allowed: number; published_no_attribution: number; published_no_source_url: number };
  copyright_open: number;
  copyright_oldest_open: string | null;
};

const NAMES: Record<string, string> = {
  met: "The Met",
  aic: "Art Institute of Chicago",
  cma: "Cleveland Museum",
  si: "Smithsonian",
  chndm: "Cooper Hewitt",
  ov: "Openverse (CC0 คัดสถาบัน)",
};
const EMPTY: Health = {
  sources: [],
  licenses: [],
  violations: { published_not_allowed: 0, published_no_attribution: 0, published_no_source_url: 0 },
  copyright_open: 0,
  copyright_oldest_open: null,
};
const STALE_DAYS = 3;

function stale(s: Source): boolean {
  if (!s.last_seen_at) return false;
  return Date.now() - new Date(s.last_seen_at).getTime() > STALE_DAYS * 86_400_000;
}

export default async function SourcesPage() {
  const { data, error } = await safeRpc<Health>("vault_admin_source_health", {}, EMPTY);
  const v = data.violations;
  const violations = v.published_not_allowed + v.published_no_attribution + v.published_no_source_url;
  const total = data.sources.reduce((s, r) => s + r.published, 0);

  return (
    <>
      <header className="page-head">
        <h1>บอท &amp; ลิขสิทธิ์</h1>
        <p className="muted">
          สุขภาพของแต่ละแหล่งที่บอทดึง และเช็กว่าทุกภาพที่เผยแพร่ยังอยู่ในไลเซนส์ที่อนุญาต + มีเครดิตครบ ตั้งค่า/สั่งรันที่ <Link href="/admin/seeder">Discover Seeder</Link>
        </p>
      </header>
      {error && (
        <p className="notice">
          โหลดไม่ได้ ตรวจว่ารัน <code>supabase-admin-sources.sql</code> แล้ว ({error})
        </p>
      )}

      <section className="todo">
        <Link href="/admin/reports?status=open" className={data.copyright_open > 0 ? "todo-card hot" : "todo-card"}>
          <strong>{data.copyright_open}</strong>
          <span>รายงานลิขสิทธิ์ค้าง{data.copyright_oldest_open ? ` · เก่าสุด ${fmtDate(data.copyright_oldest_open)}` : ""}</span>
        </Link>
        <div className={violations > 0 ? "todo-card hot" : "todo-card"}>
          <strong>{violations}</strong>
          <span>ภาพเผยแพร่ที่ผิดกติกา (ไลเซนส์นอก allowlist / ไม่มีเครดิต / ไม่มีลิงก์ต้นทาง)</span>
        </div>
        <div className="todo-card">
          <strong>{total.toLocaleString()}</strong>
          <span>ภาพที่เผยแพร่ทั้งหมด</span>
        </div>
      </section>

      <div className="panel">
        <h2>แหล่งข้อมูล (บอทแต่ละตัว)</h2>
        <table className="table">
          <thead>
            <tr>
              <th>แหล่ง</th>
              <th>เผยแพร่</th>
              <th>รอ</th>
              <th>ถูกปัด</th>
              <th>ซ่อน</th>
              <th>รายงาน (ค้าง/ลิขสิทธิ์/ทั้งหมด)</th>
              <th>ความเคลื่อนไหวล่าสุด</th>
            </tr>
          </thead>
          <tbody>
            {data.sources.map((s) => (
              <tr key={s.source}>
                <td>{NAMES[s.source] ?? s.source}</td>
                <td>{s.published.toLocaleString()}</td>
                <td>{s.pending.toLocaleString()}</td>
                <td>{s.rejected.toLocaleString()}</td>
                <td>{s.hidden.toLocaleString()}</td>
                <td className={s.open_reports > 0 ? "hot" : undefined}>
                  {s.open_reports} / {s.copyright_reports} / {s.reports}
                </td>
                <td>
                  {fmtDate(s.last_seen_at)}
                  {stale(s) ? <small className="muted"> · เงียบเกิน {STALE_DAYS} วัน</small> : null}
                </td>
              </tr>
            ))}
            {data.sources.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  ยังไม่มีข้อมูล
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>ไลเซนส์ของภาพที่เผยแพร่</h2>
        <p>
          {data.licenses.map((l) => (
            <span key={l.license} className="chip">
              {l.license}: {l.n.toLocaleString()}{" "}
            </span>
          ))}
          {data.licenses.length === 0 && <span className="muted">—</span>}
        </p>
        <p className="muted small">นโยบาย: เผยแพร่ได้เฉพาะไลเซนส์เปิด (CC0, Public Domain Mark, CC BY, CC BY-SA) ที่มีเครดิตและลิงก์ต้นทาง ไม่รับ NC/ND ภาพที่ผู้ใช้เซฟเองเป็นส่วนตัว ไม่ขึ้น Discover</p>
      </div>
    </>
  );
}
