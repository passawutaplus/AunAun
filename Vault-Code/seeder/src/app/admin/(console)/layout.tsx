import { checkAdmin } from "@/lib/admin";
import { safeRpc } from "@/lib/admin-rpc";
import { ThemeToggle } from "../../theme-toggle";
import { signOut } from "../login/actions";
import { AdminNav } from "./nav";

export const dynamic = "force-dynamic";

type Attention = { open_reports: number; new_feedback: number };

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const admin = await checkAdmin();
  if (admin.status === "forbidden") {
    return (
      <main className="page">
        <h1>ไม่มีสิทธิ์</h1>
        <p>บัญชี {admin.email} ไม่ใช่ผู้ดูแล Vault</p>
        <form action={signOut}>
          <button type="submit">ออกจากระบบ</button>
        </form>
      </main>
    );
  }

  const { data: att } = await safeRpc<Partial<Attention>>("vault_admin_attention", {}, {});

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">A+</span>
          <div>
            <h1>Vault Admin</h1>
            <p className="muted small">{admin.email}</p>
          </div>
        </div>
        <AdminNav
          items={[
            { href: "/admin", label: "ภาพรวม" },
            { href: "/admin/users", label: "ผู้ใช้" },
            { href: "/admin/reports", label: "รายงาน (Discover)", badge: att.open_reports },
            { href: "/admin/shares", label: "บอร์ดที่แชร์" },
            { href: "/admin/feedback", label: "Feedback", badge: att.new_feedback },
            { href: "/admin/seeder", label: "Discover Seeder" },
            { href: "/admin/review", label: "คิวตรวจ & รายงานประจำวัน" },
            { href: "/admin/sources", label: "บอท & ลิขสิทธิ์" },
            { href: "/admin/plans", label: "แพ็กเกจ & โควตา" },
            { href: "/admin/ops", label: "ระบบ & Captures" },
            { href: "/admin/audit", label: "Audit log" },
          ]}
        />
        <div className="side-foot">
          <ThemeToggle />
          <form action={signOut}>
            <button type="submit" className="small">
              ออกจากระบบ
            </button>
          </form>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
