import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import logoUrl from "@/assets/solo-freelancer-logo.webp";

const MockupLabToolLazy = React.lazy(() =>
  import("@/components/dashboard/labs/tools/mockup/MockupLabTool").then((m) => ({
    default: m.MockupLabTool,
  })),
);

export const Route = createFileRoute("/labs/visual/mockup")({
  head: () => ({
    meta: [
      { title: "Mockup Lab | Solo Labs" },
      { name: "description", content: "ใส่กรอบ mockup screenshot ก่อนส่งลูกค้า" },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:image", content: logoUrl },
    ],
    links: [{ rel: "canonical", href: "https://solofreelancer.com/labs/visual/mockup" }],
  }),
  component: MockupLabPage,
});

function MockupLabPage() {
  return (
    <React.Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-muted/40" />}>
      <MockupLabToolLazy />
    </React.Suspense>
  );
}
