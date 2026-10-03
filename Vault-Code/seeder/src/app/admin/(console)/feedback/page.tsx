import Link from "next/link";
import { fmtDate, safeRpc } from "@/lib/admin-rpc";
import { setFeedback } from "../actions";

type Fb = {
  id: string;
  user_email: string | null;
  user_name: string | null;
  feature: string;
  message: string;
  rating: number;
  status: string;
  admin_note: string;
  created_at: string;
};

const TABS = [
  ["new", "ใหม่"],
  ["handled", "จัดการแล้ว"],
  ["archived", "เก็บถาวร"],
  ["all", "ทั้งหมด"],
] as const;

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "new" } = await searchParams;
  const res = await safeRpc<Fb[]>("vault_admin_list_feedback_v2", { p_status: status, p_limit: 150 }, []);

  return (
    <>
      <header className="page-head">
        <h1>Feedback</h1>
        <p className="muted">ความเห็นจากผู้ใช้ ติดสถานะและโน้ตไว้ได้ว่าจัดการไปถึงไหน</p>
      </header>
      {res.error && <p className="notice">โหลดไม่ได้: {res.error}</p>}
      <div className="tabs">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/feedback?status=${k}`} className={status === k ? "active" : undefined}>
            {label}
          </Link>
        ))}
      </div>
      <div className="stack-list">
        {res.data.map((f) => (
          <article key={f.id} className="panel">
            <div className="row">
              <span className="stars" aria-label={`${f.rating} จาก 5`}>
                {"★".repeat(f.rating)}
                <span className="dim">{"★".repeat(5 - f.rating)}</span>
              </span>
              <span className="source">{f.feature}</span>
              <strong>{f.user_name || f.user_email || "ไม่ระบุ"}</strong>
              {f.user_name && f.user_email && <span className="muted small">{f.user_email}</span>}
              <span className="muted small push">{fmtDate(f.created_at)}</span>
            </div>
            {f.message && <p className="quote">{f.message}</p>}
            <form action={setFeedback} className="inline wrap">
              <input type="hidden" name="id" value={f.id} />
              <input name="note" defaultValue={f.admin_note} placeholder="โน้ตภายใน" aria-label="โน้ต" className="note" />
              <select name="status" defaultValue={f.status} aria-label="สถานะ">
                <option value="new">ใหม่</option>
                <option value="handled">จัดการแล้ว</option>
                <option value="archived">เก็บถาวร</option>
              </select>
              <button type="submit" className="small">
                บันทึก
              </button>
            </form>
          </article>
        ))}
        {!res.error && res.data.length === 0 && <p className="panel muted">ไม่มี feedback ในหมวดนี้</p>}
      </div>
    </>
  );
}
