import { createFileRoute } from "@tanstack/react-router";
import { LabsHub } from "@/components/dashboard/labs/LabsHub";
import logoUrl from "@/assets/solo-freelancer-logo.webp";

export const Route = createFileRoute("/labs/")({
  head: () => ({
    meta: [
      { title: "So1o Labs | So1o Freelancer" },
      {
        name: "description",
        content: "Creative Labs และ Doc Lab — เครื่องมือเสริมสำหรับฟรีแลนซ์",
      },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "So1o Labs" },
      { property: "og:image", content: logoUrl },
    ],
    links: [{ rel: "canonical", href: "https://solofreelancer.com/labs" }],
  }),
  component: LabsHub,
});
