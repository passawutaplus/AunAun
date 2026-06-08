import { PageHeader } from "@/components/PageHeader";
import { ActivityFeed } from "@/components/ActivityFeed";

export default function ActivityPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Activity"
        subtitle="platform_events จากทั้ง ecosystem"
      />
      <div className="max-w-2xl p-6">
        <ActivityFeed />
      </div>
    </div>
  );
}
