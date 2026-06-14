import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ActivityFeed } from "@/components/ActivityFeed";
import type { ActivityFilter } from "@/hooks/usePlatformEvents";

export default function ActivityPage() {
  const [filter, setFilter] = useState<ActivityFilter>("all");

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="กิจกรรม"
        subtitle="เหตุการณ์ล่าสุด — รวม ecosystem cross-link และ handoff"
      />
      <div className="max-w-2xl p-6">
        <ActivityFeed filter={filter} onFilterChange={setFilter} />
      </div>
    </div>
  );
}
