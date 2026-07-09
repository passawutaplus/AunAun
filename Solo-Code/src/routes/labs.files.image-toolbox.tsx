import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import logoUrl from "@/assets/solo-freelancer-logo.webp";

const ImageToolboxToolLazy = React.lazy(() =>
  import("@/components/dashboard/labs/tools/image/ImageToolboxTool").then((m) => ({
    default: m.ImageToolboxTool,
  })),
);

export const Route = createFileRoute("/labs/files/image-toolbox")({
  head: () => ({
    meta: [
      { title: "Image Toolbox | Solo Labs" },
      { name: "description", content: "ย่อ แปลง ลายน้ำ หลายรูปพร้อมกัน" },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:image", content: logoUrl },
    ],
    links: [{ rel: "canonical", href: "https://solofreelancer.com/labs/files/image-toolbox" }],
  }),
  component: ImageToolboxPage,
});

function ImageToolboxPage() {
  return (
    <React.Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-muted/40" />}>
      <ImageToolboxToolLazy />
    </React.Suspense>
  );
}
