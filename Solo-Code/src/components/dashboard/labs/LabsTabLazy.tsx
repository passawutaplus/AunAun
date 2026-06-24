import * as React from "react";
import { LabsSkeleton } from "@/components/dashboard/skeletons/TabSkeletons";

const LabsTab = React.lazy(() =>
  import("@/components/dashboard/LabsTab").then((m) => ({ default: m.LabsTab })),
);

export function LabsTabLazy() {
  return (
    <React.Suspense fallback={<LabsSkeleton />}>
      <LabsTab />
    </React.Suspense>
  );
}
