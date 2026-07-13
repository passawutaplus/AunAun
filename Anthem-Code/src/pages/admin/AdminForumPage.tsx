import { Link } from "react-router-dom";
import SectionHeader from "@/components/admin/SectionHeader";
import { Button } from "@/components/ui/button";

/** Hub entry from main admin — full console lives inside the forum shell. */
export default function AdminForumPage() {
  return (
    <div>
      <SectionHeader
        title="ฟอรัมชุมชน"
        description="แดชบอร์ดมอนิเตอร์เต็มระบบอยู่ในหน้าแอดมินฟอรัม — ภาพรวม คิวรายงาน Feedback ยศ ไฟล์ และสถิติ"
      />
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-xl">
        <p className="text-sm text-muted-foreground">
          ใช้หน้าแอดมินใน Community เพื่อทำงานในบริบทเดียวกับผู้ใช้ รวมถึงปักหมุด ยศผู้ช่วย
          และคิวดูแลรายงาน
        </p>
        <Button asChild>
          <Link to="/forum/admin">เปิดแอดมินฟอรัมเต็มระบบ</Link>
        </Button>
        <div className="flex flex-wrap gap-2 text-xs">
          <Button asChild size="sm" variant="outline">
            <Link to="/forum/admin?tab=moderation">คิวดูแล</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/forum/admin?tab=feedback">Feedback</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/forum/admin?tab=analytics">สถิติ</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
