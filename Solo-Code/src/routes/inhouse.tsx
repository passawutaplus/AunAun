import { createFileRoute } from "@tanstack/react-router";
import { RouteError } from "@/components/RouteError";
import { RequireAuth } from "@/auth/RequireAuth";
import { Toaster } from "@/components/ui/sonner";
import { InhouseHomePage } from "@/components/inhouse/InhouseHomePage";
import { isInhouseWorkspaceEnabled } from "@/lib/inhouseAccess";

export const Route = createFileRoute("/inhouse")({
  head: () => ({
    meta: [
      { title: "In-House Co-working | So1o Freelancer" },
      { name: "description", content: "พื้นที่ทำงานร่วมกันสำหรับทีม In-House" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: () => (
    <RequireAuth>
      <InhouseIndex />
    </RequireAuth>
  ),
});

function InhouseIndex() {
  if (!isInhouseWorkspaceEnabled()) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        In-House workspace กำลังพัฒนา
      </div>
    );
  }
  return (
    <>
      <Toaster />
      <InhouseHomePage />
    </>
  );
}
