import { createFileRoute } from "@tanstack/react-router";
import { HttpErrorPage } from "@/components/HttpErrorPage";

export const Route = createFileRoute("/maintenance")({
  head: () => ({
    meta: [
      { title: "ปรับปรุงระบบ — So1o Freelancer" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: MaintenancePage,
});

function MaintenancePage() {
  return <HttpErrorPage kind="503" code={503} showRetry showSupport />;
}
