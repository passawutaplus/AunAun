import * as React from "react";
import { Compass } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { HomeBriefingHero } from "./home/HomeBriefingHero";
import { HomeTrendsBriefing } from "./home/HomeTrendsBriefing";
import { HomeAnnouncementBanner } from "./home/HomeAnnouncementBanner";
import { HomeInsightsBrief } from "./home/HomeInsightsBrief";
import { HomeSectionNav, HOME_SECTIONS } from "./home/HomeSectionNav";
import { HomeCreativePath } from "./home/HomeCreativePath";
import { InspireSection } from "./inspire/InspireSection";
import { DesignDrillSection } from "./drill/DesignDrillSection";
import { PageFooterActions } from "./PageFooterActions";

const HASH_TARGETS = HOME_SECTIONS.map((s) => s.id);

export function HomeTab() {
  const { profile } = useAuth();
  const name = profile?.brand_name || profile?.display_name || "";

  React.useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!HASH_TARGETS.includes(hash as (typeof HASH_TARGETS)[number])) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="space-y-8 sm:space-y-10 animate-fade-in">
      <HomeBriefingHero name={name} />

      <HomeSectionNav />

      <HomeCreativePath />

      <HomeAnnouncementBanner />

      <HomeTrendsBriefing />

      <section
        id="drill"
        className="scroll-mt-28 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-4"
      >
        <DesignDrillSection />
      </section>

      <section id="inspire" className="space-y-4 scroll-mt-28">
        <div className="flex items-start gap-2.5">
          <span className="rounded-lg bg-primary-soft text-primary p-2 shrink-0">
            <Compass className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight">Inspire</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              แหล่งบ่มเพาะไอเดียสำหรับฟรีแลนซ์ครีเอทีฟ
            </p>
          </div>
        </div>
        <InspireSection previewLimit={6} />
      </section>

      <HomeInsightsBrief />

      <PageFooterActions feature="home" label="Home" />
    </div>
  );
}
