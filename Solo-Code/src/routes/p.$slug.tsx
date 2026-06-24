import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { RouteError } from "@/components/RouteError";
import { HttpErrorPage } from "@/components/HttpErrorPage";
import { PortfolioPublicView } from "@/components/portfolio/PortfolioPublicView";
import {
  publicPayloadToPage,
} from "@/store/portfolio";
import type { PortfolioPublicPayload } from "@/lib/portfolioSchema";

export const Route = createFileRoute("/p/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: "Portfolio | So1o Freelancer" },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Portfolio — So1o Freelancer" },
      { property: "og:url", content: `https://solofreelancer.com/p/${params.slug}` },
    ],
  }),
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: PublicPortfolioPage,
});

function PublicPortfolioPage() {
  const { slug } = Route.useParams();
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [payload, setPayload] = React.useState<ReturnType<typeof publicPayloadToPage> | null>(
    null,
  );

  React.useEffect(() => {
    (async () => {
      const { data, error } = await (supabase.rpc as (fn: string, args: object) => ReturnType<typeof supabase.rpc>)(
        "get_portfolio_by_slug",
        { _slug: slug },
      );
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPayload(publicPayloadToPage(data as unknown as PortfolioPublicPayload));
      setLoading(false);
    })();
  }, [slug]);

  React.useEffect(() => {
    if (!payload) return;
    const name = payload.hero.displayName || "Freelancer";
    document.title = `${name} — Portfolio | So1o`;
  }, [payload]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !payload) {
    return <HttpErrorPage kind="token" code={404} showRetry={false} />;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-muted/20 via-background to-primary-soft/20 py-8 sm:py-12 px-4">
      <div className="mx-auto max-w-3xl">
        <PortfolioPublicView
          data={{
            slug: payload.slug,
            hero: payload.hero,
            about: payload.about,
            skills: payload.skills,
            experience: payload.experience,
            featuredWork: payload.featuredWork,
            externalLinks: payload.externalLinks,
            resume: payload.resume,
            visibility: payload.visibility,
          }}
        />
      </div>
    </main>
  );
}
