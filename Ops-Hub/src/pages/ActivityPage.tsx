import { PageHeader } from "@/components/PageHeader";
import { ActivityFeed } from "@/components/ActivityFeed";

export default function ActivityPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="กิจกรรม"
        subtitle="เหตุการณ์ล่าสุดในระบบ เช่น สมัครใหม่ สร้างผลงาน หรือรายงานปัญหา"
      />
      <div className="max-w-2xl p-6">
        <ActivityFeed />
      </div>
    </div>
  );
}
