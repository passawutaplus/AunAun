import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import logoUrl from "@/assets/solo-freelancer-logo.webp";

const DeliveryPackToolLazy = React.lazy(() =>
  import("@/components/dashboard/labs/tools/delivery/DeliveryPackTool").then((m) => ({
    default: m.DeliveryPackTool,
  })),
);

export const Route = createFileRoute("/labs/delivery/pack")({
  head: () => ({
    meta: [
      { title: "Delivery Pack | Solo Labs" },
      { name: "description", content: "สร้างชุดส่งมอบงานพร้อม README" },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:image", content: logoUrl },
    ],
    links: [{ rel: "canonical", href: "https://solofreelancer.com/labs/delivery/pack" }],
  }),
  component: DeliveryPackPage,
});

function DeliveryPackPage() {
  return (
    <React.Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-muted/40" />}>
      <DeliveryPackToolLazy />
    </React.Suspense>
  );
}
