import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import logoUrl from "@/assets/solo-freelancer-logo.webp";

const DocLabTabLazy = React.lazy(() =>
  import("@/components/dashboard/labs/doc/DocLabTab").then((m) => ({ default: m.DocLabTab })),
);

export const Route = createFileRoute("/labs/doc")({
  head: () => ({
    meta: [
      { title: "Doc Lab — เครื่องมือเอกสาร | So1o Freelancer" },
      {
        name: "description",
        content: "รวม แยก PDF จัดไฟล์ก่อนส่ง — เครื่องมือเสริมสำหรับฟรีแลนซ์",
      },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "So1o Doc Lab" },
      { property: "og:image", content: logoUrl },
    ],
    links: [{ rel: "canonical", href: "https://solofreelancer.com/labs/doc" }],
  }),
  component: DocLabsPage,
});

function DocLabsPage() {
  return (
    <React.Suspense
      fallback={<div className="h-64 animate-pulse rounded-xl bg-muted/40" aria-hidden />}
    >
      <DocLabTabLazy />
    </React.Suspense>
  );
}
