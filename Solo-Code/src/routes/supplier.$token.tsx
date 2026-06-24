import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { RouteError } from "@/components/RouteError";
import { HttpErrorPage } from "@/components/HttpErrorPage";
import { SupplierPaper, type PaperLink } from "@/components/dashboard/suppliers/SupplierPaper";

export const Route = createFileRoute("/supplier/$token")({
  head: ({ params }) => ({
    meta: [
      { title: "Supplier Card | So1o" },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Supplier Card — So1o" },
      { property: "og:url", content: `https://solofreelancer.com/supplier/${params.token}` },
    ],
  }),
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: PublicSupplierPage,
});

interface PublicSupplier {
  id: string;
  name: string;
  category: string | null;
  contact_name: string | null;
  contact_position: string | null;
  phone: string | null;
  email: string | null;
  line_id: string | null;
  website: string | null;
  address: string | null;
  rate_note: string | null;
  rating: number;
  tags: string[];
  cover_image_url: string | null;
  map_url: string | null;
  share_hidden_fields: string[] | null;
}

function PublicSupplierPage() {
  const { token } = Route.useParams();
  const [data, setData] = React.useState<PublicSupplier | null>(null);
  const [links, setLinks] = React.useState<PaperLink[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const { data: payload, error } = await supabase.rpc("get_shared_supplier_by_token", {
        _token: token,
      });
      if (error || !payload) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const p = payload as unknown as PublicSupplier & { links?: PaperLink[] };
      setData(p);
      setLinks((p.links ?? []) as PaperLink[]);
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !data) {
    return <HttpErrorPage kind="token" code={404} showRetry={false} />;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-muted/20 via-background to-primary-soft/20 py-8 sm:py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <SupplierPaper data={data} links={links} hidden={data.share_hidden_fields ?? []} />
      </div>
    </main>
  );
}
