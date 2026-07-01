import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LabsTabLazy } from "@/components/dashboard/labs/LabsTabLazy";
import { useAuth } from "@/auth/AuthProvider";
import { useTrackActivity } from "@/hooks/useTrackActivity";
import { useLogActivity } from "@/hooks/useLogActivity";
import { markLabsVisited } from "@/lib/designDrillStorage";
import logoUrl from "@/assets/solo-freelancer-logo.webp";

export const Route = createFileRoute("/labs/creative")({
  head: () => ({
    meta: [
      { title: "Creative Labs — ห้องทดลองนักออกแบบ | So1o Freelancer" },
      {
        name: "description",
        content:
          "Color Lab สำหรับฟรีแลนซ์สายดีไซน์ — ทดลองสี ตรวจ contrast export Tailwind บันทึกพาเลท",
      },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "So1o Creative Labs" },
      { property: "og:image", content: logoUrl },
    ],
    links: [{ rel: "canonical", href: "https://solofreelancer.com/labs/creative" }],
  }),
  component: CreativeLabsPage,
});

function CreativeLabsPage() {
  const { user } = useAuth();
  useTrackActivity(user?.id);
  useLogActivity(user?.id, "labs_view");

  React.useEffect(() => {
    markLabsVisited();
  }, []);

  return <LabsTabLazy />;
}
