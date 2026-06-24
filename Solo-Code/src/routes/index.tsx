import { createFileRoute } from "@tanstack/react-router";
import { RouteError } from "@/components/RouteError";
import { getEarlyAccessStats } from "@/server/public-stats.functions";
import logoUrl from "@/assets/solo-freelancer-logo.webp";
import { LandingPage } from "@/components/landing/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "So1o Freelancer — หลังบ้านครบวงจรสำหรับฟรีแลนซ์" },
      {
        name: "description",
        content:
          "รับบรีฟ ส่งใบเสนอราคา เก็บเงิน ยื่นภาษี — หลังบ้านครบวงจรสำหรับฟรีแลนซ์ไทย ฟรี ไม่ต้องใช้บัตรเครดิต",
      },
      { property: "og:title", content: "So1o Freelancer — หลังบ้านครบวงจรสำหรับฟรีแลนซ์" },
      {
        property: "og:description",
        content: "บริหารพอร์ต ลูกค้า ใบเสนอราคา การเงิน ภาษี ครบในที่เดียว",
      },
      { property: "og:url", content: "https://solofreelancer.com/" },
      { property: "og:type", content: "website" },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/SB11sYmcAcWg6RHXTfd1y5NFKnt2/social-images/social-1777699020537-WELLCOME_(1).webp",
      },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/SB11sYmcAcWg6RHXTfd1y5NFKnt2/social-images/social-1777699020537-WELLCOME_(1).webp",
      },
    ],
    links: [
      { rel: "canonical", href: "https://solofreelancer.com/" },
      { rel: "preload", as: "image", href: logoUrl, fetchPriority: "high" } as any,
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "So1o Freelancer",
          url: "https://www.solofreelancer.com/",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          inLanguage: "th-TH",
          description:
            "หลังบ้านครบวงจรสำหรับฟรีแลนซ์ไทย — บริหารพอร์ต ลูกค้า ใบเสนอราคา การเงิน และภาษีในที่เดียว",
          offers: { "@type": "Offer", price: "0", priceCurrency: "THB" },
          publisher: { "@type": "Organization", name: "So1o Freelancer" },
        }),
      },
    ],
  }),
  loader: () => getEarlyAccessStats(),
  staleTime: 60_000,
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: LandingRoute,
});

function LandingRoute() {
  const stats = Route.useLoaderData();
  return <LandingPage stats={stats} />;
}
