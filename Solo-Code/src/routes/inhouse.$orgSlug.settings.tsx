import { createFileRoute } from "@tanstack/react-router";
import { RouteError } from "@/components/RouteError";
import { RequireAuth } from "@/auth/RequireAuth";
import { Toaster } from "@/components/ui/sonner";
import { InhouseSettingsTab } from "@/components/inhouse/InhouseSettingsTab";
import { useInhouseOrgBySlug } from "@/hooks/inhouse/useInhouseOrg";
import { Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/inhouse/$orgSlug/settings")({
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: () => (
    <RequireAuth>
      <InhouseSettingsRoute />
    </RequireAuth>
  ),
});

function InhouseSettingsRoute() {
  const { orgSlug } = Route.useParams();
  const { data: org, isLoading } = useInhouseOrgBySlug(orgSlug);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground">ไม่พบ org</p>
        <Link to="/inhouse" className="text-sm text-primary underline">
          กลับ
        </Link>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <InhouseSettingsTab org={org} />
    </>
  );
}
