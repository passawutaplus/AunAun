import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import logoUrl from "@/assets/solo-freelancer-logo.webp";

const JsonCsvFormatterToolLazy = React.lazy(() =>
  import("@/components/dashboard/labs/tools/formatter/JsonCsvFormatterTool").then((m) => ({
    default: m.JsonCsvFormatterTool,
  })),
);

export const Route = createFileRoute("/labs/developer/formatter")({
  head: () => ({
    meta: [
      { title: "JSON / CSV Formatter | Solo Labs" },
      { name: "description", content: "จัดรูปแบบ แปลง ตรวจ JSON และ CSV" },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:image", content: logoUrl },
    ],
    links: [{ rel: "canonical", href: "https://solofreelancer.com/labs/developer/formatter" }],
  }),
  component: FormatterPage,
});

function FormatterPage() {
  return (
    <React.Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-muted/40" />}>
      <JsonCsvFormatterToolLazy />
    </React.Suspense>
  );
}
